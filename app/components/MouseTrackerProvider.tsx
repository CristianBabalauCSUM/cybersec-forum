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
  teleportation: number; // New metric for jump detection
  movementDensity: number; // New metric for sparse movement detection
};

type TeleportationEvent = {
  fromPoint: Point;
  toPoint: Point;
  distance: number;
  timeDelta: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
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
  teleportationEvents: TeleportationEvent[]; // New field to track suspicious jumps
  // Control functions
  startTracking: () => void;
  stopTracking: () => void;
  clearData: () => void;
  setDetectionMode: (mode: DetectionMode) => void;
};

// Enhanced Configuration
const CONFIG = {
  minPointsForMovementAnalysis: 5,
  minClicksForAnalysis: 5,
  minPointsForCombined: 10,
  minClicksForCombined: 3,
  scoreUpdateInterval: 2000,
  maxDataPoints: 1000,
  enableDebug: true,
  
  // Teleportation detection settings
  teleportation: {
    // Distance thresholds (pixels)
    minSuspiciousDistance: 150,
    highSuspiciousDistance: 400,
    criticalDistance: 500,
    
    // Time thresholds (milliseconds)
    maxNormalTime: 50, // If movement > minSuspiciousDistance happens in < 50ms, it's suspicious
    instantaneousTime: 16, // Anything faster than one frame (16ms) is very suspicious
    
    // Movement density thresholds
    minExpectedPointsPerDistance: 0.2, // Expected points per pixel for natural movement
    sparseMovementThreshold: 0.1, // Below this ratio is considered sparse
    
    // Scoring weights
    teleportationWeight: 0.4, // How much teleportation affects the bot score
    densityWeight: 0.2, // How much movement density affects the bot score
  }
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
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('movement');
  const [botScore, setBotScore] = useState(0);
  const [teleportationEvents, setTeleportationEvents] = useState<TeleportationEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    straightness: 0,
    velocityConsistency: 0,
    clickPattern: 0,
    teleportation: 0,
    movementDensity: 0
  });
  
  const lastScoreUpdate = useRef(0);
  const isClient = useRef(false);

  // Debug logging
  const log = useCallback((...args: any[]) => {
    if (CONFIG.enableDebug) {
      console.log('[MouseTracker]', ...args);
    }
  }, []);
  
  // Detect teleportation movements
  const detectTeleportation = useCallback((mousePoints: Point[]): { score: number; events: TeleportationEvent[] } => {
    if (mousePoints.length < 2) return { score: 0, events: [] };
    
    const events: TeleportationEvent[] = [];
    let totalSuspiciousMovements = 0;
    let criticalMovements = 0;
    
    for (let i = 1; i < mousePoints.length; i++) {
      const prevPoint = mousePoints[i - 1];
      const currentPoint = mousePoints[i];
      
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - prevPoint.x, 2) + 
        Math.pow(currentPoint.y - prevPoint.y, 2)
      );
      
      const timeDelta = currentPoint.timestamp - prevPoint.timestamp;
      
      // Skip if time delta is too large (user might have paused)
      if (timeDelta > 1000) continue;
      
      let severity: TeleportationEvent['severity'] | null = null;
      
      // Critical: Large distance in impossibly short time
      if (distance > CONFIG.teleportation.criticalDistance && timeDelta < CONFIG.teleportation.maxNormalTime) {
        severity = 'critical';
        criticalMovements++;
      }
      // High: Large distance in very short time
      else if (distance > CONFIG.teleportation.highSuspiciousDistance && timeDelta < CONFIG.teleportation.maxNormalTime) {
        severity = 'high';
      }
      // Medium: Moderate distance in very short time
      else if (distance > CONFIG.teleportation.minSuspiciousDistance && timeDelta < CONFIG.teleportation.instantaneousTime) {
        severity = 'medium';
      }
      // Low: Moderate distance in short time
      else if (distance > CONFIG.teleportation.minSuspiciousDistance && timeDelta < CONFIG.teleportation.maxNormalTime) {
        severity = 'low';
      }
      
      if (severity) {
        totalSuspiciousMovements++;
        events.push({
          fromPoint: prevPoint,
          toPoint: currentPoint,
          distance,
          timeDelta,
          severity
        });
      }
    }
    
    // Calculate score based on proportion of suspicious movements
    const totalMovements = mousePoints.length - 1;
    const suspiciousRatio = totalMovements > 0 ? totalSuspiciousMovements / totalMovements : 0;
    
    // Heavy penalty for critical movements
    const criticalPenalty = criticalMovements > 0 ? Math.min(1, criticalMovements * 0.3) : 0;
    
    // Base score from suspicious ratio
    let score = suspiciousRatio;
    
    // Apply critical penalty
    score = Math.max(score, criticalPenalty);
    
    // If more than 30% of movements are suspicious, heavily penalize
    if (suspiciousRatio > 0.3) {
      score = Math.min(1, score * 1.5);
    }
    
    // If more than 50% are suspicious, it's almost certainly a bot
    if (suspiciousRatio > 0.5) {
      score = Math.min(1, score * 2);
    }
    
    return { score, events };
  }, []);

  // Calculate movement density (how sparse the movements are)
  const calculateMovementDensity = useCallback((mousePoints: Point[]): number => {
    if (mousePoints.length < 5) return 0;
    
    // Calculate total path length
    let totalDistance = 0;
    for (let i = 1; i < mousePoints.length; i++) {
      const prevPoint = mousePoints[i - 1];
      const currentPoint = mousePoints[i];
      
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - prevPoint.x, 2) + 
        Math.pow(currentPoint.y - prevPoint.y, 2)
      );
      
      totalDistance += distance;
    }
    
    if (totalDistance === 0) return 1; // No movement at all is very suspicious
    
    // Calculate points per pixel ratio
    const pointsPerPixel = (mousePoints.length - 1) / totalDistance;
    
    // Compare against expected ratio for natural movement
    const expectedRatio = CONFIG.teleportation.minExpectedPointsPerDistance;
    const sparseThreshold = CONFIG.teleportation.sparseMovementThreshold;
    
    // If the ratio is below the sparse threshold, it's suspicious
    if (pointsPerPixel < sparseThreshold) {
      // The lower the ratio, the higher the suspicion
      return Math.min(1, (sparseThreshold - pointsPerPixel) / sparseThreshold);
    }
    
    return 0;
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
      
      if (dt > 8 && dt < 1000) { // Ignore very large time gaps
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

  // Enhanced bot score calculation
  const calculateBotScore = useCallback((
    straightness: number, 
    velocityConsistency: number, 
    clickPattern: number, 
    teleportation: number, 
    movementDensity: number
  ): number => {
    let rawScore = 0;
    
    // Base scoring based on detection mode
    switch (detectionMode) {
      case 'movement':
        rawScore = (straightness * 0.4) + (velocityConsistency * 0.2) + 
                  (teleportation * CONFIG.teleportation.teleportationWeight) + 
                  (movementDensity * CONFIG.teleportation.densityWeight);
        break;
      case 'clicks':
        rawScore = clickPattern;
        break;
      case 'combined':
        rawScore = (straightness * 0.25) + (velocityConsistency * 0.15) + (clickPattern * 0.2) + 
                  (teleportation * CONFIG.teleportation.teleportationWeight) + 
                  (movementDensity * CONFIG.teleportation.densityWeight);
        break;
    }
    
    // Heavy penalties for teleportation
    if (teleportation > 0.3) {
      rawScore = Math.min(1, rawScore * 1.5); // 50% increase
    }
    
    if (teleportation > 0.6) {
      rawScore = Math.min(1, rawScore * 1.8); // 80% increase
    }
    
    // Heavy penalties for sparse movement
    if (movementDensity > 0.5) {
      rawScore = Math.min(1, rawScore * 1.4); // 40% increase
    }
    
    // Combined penalties
    if (teleportation > 0.4 && movementDensity > 0.4) {
      rawScore = Math.min(1, rawScore * 2); // Double penalty for both
    }
    
    // Other existing penalties
    if (straightness > 0.8 || velocityConsistency > 0.9 || clickPattern > 0.7) {
      rawScore = Math.min(1, rawScore * 1.3);
    }
    
    return Math.round(rawScore * 100);
  }, [detectionMode]);

  // Enhanced analyze function
  const analyzeAndUpdateScore = useCallback(() => {
    if (detectionMode === 'movement' && points.length < CONFIG.minPointsForMovementAnalysis) return;
    if (detectionMode === 'clicks' && clicks.length < CONFIG.minClicksForAnalysis) return;
    if (detectionMode === 'combined' && (points.length < CONFIG.minPointsForCombined || clicks.length < CONFIG.minClicksForCombined)) return;
    
    const straightness = detectionMode !== 'clicks' ? calculateStraightness(points) : 0;
    const velocityConsistency = detectionMode !== 'clicks' ? calculateVelocityConsistency(points) : 0;
    const clickPattern = detectionMode !== 'movement' ? calculateClickPattern(clicks) : 0;
    
    // New analyses
    const teleportationResult = detectionMode !== 'clicks' ? detectTeleportation(points) : { score: 0, events: [] };
    const movementDensity = detectionMode !== 'clicks' ? calculateMovementDensity(points) : 0;
    
    const newMetrics = { 
      straightness, 
      velocityConsistency, 
      clickPattern, 
      teleportation: teleportationResult.score,
      movementDensity
    };
    
    const newBotScore = calculateBotScore(
      straightness, 
      velocityConsistency, 
      clickPattern, 
      teleportationResult.score, 
      movementDensity
    );
    
    setMetrics(newMetrics);
    setBotScore(newBotScore);
    setTeleportationEvents(teleportationResult.events);
    
    log('Enhanced score updated:', {
      botScore: newBotScore,
      metrics: newMetrics,
      teleportationEvents: teleportationResult.events.length,
      dataPoints: { movements: points.length, clicks: clicks.length }
    });
    
    // Log critical teleportation events
    if (teleportationResult.events.length > 0) {
      const criticalEvents = teleportationResult.events.filter(e => e.severity === 'critical');
      if (criticalEvents.length > 0) {
        log('🚨 CRITICAL TELEPORTATION DETECTED:', criticalEvents);
      }
    }
  }, [
    points, 
    clicks, 
    detectionMode, 
    calculateStraightness, 
    calculateVelocityConsistency, 
    calculateClickPattern, 
    detectTeleportation,
    calculateMovementDensity,
    calculateBotScore, 
    log
  ]);

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
    setTeleportationEvents([]);
    setMetrics({ 
      straightness: 0, 
      velocityConsistency: 0, 
      clickPattern: 0, 
      teleportation: 0, 
      movementDensity: 0 
    });
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
    teleportationEvents,
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

// Enhanced debug component
export const MouseTrackerDebug: React.FC = () => {
  const tracker = useMouseTracker();
  
  if (!CONFIG.enableDebug) return null;
  
  const criticalEvents = tracker.teleportationEvents.filter(e => e.severity === 'critical').length;
  const highEvents = tracker.teleportationEvents.filter(e => e.severity === 'high').length;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '11px',
      zIndex: 9999,
      pointerEvents: 'none',
      fontFamily: 'monospace',
      minWidth: '200px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px', color: tracker.botScore > 70 ? '#ff4444' : tracker.botScore > 40 ? '#ffaa00' : '#44ff44' }}>
        Bot Score: {tracker.botScore}%
      </div>
      <div>Mode: {tracker.detectionMode}</div>
      <div>Movements: {tracker.dataPoints.movements}</div>
      <div>Clicks: {tracker.dataPoints.clicks}</div>
      <div>Straightness: {(tracker.metrics.straightness * 100).toFixed(1)}%</div>
      <div>Velocity: {(tracker.metrics.velocityConsistency * 100).toFixed(1)}%</div>
      <div>Click Pattern: {(tracker.metrics.clickPattern * 100).toFixed(1)}%</div>
      <div style={{ color: tracker.metrics.teleportation > 0.3 ? '#ff4444' : '#ffaa00' }}>
        Teleportation: {(tracker.metrics.teleportation * 100).toFixed(1)}%
      </div>
      <div style={{ color: tracker.metrics.movementDensity > 0.5 ? '#ff4444' : '#ffaa00' }}>
        Movement Density: {(tracker.metrics.movementDensity * 100).toFixed(1)}%
      </div>
      {tracker.teleportationEvents.length > 0 && (
        <div style={{ marginTop: '5px', padding: '3px', background: 'rgba(255, 68, 68, 0.2)', borderRadius: '3px' }}>
          <div style={{ fontSize: '10px', color: '#ff4444' }}>
            Teleports: {tracker.teleportationEvents.length}
          </div>
          {criticalEvents > 0 && (
            <div style={{ fontSize: '10px', color: '#ff0000' }}>
              Critical: {criticalEvents}
            </div>
          )}
          {highEvents > 0 && (
            <div style={{ fontSize: '10px', color: '#ff6600' }}>
              High: {highEvents}
            </div>
          )}
        </div>
      )}
    </div>
  );
};