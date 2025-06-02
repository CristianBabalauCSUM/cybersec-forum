'use client';

import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';

// — tunables (in milliseconds) —
const MAX_MS = 1500;
const GAP_MS = 1000;
const CONTEXT_K = 5;
const NGRAM_TOTAL_LIMIT = 50; // keep only the last 50 n-gram entries overall

// Configuration
const CONFIG = {
  enableDebug: true,
  autoAnalyzeInterval: 3000, // Analyze every 3 seconds
  minKeystrokesForAnalysis: 10,
  serverScoreUpdateInterval: 5000, // Update server score every 5 seconds
  minKeystrokesForServer: 15,
};

// Types
interface KeystrokeData {
  dwell_times: Record<string, number[]>;
  flight_times: Record<string, number[]>;
  ngram_times: Record<string, number[]>;
}

interface KeystrokeMetrics {
  avgDwellTime: number;
  dwellVariability: number;
  avgFlightTime: number;
  flightVariability: number;
  typingRhythm: number;
  totalKeystrokes: number;
  uniqueKeys: number;
  typingSpeed: number; // WPM estimate
}

interface KeystrokeContextType {
  attachToInput: (element: HTMLInputElement | HTMLTextAreaElement) => () => void;
  getKeystrokeData: () => KeystrokeData;
  getMetrics: () => KeystrokeMetrics;
  clearData: () => void;
  sendData: (endpoint?: string) => Promise<number>;
  serverProbability: number;
  localAnalysis: {
    botScore: number;
    isAnalyzing: boolean;
    lastAnalysis: number;
  };
  debugInfo: {
    totalKeys: number;
    dwellCount: number;
    flightCount: number;
    ngramCount: number;
  };
}

interface KeystrokeProviderProps {
  children: React.ReactNode;
  apiEndpoint?: string;
  initialServerProbability?: number;
}

// Create context
const KeystrokeContext = createContext<KeystrokeContextType | undefined>(undefined);

// Utility functions
const norm = (keyName: string): string => {
  return keyName;
};

const wrap = (sym: string): string => {
  return `<${sym}>`;
};

// Local analysis functions
const calculateVariability = (values: number[]): number => {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return mean > 0 ? stdDev / mean : 0; // Coefficient of variation
};

const calculateTypingRhythm = (flightTimes: Record<string, number[]>): number => {
  const allFlights = Object.values(flightTimes).flat();
  if (allFlights.length < 5) return 0;
  
  // Calculate intervals between keystrokes
  const variability = calculateVariability(allFlights);
  
  // Very consistent timing (low variability) is suspicious for bots
  // Human typing typically has CV > 0.3, bots often < 0.2
  return variability < 0.2 ? 1 - variability : 0;
};

const estimateWPM = (totalKeys: number, startTime: number, currentTime: number): number => {
  const timeMinutes = (currentTime - startTime) / 60000;
  if (timeMinutes <= 0) return 0;
  
  // Rough estimate: average word length is 5 characters
  const estimatedWords = totalKeys / 5;
  return Math.round(estimatedWords / timeMinutes);
};

