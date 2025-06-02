// app/(laboratory-environment)/key-typing/page.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useKeystroke } from '@/app/components/KeystrokeTrackerProvider';

export default function KeyTypingPage() {
  const [input, setInput] = useState('');
  const [botProbability, setBotProbability] = useState(0);
  const [keystrokes, setKeystrokes] = useState<Array<{ key: string; timestamp: number }>>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [keysPressedCount, setKeysPressedCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get keystroke analysis functions and server data from the provider
  const { 
    attachToInput, 
    getKeystrokeData, 
    getMetrics,
    clearData, 
    serverProbability,
    localAnalysis,
    debugInfo 
  } = useKeystroke();

  // Attach keystroke analysis to textarea
  useEffect(() => {
    if (textareaRef.current) {
      const cleanup = attachToInput(textareaRef.current);
      return cleanup;
    }
  }, [attachToInput]);

  // Analyze keystroke data periodically using local analysis
  useEffect(() => {
    const interval = setInterval(() => {
      const data = getKeystrokeData();
      
      // Only analyze if we have sufficient data
      if (Object.keys(data.ngram_times).length > 5 || Object.keys(data.dwell_times).length > 10) {
        const analysis = analyzeKeystrokePatterns(data);
        setAnalysisResults(analysis);
        setBotProbability(analysis.botScore);
        
      }
    }, 15000); // Analyze every second

    return () => clearInterval(interval);
  }, [getKeystrokeData, localAnalysis, serverProbability, debugInfo]);

  // Bot detection analysis function (same as before but updated for display)
  const analyzeKeystrokePatterns = (data: any) => {
    const analysis = {
      botScore: 0,
      confidence: 0,
      flags: [] as string[],
      metrics: {
        avgDwellTime: 0,
        dwellVariance: 0,
        avgFlightTime: 0,
        flightVariance: 0,
        ngramCount: 0,
        totalKeystrokes: 0,
        uniqueDwellTimes: 0,
        dwellTimeRange: 0,
        flightTimeRange: 0
      }
    };

    // Calculate dwell time metrics
    const allDwellTimes = Object.values(data.dwell_times).flat() as number[];
    if (allDwellTimes.length > 0) {
      analysis.metrics.totalKeystrokes = allDwellTimes.length;
      analysis.metrics.avgDwellTime = allDwellTimes.reduce((a, b) => a + b, 0) / allDwellTimes.length;
      analysis.metrics.uniqueDwellTimes = new Set(allDwellTimes).size;
      analysis.metrics.dwellTimeRange = Math.max(...allDwellTimes) - Math.min(...allDwellTimes);
      
      // Calculate variance
      const dwellVariance = allDwellTimes.reduce((acc, time) => 
        acc + Math.pow(time - analysis.metrics.avgDwellTime, 2), 0
      ) / allDwellTimes.length;
      analysis.metrics.dwellVariance = Math.sqrt(dwellVariance);
    }

    // Calculate flight time metrics
    const allFlightTimes = Object.values(data.flight_times).flat() as number[];
    if (allFlightTimes.length > 0) {
      analysis.metrics.avgFlightTime = allFlightTimes.reduce((a, b) => a + b, 0) / allFlightTimes.length;
      analysis.metrics.flightTimeRange = Math.max(...allFlightTimes) - Math.min(...allFlightTimes);
      
      const flightVariance = allFlightTimes.reduce((acc, time) => 
        acc + Math.pow(time - analysis.metrics.avgFlightTime, 2), 0
      ) / allFlightTimes.length;
      analysis.metrics.flightVariance = Math.sqrt(flightVariance);
    }

    // N-gram analysis
    analysis.metrics.ngramCount = Object.keys(data.ngram_times).length;

    // Bot detection heuristics
    let botScore = 0;

    // 1. Extremely consistent dwell times (bots often have very low variance)
    if (analysis.metrics.dwellVariance < 15 && allDwellTimes.length > 10) {
      botScore += 25;
      analysis.flags.push('Extremely consistent dwell times');
    }

    // 2. Unrealistic typing speed
    if (analysis.metrics.avgFlightTime < 80 && allFlightTimes.length > 5) {
      botScore += 20;
      analysis.flags.push('Unrealistically fast typing');
    }

    // 3. Too consistent flight times
    if (analysis.metrics.flightVariance < 20 && allFlightTimes.length > 5) {
      botScore += 20;
      analysis.flags.push('Highly consistent flight times');
    }

    // 4. Limited variation in dwell times
    const dwellVariationRatio = analysis.metrics.uniqueDwellTimes / analysis.metrics.totalKeystrokes;
    if (dwellVariationRatio < 0.3 && analysis.metrics.totalKeystrokes > 15) {
      botScore += 15;
      analysis.flags.push('Limited dwell time variation');
    }

    // 5. Narrow timing ranges (too precise)
    if (analysis.metrics.dwellTimeRange < 50 && analysis.metrics.totalKeystrokes > 10) {
      botScore += 10;
      analysis.flags.push('Narrow dwell time range');
    }

    // 6. Perfect rhythm (suspicious consistency in n-grams)
    const ngramVariances = Object.values(data.ngram_times).map((times: any) => {
      if (times.length < 2) return 0;
      const avg = times.reduce((a: number, b: number) => a + b, 0) / times.length;
      return Math.sqrt(times.reduce((acc: number, time: number) => acc + Math.pow(time - avg, 2), 0) / times.length);
    });
    
    const avgNgramVariance = ngramVariances.length > 0 
      ? ngramVariances.reduce((a, b) => a + b, 0) / ngramVariances.length 
      : 0;

    if (avgNgramVariance < 25 && analysis.metrics.ngramCount > 3) {
      botScore += 15;
      analysis.flags.push('Highly consistent n-gram timing');
    }

    // 7. Bonus points for human-like characteristics
    if (analysis.metrics.dwellVariance > 30 && analysis.metrics.flightVariance > 40) {
      botScore = Math.max(0, botScore - 10);
      analysis.flags.push('Good variation in timing (human-like)');
    }

    analysis.botScore = Math.min(botScore, 100);
    analysis.confidence = Math.min((allDwellTimes.length + allFlightTimes.length) * 2, 100);

    return analysis;
  };

  // Reset everything including keystroke data
  const handleReset = () => {
    setInput('');
    setBotProbability(0);
    setKeystrokes([]);
    setAnalysisResults(null);
    setKeysPressedCount(0);
    clearData(); // Clear the advanced keystroke data
    
    // Focus the textarea after reset
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    
    console.log('Analysis data cleared');
  };

  // Track keystrokes with timestamps (keep original functionality)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Skip modifier keys
    if (['Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      return;
    }
    
    setKeystrokes(prev => [
      ...prev,
      { key: e.key, timestamp: Date.now() }
    ]);
    
    // Increment keys pressed count for display
    setKeysPressedCount(prev => prev + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Fallback analysis for display (if advanced analysis isn't ready yet)
  useEffect(() => {
    if (keystrokes.length > 10 && !analysisResults) {
      const randomFactor = Math.random() * 10;
      setBotProbability(Math.min(100, Math.floor(randomFactor + keystrokes.length / 5)));
    }
  }, [keystrokes, analysisResults]);

  const getBarColor = (score: number) => {
    if (score < 30) return 'bg-green-500';
    if (score < 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Manual analysis trigger
  const handleAnalyze = () => {
    const data = getKeystrokeData();
    const analysis = analyzeKeystrokePatterns(data);
    setAnalysisResults(analysis);
    setBotProbability(analysis.botScore);
    
    console.log('=== MANUAL ANALYSIS TRIGGERED ===');
    console.log('Current Data:', data);
    console.log('Analysis:', analysis);
    console.log('Provider Metrics:', getMetrics());
    console.log('Provider Local Score:', localAnalysis.botScore);
    console.log('Provider Server Score:', Math.round(serverProbability * 100));
    console.log('==================================');
  };

  // Get the highest score for display (prioritize provider scores)
  const getDisplayScore = () => {
    const providerLocal = localAnalysis.botScore;
    const providerServer = Math.round(serverProbability * 100);
    const pageLocal = botProbability;
    
    // Use provider server score if available, otherwise provider local, otherwise page local
    //if (providerServer > 0) return providerServer;
    //if (providerLocal > 0) return providerLocal;
    return providerLocal;
  };

  const displayScore = getDisplayScore();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">Advanced Keyboard Typing Analysis</h1>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-8 shadow-sm">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold" id ="bot-detection-score">
              Bot Detection: {botProbability}%
              {localAnalysis.isAnalyzing && (
                <span className="ml-2 text-blue-600 text-sm">⚡ Analyzing...</span>
              )}
            </h2>
            <div className="text-sm space-y-1">

              {serverProbability > 0 && (
                <div className="text-blue-600" id = "provider-server-score">
                  Provider Server: {Math.round(serverProbability * 100)}%
                </div>
              )}
             
            </div>
          </div>
          <div className="h-5 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getBarColor(botProbability)}`} 
              style={{ width: `${botProbability}%` }} 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-gray-600">
          <p>Characters typed: {input.length}</p>
          <p>Keystrokes recorded: {keystrokes.length}</p>
          <p>Provider total keys: {debugInfo.totalKeys}</p>
          <p>Provider dwell samples: {debugInfo.dwellCount}</p>
          <p>Provider flight samples: {debugInfo.flightCount}</p>
          <p>Provider n-gram samples: {debugInfo.ngramCount}</p>
          {analysisResults && (
            <>
              <p>Page dwell times: {analysisResults.metrics.totalKeystrokes}</p>
              <p>Page n-grams: {analysisResults.metrics.ngramCount}</p>
              <p>Avg dwell: {Math.round(analysisResults.metrics.avgDwellTime)}ms</p>
              <p>Avg flight: {Math.round(analysisResults.metrics.avgFlightTime)}ms</p>
            </>
          )}
        </div>
        
        {analysisResults && analysisResults.flags.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-100 rounded-md">
            <h4 className="font-semibold text-yellow-800 mb-2">Page Analysis Flags:</h4>
            <ul className="text-sm text-yellow-700">
              {analysisResults.flags.map((flag: string, index: number) => (
                <li key={index}>• {flag}</li>
              ))}
            </ul>
          </div>
        )}

        {localAnalysis.lastAnalysis > 0 && (
          <div className="mt-4 p-3 bg-blue-100 rounded-md">
            <h4 className="font-semibold text-blue-800 mb-2">Provider Status:</h4>
            <div className="text-sm text-blue-700">
              <p>Last analysis: {new Date(localAnalysis.lastAnalysis).toLocaleTimeString()}</p>
              <p>Analysis active: {localAnalysis.isAnalyzing ? 'Yes' : 'No'}</p>
              <p>Server probability: {serverProbability > 0 ? `${Math.round(serverProbability * 100)}%` : 'Not available'}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mb-8">
        <label htmlFor="typing-input" className="block mb-2 font-medium">
          Type something in the area below:
        </label>
        <textarea 
          id="typing-input"
          ref={textareaRef}
          className="w-full min-h-[150px] p-4 border border-gray-300 rounded-md text-base mb-4 resize-y focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Start typing here to analyze your typing patterns..."
          rows={6}
          autoFocus
        />
        
        <div className="flex gap-3">
          <button 
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-md text-base transition-colors duration-200"
            onClick={handleReset}
          >
            Reset
          </button>
          <button 
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-md text-base transition-colors duration-200"
            onClick={handleAnalyze}
          >
            Analyze Local
          </button>
        </div>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Advanced Analysis Features</h3>
        <p className="mb-3">This laboratory now uses the enhanced keystroke provider with:</p>
        <ul className="list-disc pl-6 mb-4">
          <li className="mb-1"><strong>Provider Integration:</strong> Uses server results from the keystroke provider</li>
          <li className="mb-1"><strong>Automatic Server Calls:</strong> Provider calls server every 13 keystrokes</li>
          <li className="mb-1"><strong>Local Analysis:</strong> Real-time bot detection in the provider</li>
          <li className="mb-1"><strong>Dwell Times:</strong> How long each key is held down</li>
          <li className="mb-1"><strong>Flight Times:</strong> Time between releasing one key and pressing the next</li>
          <li className="mb-1"><strong>N-gram Analysis:</strong> Timing patterns for character sequences</li>
          <li className="mb-1"><strong>Variance Analysis:</strong> Consistency in timing patterns</li>
          <li className="mb-1"><strong>Multi-source Scoring:</strong> Combines provider and page analysis</li>
        </ul>
        <div className="bg-white p-3 rounded border-l-4 border-blue-500">
          <p className="text-sm"><strong>Console Output:</strong> Check your browser's developer console (F12) for detailed analysis results including raw timing data, metrics, detection flags, and provider status.</p>
        </div>
      </div>
    </div>
  );
}