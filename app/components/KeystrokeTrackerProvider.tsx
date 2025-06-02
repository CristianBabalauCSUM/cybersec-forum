'use client';

import React, { createContext, useContext, useCallback, useRef, useState } from 'react';

// — tunables (in milliseconds) —
const MAX_MS = 1500;
const GAP_MS = 1000;
const CONTEXT_K = 5;
const NGRAM_LIMIT = 50; // keep only the last 50 timings per n-gram

// Types
interface KeystrokeData {
  dwell_times: Record<string, number[]>;
  flight_times: Record<string, number[]>;
  ngram_times: Record<string, number[]>;
}

interface KeystrokeContextType {
  attachToInput: (element: HTMLInputElement | HTMLTextAreaElement) => () => void;
  getKeystrokeData: () => KeystrokeData;
  clearData: () => void;
  sendData: (endpoint?: string) => Promise<void>;
  serverProbability?: number;
}

interface KeystrokeProviderProps {
  children: React.ReactNode;
  apiEndpoint?: string;
  serverProbability?: number;
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

export const KeystrokeProvider: React.FC<KeystrokeProviderProps> = ({
                                                                      children,
                                                                      apiEndpoint = '/api/keystroke-data',
                                                                      serverProbability
                                                                    }) => {
  // Data stores
  const dwellTimes = useRef<Record<string, number[]>>({});
  const flightTimes = useRef<Record<string, number[]>>({});
  const ngramTimes = useRef<Record<string, number[]>>({});

  // Tracking variables
  const dwellStarts = useRef<Record<string, number>>({});
  const lastKeyupStamp = useRef<number | null>(null);
  const lastKeyupKey = useRef<string | null>(null);
  const prevChars = useRef<string[]>([]);
  const prevStamp = useRef<number | null>(null);

  // Auto-save timer
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const addToArray = (obj: Record<string, number[]>, key: string, value: number) => {
    if (!obj[key]) {
      obj[key] = [];
    }
    obj[key].push(value);
  };

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    const key = norm(event.key);
    const now = performance.now();
    const wrapped = wrap(key);

    // Flight time calculation
    if (lastKeyupStamp.current !== null && lastKeyupKey.current !== null) {
      const prevWrapped = wrap(lastKeyupKey.current);
      const flightKey = `[${prevWrapped}]->[${wrapped}]`;
      const flightTime = Math.round(now - lastKeyupStamp.current);
      addToArray(flightTimes.current, flightKey, flightTime);
    }

    // N-gram timing
    if (prevStamp.current !== null && prevChars.current.length > 0) {
      const gap = now - prevStamp.current;
      if (gap < GAP_MS && gap <= MAX_MS) {
        for (let j = 1; j <= prevChars.current.length; j++) {
          const ctx = prevChars.current.slice(-j);
          const ctxWrapped = ctx.map(c => wrap(c)).join('');
          const ngramKey = `[${ctxWrapped}]->[${wrapped}]`;
          addToArray(ngramTimes.current, ngramKey, Math.round(gap));

          // Limit to last 50 timings
          const arr = ngramTimes.current[ngramKey];
          if (arr.length > NGRAM_LIMIT) {
            arr.shift();
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
  }, []);

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
  }, []);

  const attachToInput = useCallback((element: HTMLInputElement | HTMLTextAreaElement) => {
    // Add event listeners
    element.addEventListener('keydown', onKeyDown as EventListener);
    element.addEventListener('keyup', onKeyUp as EventListener);

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', onKeyDown as EventListener);
      element.removeEventListener('keyup', onKeyUp as EventListener);

      // Clear auto-save timer if no more inputs are being tracked
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
        autoSaveTimer.current = null;
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
    dwellStarts.current = {};
    lastKeyupStamp.current = null;
    lastKeyupKey.current = null;
    prevChars.current = [];
    prevStamp.current = null;
  }, []);

  const sendData = useCallback(async (endpoint?: string): Promise<void> => {
    const data = getKeystrokeData();
    const url = '/api/proxy/';

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

      const result = await response.json();
      let probability = result.score;

      if (typeof probability !== 'number') {
        console.warn('Server returned non-number probability:', probability);
        probability = parseFloat(probability) || 0;
      }

      return probability;
    } catch (error) {
      console.error('Failed to send keystroke data:', error);
      throw error;
    }
  }, [getKeystrokeData]);

  const contextValue: KeystrokeContextType = {
    attachToInput,
    getKeystrokeData,
    clearData,
    sendData,
    serverProbability
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
    // Clean up previous attachment
    if (inputRef.current) {
      // The cleanup function would have been called automatically
    }

    inputRef.current = element;

    if (element) {
      const cleanup = attachToInput(element);

      // Store cleanup function for later use
      (element as any).__keystrokeCleanup = cleanup;
    }
  }, [attachToInput]);

  React.useEffect(() => {
    return () => {
      if (inputRef.current && (inputRef.current as any).__keystrokeCleanup) {
        (inputRef.current as any).__keystrokeCleanup();
      }
    };
  }, []);

  return { inputRef: setInputRef };
};

export default KeystrokeProvider;