export const KeystrokeProvider: React.FC<KeystrokeProviderProps> = ({
  children,
  apiEndpoint = '/api/keystroke-data',
  initialServerProbability = 0
}) => {
  // Data stores
  const dwellTimes = useRef<Record<string, number[]>>({});
  const flightTimes = useRef<Record<string, number[]>>({});
  const ngramTimes = useRef<Record<string, number[]>>({});

  // Queue to track insertion order of n-grams (for global cap)
  const ngramQueue = useRef<string[]>([]);

  // Tracking variables
  const dwellStarts = useRef<Record<string, number>>({});
  const lastKeyupStamp = useRef<number | null>(null);
  const lastKeyupKey = useRef<string | null>(null);
  const prevChars = useRef<string[]>([]);
  const prevStamp = useRef<number | null>(null);
  const startTime = useRef<number>(Date.now());
  const totalKeysPressed = useRef<number>(0);

  // State for UI and analysis
  const [serverProbability, setServerProbability] = useState<number>(initialServerProbability);
  const [localBotScore, setLocalBotScore] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastAnalysis, setLastAnalysis] = useState<number>(0);
  const [debugInfo, setDebugInfo] = useState({
    totalKeys: 0,
    dwellCount: 0,
    flightCount: 0,
    ngramCount: 0
  });

  // Auto-analysis timer
  const analysisTimer = useRef<NodeJS.Timeout | null>(null);
  const serverTimer = useRef<NodeJS.Timeout | null>(null);

  const addToArray = (obj: Record<string, number[]>, key: string, value: number) => {
    if (!obj[key]) {
      obj[key] = [];
    }
    obj[key].push(value);
  };

  const updateDebugInfo = useCallback(() => {
    const dwellCount = Object.values(dwellTimes.current).reduce((sum, arr) => sum + arr.length, 0);
    const flightCount = Object.values(flightTimes.current).reduce((sum, arr) => sum + arr.length, 0);
    const ngramCount = Object.values(ngramTimes.current).reduce((sum, arr) => sum + arr.length, 0);
    
    setDebugInfo({
      totalKeys: totalKeysPressed.current,
      dwellCount,
      flightCount,
      ngramCount
    });
  }, []);

  const performLocalAnalysis = useCallback(() => {
    if (totalKeysPressed.current < CONFIG.minKeystrokesForAnalysis) return;

    setIsAnalyzing(true);
    
    try {
      const metrics = getMetrics();
      let suspicionScore = 0;
      
      // Analyze dwell time variability (bots often have very consistent dwell times)
      if (metrics.dwellVariability < 0.15) {
        suspicionScore += 0.3;
      }
      
      // Analyze flight time variability (bots often have very consistent flight times)
      if (metrics.flightVariability < 0.2) {
        suspicionScore += 0.3;
      }
      
      // Analyze typing rhythm
      suspicionScore += metrics.typingRhythm * 0.3;
      
      // Analyze typing speed (unusually fast or slow can be suspicious)
      if (metrics.typingSpeed > 120 || (metrics.typingSpeed > 0 && metrics.typingSpeed < 10)) {
        suspicionScore += 0.1;
      }
      
      // Check for perfect timing patterns (very bot-like)
      const allDwells = Object.values(dwellTimes.current).flat();
      const allFlights = Object.values(flightTimes.current).flat();
      
      // Check for repeated exact timings
      const dwellCounts = new Map();
      allDwells.forEach(dwell => {
        const rounded = Math.round(dwell / 10) * 10; // Round to nearest 10ms
        dwellCounts.set(rounded, (dwellCounts.get(rounded) || 0) + 1);
      });
      
      const maxDwellRepeats = dwellCounts.size > 0 ? Math.max(...dwellCounts.values()) : 0;
      if (maxDwellRepeats >= allDwells.length * 0.3) {
        suspicionScore += 0.2;
      }
      
      const botScore = Math.min(100, Math.round(suspicionScore * 100));
      setLocalBotScore(botScore);
      setLastAnalysis(Date.now());
      
      /*if (CONFIG.enableDebug) {
        console.log('[KeystrokeAnalysis] Local analysis complete:', {
          botScore,
          metrics,
          suspicionScore,
          maxDwellRepeats,
          totalSamples: allDwells.length + allFlights.length
        });
      }
        */
    } catch (error) {
      console.error('[KeystrokeAnalysis] Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const getMetrics = useCallback((): KeystrokeMetrics => {
    const allDwells = Object.values(dwellTimes.current).flat();
    const allFlights = Object.values(flightTimes.current).flat();
    
    const avgDwellTime = allDwells.length > 0 ? 
      allDwells.reduce((sum, val) => sum + val, 0) / allDwells.length : 0;
    
    const avgFlightTime = allFlights.length > 0 ? 
      allFlights.reduce((sum, val) => sum + val, 0) / allFlights.length : 0;
    
    const dwellVariability = calculateVariability(allDwells);
    const flightVariability = calculateVariability(allFlights);
    const typingRhythm = calculateTypingRhythm(flightTimes.current);
    
    const uniqueKeys = new Set([
      ...Object.keys(dwellTimes.current),
      ...Object.keys(flightTimes.current).map(key => key.split('->')[0].replace(/[\[\]<>]/g, ''))
    ]).size;
    
    const typingSpeed = estimateWPM(totalKeysPressed.current, startTime.current, Date.now());
    
    return {
      avgDwellTime: Math.round(avgDwellTime * 100) / 100,
      dwellVariability: Math.round(dwellVariability * 1000) / 1000,
      avgFlightTime: Math.round(avgFlightTime * 100) / 100,
      flightVariability: Math.round(flightVariability * 1000) / 1000,
      typingRhythm: Math.round(typingRhythm * 1000) / 1000,
      totalKeystrokes: totalKeysPressed.current,
      uniqueKeys,
      typingSpeed
    };
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    const key = norm(event.key);
    const now = performance.now();
    const wrapped = wrap(key);

    totalKeysPressed.current++;

    // Flight time calculation
    if (lastKeyupStamp.current !== null && lastKeyupKey.current !== null) {
      const prevWrapped = wrap(lastKeyupKey.current);
      const flightKey = `[${prevWrapped}]->[${wrapped}]`;
      const flightTime = Math.round(now - lastKeyupStamp.current);
      addToArray(flightTimes.current, flightKey, flightTime);
    }

    // N-gram timing (using up to CONTEXT_K previous chars)
    if (prevStamp.current !== null && prevChars.current.length > 0) {
      const gap = now - prevStamp.current;
      if (gap < GAP_MS && gap <= MAX_MS) {
        for (let j = 1; j <= prevChars.current.length; j++) {
          const ctx = prevChars.current.slice(-j);
          const ctxWrapped = ctx.map(c => wrap(c)).join('');
          const ngramKey = `[${ctxWrapped}]->[${wrapped}]`;
          addToArray(ngramTimes.current, ngramKey, Math.round(gap));

          // Record this insertion in the queue
          ngramQueue.current.push(ngramKey);

          // If we've exceeded the total cap, remove the oldest entry
          if (ngramQueue.current.length > NGRAM_TOTAL_LIMIT) {
            const oldestKey = ngramQueue.current.shift()!;
            const arr = ngramTimes.current[oldestKey];
            if (arr) {
              arr.shift();
              if (arr.length === 0) {
                delete ngramTimes.current[oldestKey];
              }
            }
          }
        }
      }
    }

    // Dwell start tracking
    dwellStarts.current[key] = now;

    // Update context
    prevChars.current.push(key);
    if (prevChars.current.length > CONTEXT_K) {
      prevChars.current.shift();
    }
    prevStamp.current = now;

    // Update debug info
    updateDebugInfo();
  }, [updateDebugInfo]);

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    const key = norm(event.key);
    const now = performance.now();

    // Calculate dwell time
    if (dwellStarts.current[key] !== undefined) {
      const dwell = Math.round(now - dwellStarts.current[key]);
      addToArray(dwellTimes.current, wrap(key), dwell);
      delete dwellStarts.current[key];
    }

    // Update last keyup tracking
    lastKeyupStamp.current = now;
    lastKeyupKey.current = key;

    // Update debug info
    updateDebugInfo();
  }, [updateDebugInfo]);

  // Auto-analysis setup
  useEffect(() => {
    if (CONFIG.enableDebug) {
      analysisTimer.current = setInterval(() => {
        if (totalKeysPressed.current >= CONFIG.minKeystrokesForAnalysis) {
          performLocalAnalysis();
        }
      }, CONFIG.autoAnalyzeInterval);

      serverTimer.current = setInterval(async () => {
        if (totalKeysPressed.current >= CONFIG.minKeystrokesForServer) {
          try {
            const score = await sendData();
            setServerProbability(score);
          } catch (error) {
            console.warn('[KeystrokeProvider] Server analysis failed:', error);
          }
        }
      }, CONFIG.serverScoreUpdateInterval);
    }

    return () => {
      if (analysisTimer.current) clearInterval(analysisTimer.current);
      if (serverTimer.current) clearInterval(serverTimer.current);
    };
  }, []);

  const attachToInput = useCallback((element: HTMLInputElement | HTMLTextAreaElement) => {
    // Add event listeners
    element.addEventListener('keydown', onKeyDown as EventListener);
    element.addEventListener('keyup', onKeyUp as EventListener);

    if (CONFIG.enableDebug) {
      console.log('[KeystrokeProvider] Attached to input element');
    }

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', onKeyDown as EventListener);
      element.removeEventListener('keyup', onKeyUp as EventListener);
      
      if (CONFIG.enableDebug) {
        console.log('[KeystrokeProvider] Detached from input element');
      }
    };
  }, [onKeyDown, onKeyUp]);

  const getKeystrokeData = useCallback((): KeystrokeData => {
    return {
      dwell_times: { ...dwellTimes.current },
      flight_times: { ...flightTimes.current },
      ngram_times: { ...ngramTimes.current },
    };
  }, []);

  const clearData = useCallback(() => {
    dwellTimes.current = {};
    flightTimes.current = {};
    ngramTimes.current = {};
    ngramQueue.current = [];
    dwellStarts.current = {};
    lastKeyupStamp.current = null;
    lastKeyupKey.current = null;
    prevChars.current = [];
    prevStamp.current = null;
    totalKeysPressed.current = 0;
    startTime.current = Date.now();
    
    setLocalBotScore(0);
    setServerProbability(0);
    setLastAnalysis(0);
    setDebugInfo({
      totalKeys: 0,
      dwellCount: 0,
      flightCount: 0,
      ngramCount: 0
    });

    if (CONFIG.enableDebug) {
      //console.log('[KeystrokeProvider] Data cleared');
    }
  }, []);

  const sendData = useCallback(async (endpoint?: string): Promise<number> => {
    const data = getKeystrokeData();
    const url = endpoint ?? apiEndpoint;

    try {
      console.log("ngram_times", data.ngram_times);
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "ngram_times": data.ngram_times }),
      });



      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      let probability = result.score;

      if (typeof probability !== 'number') {
        console.warn('Server returned non-number probability:', probability);
        probability = parseFloat(probability) || 0;
      }

      if (CONFIG.enableDebug) {
        //console.log('[KeystrokeProvider] Server analysis result:', probability);
      }

      return probability;
    } catch (error) {
      console.error('Failed to send keystroke data:', error);
      throw error;
    }
  }, [getKeystrokeData, apiEndpoint]);

  const contextValue: KeystrokeContextType = {
    attachToInput,
    getKeystrokeData,
    getMetrics,
    clearData,
    sendData,
    serverProbability,
    localAnalysis: {
      botScore: localBotScore,
      isAnalyzing,
      lastAnalysis
    },
    debugInfo
  };

  return (
    <KeystrokeContext.Provider value={contextValue}>
      {children}
    </KeystrokeContext.Provider>
  );
};

