"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

// Types
type Point = {
  x: number;
  y: number;
  timestamp: number;
};

type ClickEvent = {
  x: number;
  y: number;
  timestamp: number;
  button: number;
};

type DetectionMode = 'movement' | 'clicks' | 'combined';

type Metrics = {
  straightness: number;
  velocityConsistency: number;
  clickPattern: number;
};

type MouseTrackerData = {
  botScore: number;
  metrics: Metrics;
  isTracking: boolean;
  detectionMode: DetectionMode;
  dataPoints: {
    movements: number;
    clicks: number;
  };
  // Control functions
  startTracking: () => void;
  stopTracking: () => void;
  clearData: () => void;
  setDetectionMode: (mode: DetectionMode) => void;
};

// Configuration
const CONFIG = {
  minPointsForMovementAnalysis: 15,
  minClicksForAnalysis: 5,
  minPointsForCombined: 10,
  minClicksForCombined: 3,
  scoreUpdateInterval: 2000,
  maxDataPoints: 1000,
  enableDebug: true
};

// Context
const MouseTrackerContext = createContext<MouseTrackerData | null>(null);

// Custom hook
export const useMouseTracker = () => {
  const context = useContext(MouseTrackerContext);
  if (!context) {
    throw new Error('useMouseTracker must be used within a MouseTrackerProvider');
  }
  return context;
};

