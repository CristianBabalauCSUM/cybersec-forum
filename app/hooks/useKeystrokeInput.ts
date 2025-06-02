import { useEffect, useRef } from 'react';
import { useKeystrokeAnalysis } from '../components/KeystrokeTrackerProvider';

// Hook to automatically attach keystroke analysis to a ref
export const useKeystrokeInput = <T extends HTMLInputElement | HTMLTextAreaElement>() => {
  const inputRef = useRef<T>(null);
  const { attachToInput } = useKeystrokeAnalysis();

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;

    const cleanup = attachToInput(element);
    return cleanup;
  }, [attachToInput]);

  return inputRef;
};

// Hook to attach keystroke analysis to multiple inputs via selector
export const useKeystrokeInputs = (selector: string = 'input, textarea') => {
  const { attachToInput } = useKeystrokeAnalysis();

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector);
    const cleanupFunctions: (() => void)[] = [];

    elements.forEach(element => {
      const cleanup = attachToInput(element);
      cleanupFunctions.push(cleanup);
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [attachToInput, selector]);
};

// Hook for automatic data collection and sending
export const useAutoKeystrokeCollection = (options: {
  sendInterval?: number; // Send data every X milliseconds
  sendOnUnmount?: boolean; // Send data when component unmounts
  clearAfterSend?: boolean; // Clear data after successful send
  endpoint?: string; // Custom endpoint
} = {}) => {
  const { 
    sendInterval = 30000, // Default: 30 seconds
    sendOnUnmount = true,
    clearAfterSend = true,
    endpoint
  } = options;

  const { sendData, clearData, getKeystrokeData } = useKeystrokeAnalysis();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Set up interval for periodic data sending
    if (sendInterval > 0) {
      intervalRef.current = setInterval(async () => {
        try {
          const data = getKeystrokeData();
          // Only send if we have some data
          if (Object.keys(data.ngram_times).length > 0 || 
              Object.keys(data.dwell_times).length > 0 || 
              Object.keys(data.flight_times).length > 0) {
            await sendData(endpoint);
            if (clearAfterSend) {
              clearData();
            }
          }
        } catch (error) {
          console.error('Auto keystroke collection failed:', error);
        }
      }, sendInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Send data on unmount if requested
      if (sendOnUnmount) {
        const data = getKeystrokeData();
        if (Object.keys(data.ngram_times).length > 0 || 
            Object.keys(data.dwell_times).length > 0 || 
            Object.keys(data.flight_times).length > 0) {
          // Use sendBeacon for reliability during page unload
          navigator.sendBeacon(
            endpoint || '/api/keystroke-analysis',
            JSON.stringify(data)
          );
        }
      }
    };
  }, [sendInterval, sendOnUnmount, clearAfterSend, endpoint, sendData, clearData, getKeystrokeData]);
};