// Hook to use the keystroke context
export const useKeystroke = (): KeystrokeContextType => {
  const context = useContext(KeystrokeContext);
  if (context === undefined) {
    throw new Error('useKeystroke must be used within a KeystrokeProvider');
  }
  return context;
};

// Hook for easy input attachment
export const useKeystrokeInput = () => {
  const { attachToInput } = useKeystroke();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const setInputRef = useCallback((element: HTMLInputElement | HTMLTextAreaElement | null) => {
    // Clean up previous attachment (if any)
    if (inputRef.current && (inputRef.current as any).__keystrokeCleanup) {
      (inputRef.current as any).__keystrokeCleanup();
    }

    inputRef.current = element;

    if (element) {
      const cleanup = attachToInput(element);
      (element as any).__keystrokeCleanup = cleanup;
    }
  }, [attachToInput]);

  useEffect(() => {
    return () => {
      if (inputRef.current && (inputRef.current as any).__keystrokeCleanup) {
        (inputRef.current as any).__keystrokeCleanup();
      }
    };
  }, []);

  return { inputRef: setInputRef };
};

// Debug component similar to mouse tracker
export const KeystrokeDebug: React.FC = () => {
  const keystroke = useKeystroke();
  const [metrics, setMetrics] = useState<KeystrokeMetrics | null>(null);

  useEffect(() => {
    const updateMetrics = () => {
      if (keystroke.debugInfo.totalKeys > 0) {
        setMetrics(keystroke.getMetrics());
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [keystroke]);

  if (!CONFIG.enableDebug) return null;

  const isActive = keystroke.debugInfo.totalKeys > 0;
  const hasServerScore = keystroke.serverProbability > 0;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '11px',
      zIndex: 9999,
      pointerEvents: 'none',
      fontFamily: 'monospace',
      minWidth: '220px',
      maxWidth: '280px'
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '8px', 
        color: !isActive ? '#888888' : 
              keystroke.localAnalysis.botScore > 70 ? '#ff4444' : 
              keystroke.localAnalysis.botScore > 40 ? '#ffaa00' : '#44ff44',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Keystroke Analysis</span>
        {keystroke.localAnalysis.isAnalyzing && (
          <span style={{ color: '#ffaa00', fontSize: '10px' }}>⚡</span>
        )}
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <div>Local Bot Score: <span style={{ 
          color: keystroke.localAnalysis.botScore > 70 ? '#ff4444' : 
                keystroke.localAnalysis.botScore > 40 ? '#ffaa00' : '#44ff44' 
        }}>{keystroke.localAnalysis.botScore}%</span></div>
        
        {hasServerScore && (
          <div>Server Score: <span style={{ 
            color: keystroke.serverProbability > 70 ? '#ff4444' : 
                  keystroke.serverProbability > 40 ? '#ffaa00' : '#44ff44' 
          }}>{Math.round(keystroke.serverProbability * 100)}%</span></div>
        )}
      </div>

      <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '6px' }}>
        <div>Total Keys: {keystroke.debugInfo.totalKeys}</div>
        <div>Dwell Samples: {keystroke.debugInfo.dwellCount}</div>
        <div>Flight Samples: {keystroke.debugInfo.flightCount}</div>
        <div>N-gram Samples: {keystroke.debugInfo.ngramCount}</div>
      </div>

      {metrics && (
        <div style={{ fontSize: '10px', borderTop: '1px solid #444', paddingTop: '6px' }}>
          <div>Avg Dwell: {metrics.avgDwellTime.toFixed(1)}ms</div>
          <div>Dwell Var: <span style={{ 
            color: metrics.dwellVariability < 0.15 ? '#ff4444' : '#44ff44' 
          }}>{(metrics.dwellVariability * 100).toFixed(1)}%</span></div>
          <div>Avg Flight: {metrics.avgFlightTime.toFixed(1)}ms</div>
          <div>Flight Var: <span style={{ 
            color: metrics.flightVariability < 0.2 ? '#ff4444' : '#44ff44' 
          }}>{(metrics.flightVariability * 100).toFixed(1)}%</span></div>
          <div>Typing Speed: {metrics.typingSpeed} WPM</div>
          <div>Rhythm Score: <span style={{ 
            color: metrics.typingRhythm > 0.5 ? '#ff4444' : '#44ff44' 
          }}>{(metrics.typingRhythm * 100).toFixed(1)}%</span></div>
        </div>
      )}

      {keystroke.localAnalysis.lastAnalysis > 0 && (
        <div style={{ 
          fontSize: '9px', 
          opacity: 0.6, 
          marginTop: '6px',
          borderTop: '1px solid #444',
          paddingTop: '4px'
        }}>
          Last analysis: {new Date(keystroke.localAnalysis.lastAnalysis).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default KeystrokeProvider;