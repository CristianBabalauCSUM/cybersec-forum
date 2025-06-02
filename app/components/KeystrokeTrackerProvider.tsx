'use client';

import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

// Configuration constants
const MAX_MS = 1500;     // Hard cap: discard delays > 1500ms
const GAP_MS = 1000;     // Burst split: drop delays ≥ 1000ms
const CONTEXT_K = 5;     // Max n-gram context length

// Types
interface KeystrokeData {
  ngram_times: Record<string, number[]>;
  dwell_times: Record<string, number[]>;
  flight_times: Record<string, number[]>;
}

interface KeystrokeContextType {
  attachToInput: (element: HTMLInputElement | HTMLTextAreaElement) => () => void;
  getKeystrokeData: () => KeystrokeData;
  clearData: () => void;
  sendData: (endpoint?: string) => Promise<void>;
}

// Create context
const KeystrokeContext = createContext<KeystrokeContextType | null>(null);

// Custom hook to use the context
export const useKeystrokeAnalysis = () => {
  const context = useContext(KeystrokeContext);
  if (!context) {
    throw new Error('useKeystrokeAnalysis must be used within a KeystrokeProvider');
  }
  return context;
};

// Provider component
export const KeystrokeProvider: React.FC<{ children: ReactNode; apiEndpoint?: string }> = ({ 
  children, 
  apiEndpoint = '/api/keystroke-analysis' 
}) => {
  // Data stores
  const ngramTimes = useRef<Record<string, number[]>>({});
  const dwellTimes = useRef<Record<string, number[]>>({});
  const flightTimes = useRef<Record<string, number[]>>({});
  
  // Tracking state
  const prevCharsBuf = useRef<string[]>([]);
  const prevStamp = useRef<number | null>(null);
  const dwellStartTimes = useRef<Record<string, number>>({});
  const lastKeyUpStamp = useRef<number | null>(null);
  const lastKeyUpKey = useRef<string | null>(null);
  
  // Active elements set to prevent duplicate listeners
  const activeElements = useRef<Set<HTMLElement>>(new Set());

  // Normalize key names - wrap ALL keys in angle brackets
  const normalizeKey = (key: string): string => {
    // First normalize special keys to readable names
    const keyMap: Record<string, string> = {
      'Enter': 'enter',
      'Backspace': 'backspace',
      ' ': 'space',
      'Tab': 'tab',
      'Escape': 'escape',
      'ArrowLeft': 'arrowleft',
      'ArrowRight': 'arrowright',
      'ArrowUp': 'arrowup',
      'ArrowDown': 'arrowdown',
      'Home': 'home',
      'End': 'end',
      'PageUp': 'pageup',
      'PageDown': 'pagedown',
      'Delete': 'delete',
      'Insert': 'insert',
      'Shift': 'shift',
      'Control': 'ctrl',
      'Alt': 'alt',
      'Meta': 'meta'
    };
    
    const normalizedKey = keyMap[key] || key.toLowerCase();
    return `<${normalizedKey}>`;
  };

  // KeyDown event handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = normalizeKey(e.key);
    const now = performance.now();

    // Record flight time
    if (lastKeyUpStamp.current !== null && lastKeyUpKey.current !== null) {
      const flight = now - lastKeyUpStamp.current;
      const flightKey = `[${lastKeyUpKey.current}]->[${key}]`;
      if (!flightTimes.current[flightKey]) {
        flightTimes.current[flightKey] = [];
      }
      flightTimes.current[flightKey].push(Math.round(flight));
    }

    // Record n-gram timings
    if (prevCharsBuf.current.length > 0 && prevStamp.current !== null) {
      const gap = now - prevStamp.current;
      const sameBurst = gap < GAP_MS;
      const withinCap = gap <= MAX_MS;

      if (sameBurst && withinCap) {
        for (let j = 1; j <= CONTEXT_K; j++) {
          if (prevCharsBuf.current.length >= j) {
            const ctxArr = prevCharsBuf.current.slice(-j);
            const ctxStr = ctxArr.join(''); // Keys already have <> brackets
            const ngramKey = `[${ctxStr}]->[${key}]`;
            
            if (!ngramTimes.current[ngramKey]) {
              ngramTimes.current[ngramKey] = [];
            }
            ngramTimes.current[ngramKey].push(Math.round(gap));
          }
        }
      }
    }

    // Start dwell timer
    dwellStartTimes.current[key] = now;

    // Update buffer and timestamp
    prevCharsBuf.current.push(key);
    if (prevCharsBuf.current.length > CONTEXT_K) {
      prevCharsBuf.current.shift();
    }
    prevStamp.current = now;
  }, []);

  // KeyUp event handler
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = normalizeKey(e.key);
    const nowUp = performance.now();

    // Record dwell time (remove <> for dwell_times keys)
    if (dwellStartTimes.current[key] != null) {
      const dwell = nowUp - dwellStartTimes.current[key];
      const dwellKey = key.slice(1, -1); // Remove < and > for dwell_times
      if (!dwellTimes.current[dwellKey]) {
        dwellTimes.current[dwellKey] = [];
      }
      dwellTimes.current[dwellKey].push(Math.round(dwell));
      delete dwellStartTimes.current[key];
    }

    // Prepare for next flight calculation
    lastKeyUpStamp.current = nowUp;
    lastKeyUpKey.current = key;
  }, []);

  // Attach listeners to an input element
  const attachToInput = useCallback((element: HTMLInputElement | HTMLTextAreaElement) => {
    // Prevent duplicate listeners
    if (activeElements.current.has(element)) {
      return () => {}; // Return empty cleanup function
    }

    activeElements.current.add(element);
    
    element.addEventListener('keydown', handleKeyDown as EventListener);
    element.addEventListener('keyup', handleKeyUp as EventListener);

    // Return cleanup function
    return () => {
      activeElements.current.delete(element);
      element.removeEventListener('keydown', handleKeyDown as EventListener);
      element.removeEventListener('keyup', handleKeyUp as EventListener);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Get current keystroke data
  const getKeystrokeData = useCallback((): KeystrokeData => {
    return {
      ngram_times: { ...ngramTimes.current },
      dwell_times: { ...dwellTimes.current },
      flight_times: { ...flightTimes.current }
    };
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
    ngramTimes.current = {};
    dwellTimes.current = {};
    flightTimes.current = {};
    dwellStartTimes.current = {};
    prevCharsBuf.current = [];
    prevStamp.current = null;
    lastKeyUpStamp.current = null;
    lastKeyUpKey.current = null;
  }, []);

  // Send data to API endpoint
  const sendData = useCallback(async (endpoint?: string) => {
    const data = getKeystrokeData();
    const url = endpoint || apiEndpoint;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Optionally clear data after successful send
      // clearData();
    } catch (error) {
      console.error('Failed to send keystroke data:', error);
      throw error;
    }
  }, [getKeystrokeData, apiEndpoint]);

  const contextValue: KeystrokeContextType = {
    attachToInput,
    getKeystrokeData,
    clearData,
    sendData
  };

  return (
    <KeystrokeContext.Provider value={contextValue}>
      {children}
    </KeystrokeContext.Provider>
  );
};