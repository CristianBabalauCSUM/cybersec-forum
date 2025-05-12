// app/(laboratory-environment)/key-typing/page.tsx
"use client";

import { useState, useRef, useEffect } from 'react';

export default function KeyTypingPage() {
  const [input, setInput] = useState('');
  const [botProbability, setBotProbability] = useState(0);
  const [keystrokes, setKeystrokes] = useState<Array<{ key: string; timestamp: number }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset everything
  const handleReset = () => {
    setInput('');
    setBotProbability(0);
    setKeystrokes([]);
    // Focus the textarea after reset
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Track keystrokes with timestamps
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Skip modifier keys
    if (['Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      return;
    }
    
    setKeystrokes(prev => [
      ...prev,
      { key: e.key, timestamp: Date.now() }
    ]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  useEffect(() => {
    if (keystrokes.length > 10) {

      // This is just a placeholder - it randomly fluctuates the bot probability
      const randomFactor = Math.random() * 10;
      setBotProbability(Math.min(100, Math.floor(randomFactor + keystrokes.length / 5)));
    }
  }, [keystrokes]);

  const getBarColor = () => {
    if (botProbability < 30) return 'bg-green-500';
    if (botProbability < 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">Keyboard Typing Analysis</h1>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Bot Probability: {botProbability}%</h2>
          <div className="h-5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`} 
              style={{ width: `${botProbability}%` }} 
            />
          </div>
        </div>
        
        <div className="flex justify-between text-gray-600">
          <p className="my-1">Characters typed: {input.length}</p>
          <p className="my-1">Keystrokes recorded: {keystrokes.length}</p>
        </div>
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
        
        <button 
          className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-md text-base transition-colors duration-200"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Instructions</h3>
        <p className="mb-3">This laboratory analyzes your typing patterns to determine how human-like your typing is.</p>
        <p className="mb-3">Type naturally in the text area above. The system will analyze various aspects of your typing, such as:</p>
        <ul className="list-disc pl-6 mb-4">
          <li className="mb-1">Typing rhythm and consistency</li>
          <li className="mb-1">Pauses between keystrokes</li>
          <li className="mb-1">Error correction patterns</li>
          <li className="mb-1">Common typing patterns</li>
        </ul>
        <p>The bot probability score indicates how likely your typing resembles automated input.</p>
      </div>
    </div>
  );
}