// Provider component
export const MouseTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [points, setPoints] = useState<Point[]>([]);
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [isTracking, setIsTracking] = useState(true);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('combined');
  const [botScore, setBotScore] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>({
    straightness: 0,
    velocityConsistency: 0,
    clickPattern: 0
  });
  
  const lastScoreUpdate = useRef(0);
  const isClient = useRef(false);

  // Debug logging
  
  const log = useCallback((...args: any[]) => {
    if (CONFIG.enableDebug) {
      //console.log('[MouseTracker]', ...args);//
    }
  }, []);
  
  // Calculate straightness of movement paths
  const calculateStraightness = useCallback((mousePoints: Point[]): number => {
    if (mousePoints.length < 10) return 0;
    
    let straightSegments = 0;
    let totalSegments = 0;
    const segmentSize = 8;
    
    for (let i = 0; i < mousePoints.length - segmentSize; i++) {
      const segment = mousePoints.slice(i, i + segmentSize + 1);
      
      const startPoint = segment[0];
      const endPoint = segment[segment.length - 1];
      
      const expectedLength = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + 
        Math.pow(endPoint.y - startPoint.y, 2)
      );
      
      if (expectedLength < 10) continue;
      
      let actualLength = 0;
      for (let j = 0; j < segment.length - 1; j++) {
        const p1 = segment[j];
        const p2 = segment[j + 1];
        actualLength += Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + 
          Math.pow(p2.y - p1.y, 2)
        );
      }
      
      const straightnessRatio = expectedLength / actualLength;
      if (straightnessRatio > 0.95) {
        straightSegments++;
      }
      totalSegments++;
    }
    
    return totalSegments > 0 ? straightSegments / totalSegments : 0;
  }, []);

  // Calculate velocity consistency
  const calculateVelocityConsistency = useCallback((mousePoints: Point[]): number => {
    if (mousePoints.length < 10) return 0;
    
    const velocities: number[] = [];
    
    for (let i = 1; i < mousePoints.length; i++) {
      const p1 = mousePoints[i - 1];
      const p2 = mousePoints[i];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dt = p2.timestamp - p1.timestamp;
      
      if (dt > 8) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / dt;
        velocities.push(velocity);
      }
    }
    
    if (velocities.length < 5) return 0;
    
    const mean = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    const consistency = Math.max(0, 1 - Math.min(1, coefficientOfVariation / 0.5));
    
    return consistency;
  }, []);

  // Calculate click pattern consistency
  const calculateClickPattern = useCallback((clickEvents: ClickEvent[]): number => {
    if (clickEvents.length < 5) return 0;
    
    const intervals: number[] = [];
    
    for (let i = 1; i < clickEvents.length; i++) {
      const interval = clickEvents[i].timestamp - clickEvents[i-1].timestamp;
      if (interval > 50 && interval < 10000) {
        intervals.push(interval);
      }
    }
    
    if (intervals.length < 3) return 0;
    
    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    
    let regularityScore = 0;
    
    if (coefficientOfVariation < 0.15) {
      regularityScore += 0.6;
    }
    
    const intervalCounts = new Map();
    intervals.forEach(interval => {
      const rounded = Math.round(interval / 50) * 50;
      intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1);
    });
    
    const maxRepeats = Math.max(...intervalCounts.values());
    if (maxRepeats >= intervals.length * 0.4) {
      regularityScore += 0.4;
    }
    
    return Math.min(1, regularityScore);
  }, []);

  // Calculate bot score
  const calculateBotScore = useCallback((straightness: number, velocityConsistency: number, clickPattern: number): number => {
    let rawScore = 0;
    
    switch (detectionMode) {
      case 'movement':
        rawScore = (straightness * 0.7) + (velocityConsistency * 0.3);
        break;
      case 'clicks':
        rawScore = clickPattern;
        break;
      case 'combined':
        rawScore = (straightness * 0.4) + (velocityConsistency * 0.3) + (clickPattern * 0.3);
        break;
    }
    
    if (straightness > 0.8 || velocityConsistency > 0.9 || clickPattern > 0.7) {
      rawScore = Math.min(1, rawScore * 1.3);
    }
    
    return Math.round(rawScore * 100);
  }, [detectionMode]);

  // Analyze data and update score
  const analyzeAndUpdateScore = useCallback(() => {
    if (detectionMode === 'movement' && points.length < CONFIG.minPointsForMovementAnalysis) return;
    if (detectionMode === 'clicks' && clicks.length < CONFIG.minClicksForAnalysis) return;
    if (detectionMode === 'combined' && (points.length < CONFIG.minPointsForCombined || clicks.length < CONFIG.minClicksForCombined)) return;
    
    const straightness = detectionMode !== 'clicks' ? calculateStraightness(points) : 0;
    const velocityConsistency = detectionMode !== 'clicks' ? calculateVelocityConsistency(points) : 0;
    const clickPattern = detectionMode !== 'movement' ? calculateClickPattern(clicks) : 0;
    
    const newMetrics = { straightness, velocityConsistency, clickPattern };
    const newBotScore = calculateBotScore(straightness, velocityConsistency, clickPattern);
    
    setMetrics(newMetrics);
    setBotScore(newBotScore);
    
    log('Score updated:', {
      botScore: newBotScore,
      metrics: newMetrics,
      dataPoints: { movements: points.length, clicks: clicks.length }
    });
  }, [points, clicks, detectionMode, calculateStraightness, calculateVelocityConsistency, calculateClickPattern, calculateBotScore, log]);

  // Event handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isTracking) return;
    
    const newPoint: Point = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    };
    
    setPoints(prevPoints => {
      const updatedPoints = [...prevPoints, newPoint];
      return updatedPoints.length > CONFIG.maxDataPoints 
        ? updatedPoints.slice(-CONFIG.maxDataPoints)
        : updatedPoints;
    });
    
    // Throttled analysis
    const now = Date.now();
    if (now - lastScoreUpdate.current > CONFIG.scoreUpdateInterval) {
      lastScoreUpdate.current = now;
      // Use setTimeout to avoid blocking the main thread
      setTimeout(analyzeAndUpdateScore, 0);
    }
  }, [isTracking, analyzeAndUpdateScore]);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!isTracking) return;
    
    const newClick: ClickEvent = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
      button: e.button
    };
    
    setClicks(prevClicks => {
      const updatedClicks = [...prevClicks, newClick];
      return updatedClicks.length > CONFIG.maxDataPoints / 2
        ? updatedClicks.slice(-CONFIG.maxDataPoints / 2)
        : updatedClicks;
    });
  }, [isTracking]);

  // Control functions
  const startTracking = useCallback(() => {
    setIsTracking(true);
    log('Tracking started');
  }, [log]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    log('Tracking stopped');
  }, [log]);

  const clearData = useCallback(() => {
    setPoints([]);
    setClicks([]);
    setBotScore(0);
    setMetrics({ straightness: 0, velocityConsistency: 0, clickPattern: 0 });
    lastScoreUpdate.current = 0;
    log('Data cleared');
  }, [log]);

  // Setup event listeners
  useEffect(() => {
    // Ensure we're on the client side
    isClient.current = true;
    
    if (!isTracking) return;

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('contextmenu', handleClick, { passive: true });
    
    log('Event listeners attached');
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleClick);
      log('Event listeners removed');
    };
  }, [isTracking, handleMouseMove, handleClick, log]);

  // Re-analyze when detection mode changes
  useEffect(() => {
    if (isClient.current) {
      analyzeAndUpdateScore();
    }
  }, [detectionMode, analyzeAndUpdateScore]);

  const contextValue: MouseTrackerData = {
    botScore,
    metrics,
    isTracking,
    detectionMode,
    dataPoints: {
      movements: points.length,
      clicks: clicks.length
    },
    startTracking,
    stopTracking,
    clearData,
    setDetectionMode
  };

  return (
    <MouseTrackerContext.Provider value={contextValue}>
      {children}
    </MouseTrackerContext.Provider>
  );
};

// Optional: Debug component to display current stats
export const MouseTrackerDebug: React.FC = () => {
  const tracker = useMouseTracker();
  
  if (!CONFIG.enableDebug) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div>Bot Score: {tracker.botScore}%</div>
      <div>Mode: {tracker.detectionMode}</div>
      <div>Movements: {tracker.dataPoints.movements}</div>
      <div>Clicks: {tracker.dataPoints.clicks}</div>
      <div>Straightness: {(tracker.metrics.straightness * 100).toFixed(1)}%</div>
      <div>Velocity: {(tracker.metrics.velocityConsistency * 100).toFixed(1)}%</div>
      <div>Click Pattern: {(tracker.metrics.clickPattern * 100).toFixed(1)}%</div>
    </div>
  );
};