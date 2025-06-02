"use client";

import { useEffect, useState, useRef } from 'react';

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

type TeleportationEvent = {
  fromPoint: Point;
  toPoint: Point;
  distance: number;
  timeDelta: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
};

type Props = {
  onScoreUpdate: (score: number) => void;
};

export default function MouseTracker({ onScoreUpdate }: Props) {
  const [points, setPoints] = useState<Point[]>([]);
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [isTracking, setIsTracking] = useState(true);
  const [detectionMode, setDetectionMode] = useState<'movement' | 'clicks' | 'combined'>('movement');
  const [teleportationEvents, setTeleportationEvents] = useState<TeleportationEvent[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState({
    straightness: 0,
    velocityConsistency: 0,
    clickPattern: 0,
    teleportation: 0,
    movementDensity: 0
  });

  // Enhanced configuration with higher teleportation thresholds for lab
  const CONFIG = {
    teleportation: {
      // Higher distance thresholds for lab testing
      minSuspiciousDistance: 150, // Increased from 100
      highSuspiciousDistance: 400, // Increased from 300
      criticalDistance: 600, // Increased from 500
      
      // Time thresholds (milliseconds)
      maxNormalTime: 60, // Increased from 50ms
      instantaneousTime: 20, // Increased from 16ms
      
      // Movement density thresholds
      minExpectedPointsPerDistance: 0.15, // Slightly reduced
      sparseMovementThreshold: 0.08, // Slightly reduced
      
      // Scoring weights
      teleportationWeight: 0.35, // Slightly reduced
      densityWeight: 0.2,
    }
  };
  
  // Track mouse movements and clicks
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isTracking) return;
      
      const newPoint = {
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
      };
      
      setPoints(prevPoints => {
        const updatedPoints = [...prevPoints, newPoint];
        return updatedPoints.length > 1000 ? updatedPoints.slice(-1000) : updatedPoints;
      });
    };

    const handleClick = (e: MouseEvent) => {
      if (!isTracking) return;
      
      const newClick = {
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
        button: e.button
      };
      
      setClicks(prevClicks => {
        const updatedClicks = [...prevClicks, newClick];
        return updatedClicks.length > 500 ? updatedClicks.slice(-500) : updatedClicks;
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('contextmenu', handleClick);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', handleClick);
    };
  }, [isTracking]);
  
  // Analyze movements and calculate bot probability
  useEffect(() => {
    if (detectionMode === 'movement' && points.length < 15) return;
    if (detectionMode === 'clicks' && clicks.length < 5) return;
    if (detectionMode === 'combined' && (points.length < 10 || clicks.length < 3)) return;
    
    const straightness = detectionMode !== 'clicks' ? calculateStraightness(points) : 0;
    const velocityConsistency = detectionMode !== 'clicks' ? calculateVelocityConsistency(points) : 0;
    const clickPattern = detectionMode !== 'movement' ? calculateClickPattern(clicks) : 0;
    
    // New enhanced analyses
    const teleportationResult = detectionMode !== 'clicks' ? detectTeleportation(points) : { score: 0, events: [] };
    const movementDensity = detectionMode !== 'clicks' ? calculateMovementDensity(points) : 0;
    
    setMetrics({ 
      straightness, 
      velocityConsistency, 
      clickPattern,
      teleportation: teleportationResult.score,
      movementDensity
    });
    
    setTeleportationEvents(teleportationResult.events);
    
    // Calculate enhanced bot score
    const botScore = calculateBotScore(straightness, velocityConsistency, clickPattern, teleportationResult.score, movementDensity);
    onScoreUpdate(botScore);
    
    if (detectionMode !== 'clicks') {
      drawMovementPath();
    } else {
      drawClickPattern();
    }
  }, [points, clicks, onScoreUpdate, detectionMode]);

  // Helper function to calculate distance from point to line
  const distanceFromPointToLine = (point: Point, lineStart: Point, lineEnd: Point): number => {
    const A = lineEnd.y - lineStart.y;
    const B = lineStart.x - lineEnd.x;
    const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y;
    
    const distance = Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B);
    return distance;
  };

  // Enhanced straightness detection for unnatural Euclidean paths
  const calculateStraightness = (mousePoints: Point[]): number => {
    if (mousePoints.length < 10) return 0;
    
    let suspiciousSegments = 0;
    let totalAnalyzedSegments = 0;
    const segmentSize = 12;
    const minSegmentDistance = 50;
    
    for (let i = 0; i < mousePoints.length - segmentSize; i++) {
      const segment = mousePoints.slice(i, i + segmentSize + 1);
      
      const startPoint = segment[0];
      const endPoint = segment[segment.length - 1];
      
      const euclideanDistance = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + 
        Math.pow(endPoint.y - startPoint.y, 2)
      );
      
      if (euclideanDistance < minSegmentDistance) continue;
      
      let actualPathLength = 0;
      for (let j = 0; j < segment.length - 1; j++) {
        const p1 = segment[j];
        const p2 = segment[j + 1];
        actualPathLength += Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + 
          Math.pow(p2.y - p1.y, 2)
        );
      }
      
      const efficiencyRatio = euclideanDistance / actualPathLength;
      const isSuspiciouslyEfficient = efficiencyRatio > 0.98;
      
      let maxDeviationFromLine = 0;
      for (let j = 1; j < segment.length - 1; j++) {
        const point = segment[j];
        const lineDistanceFromPoint = distanceFromPointToLine(point, startPoint, endPoint);
        maxDeviationFromLine = Math.max(maxDeviationFromLine, lineDistanceFromPoint);
      }
      
      const isUnaturallyLinear = maxDeviationFromLine < 3;
      
      const velocities: number[] = [];
      for (let j = 1; j < segment.length; j++) {
        const timeDelta = segment[j].timestamp - segment[j-1].timestamp;
        if (timeDelta > 0) {
          const distance = Math.sqrt(
            Math.pow(segment[j].x - segment[j-1].x, 2) + 
            Math.pow(segment[j].y - segment[j-1].y, 2)
          );
          velocities.push(distance / timeDelta);
        }
      }
      
      let isVelocityTooConsistent = false;
      if (velocities.length > 3) {
        const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
        const velocityVariance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
        const velocityStdDev = Math.sqrt(velocityVariance);
        const velocityCoeffVar = avgVelocity > 0 ? velocityStdDev / avgVelocity : 0;
        
        isVelocityTooConsistent = velocityCoeffVar < 0.1;
      }
      
      let suspicionScore = 0;
      
      if (isSuspiciouslyEfficient) suspicionScore += 0.4;
      if (isUnaturallyLinear) suspicionScore += 0.3;
      if (isVelocityTooConsistent) suspicionScore += 0.3;
      
      if (suspicionScore >= 0.6) {
        suspiciousSegments++;
      }
      
      totalAnalyzedSegments++;
    }
    
    return totalAnalyzedSegments > 0 ? suspiciousSegments / totalAnalyzedSegments : 0;
  };

  // Detect teleportation movements with higher thresholds
  const detectTeleportation = (mousePoints: Point[]): { score: number; events: TeleportationEvent[] } => {
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
      
      if (timeDelta > 1000) continue;
      
      let severity: TeleportationEvent['severity'] | null = null;
      
      if (distance > CONFIG.teleportation.criticalDistance && timeDelta < CONFIG.teleportation.maxNormalTime) {
        severity = 'critical';
        criticalMovements++;
      }
      else if (distance > CONFIG.teleportation.highSuspiciousDistance && timeDelta < CONFIG.teleportation.maxNormalTime) {
        severity = 'high';
      }
      else if (distance > CONFIG.teleportation.minSuspiciousDistance && timeDelta < CONFIG.teleportation.instantaneousTime) {
        severity = 'medium';
      }
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
    
    const totalMovements = mousePoints.length - 1;
    const suspiciousRatio = totalMovements > 0 ? totalSuspiciousMovements / totalMovements : 0;
    
    const criticalPenalty = criticalMovements > 0 ? Math.min(1, criticalMovements * 0.3) : 0;
    
    let score = suspiciousRatio;
    score = Math.max(score, criticalPenalty);
    
    if (suspiciousRatio > 0.3) {
      score = Math.min(1, score * 1.5);
    }
    
    if (suspiciousRatio > 0.5) {
      score = Math.min(1, score * 2);
    }
    
    return { score, events };
  };

  // Calculate movement density
  const calculateMovementDensity = (mousePoints: Point[]): number => {
    if (mousePoints.length < 5) return 0;
    
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
    
    if (totalDistance === 0) return 1;
    
    const pointsPerPixel = (mousePoints.length - 1) / totalDistance;
    const expectedRatio = CONFIG.teleportation.minExpectedPointsPerDistance;
    const sparseThreshold = CONFIG.teleportation.sparseMovementThreshold;
    
    if (pointsPerPixel < sparseThreshold) {
      return Math.min(1, (sparseThreshold - pointsPerPixel) / sparseThreshold);
    }
    
    return 0;
  };
  
  // Calculate how consistent the velocity is
  const calculateVelocityConsistency = (mousePoints: Point[]): number => {
    if (mousePoints.length < 10) return 0;
    
    const velocities: number[] = [];
    
    for (let i = 1; i < mousePoints.length; i++) {
      const p1 = mousePoints[i - 1];
      const p2 = mousePoints[i];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dt = p2.timestamp - p1.timestamp;
      
      if (dt > 8 && dt < 1000) {
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
  };
  
  // Calculate click pattern consistency
  const calculateClickPattern = (clickEvents: ClickEvent[]): number => {
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
  };

  // Enhanced bot score calculation
  const calculateBotScore = (
    straightness: number, 
    velocityConsistency: number, 
    clickPattern: number, 
    teleportation: number, 
    movementDensity: number
  ): number => {
    let rawScore = 0;
    
    switch (detectionMode) {
      case 'movement':
        rawScore = (straightness * 0.4) + (velocityConsistency * 0.25) + 
                  (teleportation * CONFIG.teleportation.teleportationWeight) + 
                  (movementDensity * CONFIG.teleportation.densityWeight);
        break;
      case 'clicks':
        rawScore = clickPattern;
        break;
      case 'combined':
        rawScore = (straightness * 0.25) + (velocityConsistency * 0.2) + (clickPattern * 0.2) + 
                  (teleportation * CONFIG.teleportation.teleportationWeight) + 
                  (movementDensity * CONFIG.teleportation.densityWeight);
        break;
    }
    
    // Heavy penalties for teleportation
    if (teleportation > 0.3) {
      rawScore = Math.min(1, rawScore * 1.4);
    }
    
    if (teleportation > 0.6) {
      rawScore = Math.min(1, rawScore * 1.7);
    }
    
    if (movementDensity > 0.5) {
      rawScore = Math.min(1, rawScore * 1.3);
    }
    
    if (teleportation > 0.4 && movementDensity > 0.4) {
      rawScore = Math.min(1, rawScore * 1.8);
    }
    
    if (straightness > 0.8 || velocityConsistency > 0.9 || clickPattern > 0.7) {
      rawScore = Math.min(1, rawScore * 1.3);
    }
    
    return Math.round(rawScore * 100);
  };
  
  // Draw the movement path and highlight suspicious segments
  const drawMovementPath = () => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw normal path
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
    ctx.lineWidth = 2;
    
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    
    // Highlight teleportation events
    highlightTeleportationEvents(ctx);
    
    // Highlight very straight segments
    highlightStraightSegments(ctx);
  };

  // New function to highlight teleportation events
  const highlightTeleportationEvents = (ctx: CanvasRenderingContext2D) => {
    teleportationEvents.forEach(event => {
      let color = 'rgba(255, 165, 0, 0.8)'; // Default orange
      let lineWidth = 3;
      
      switch (event.severity) {
        case 'critical':
          color = 'rgba(255, 0, 0, 0.9)';
          lineWidth = 6;
          break;
        case 'high':
          color = 'rgba(255, 69, 0, 0.8)';
          lineWidth = 5;
          break;
        case 'medium':
          color = 'rgba(255, 140, 0, 0.8)';
          lineWidth = 4;
          break;
        case 'low':
          color = 'rgba(255, 215, 0, 0.7)';
          lineWidth = 3;
          break;
      }
      
      // Draw teleportation line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([10, 5]);
      ctx.moveTo(event.fromPoint.x, event.fromPoint.y);
      ctx.lineTo(event.toPoint.x, event.toPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw severity indicator
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(event.toPoint.x, event.toPoint.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw distance label
      ctx.fillStyle = 'black';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${Math.round(event.distance)}px/${event.timeDelta}ms`, 
        (event.fromPoint.x + event.toPoint.x) / 2, 
        (event.fromPoint.y + event.toPoint.y) / 2 - 10
      );
    });
  };
  
  // Draw click pattern visualization
  const drawClickPattern = () => {
    const canvas = canvasRef.current;
    if (!canvas || clicks.length < 2) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    clicks.forEach((click, index) => {
      ctx.beginPath();
      ctx.arc(click.x, click.y, 8, 0, 2 * Math.PI);
      
      if (index > 0) {
        const interval = click.timestamp - clicks[index-1].timestamp;
        const isRegular = interval > 800 && interval < 1200;
        ctx.fillStyle = isRegular ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 123, 255, 0.7)';
      } else {
        ctx.fillStyle = 'rgba(0, 123, 255, 0.7)';
      }
      
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), click.x, click.y + 4);
    });
    
    for (let i = 1; i < clicks.length - 1; i++) {
      const interval1 = clicks[i].timestamp - clicks[i-1].timestamp;
      const interval2 = clicks[i+1].timestamp - clicks[i].timestamp;
      
      if (Math.abs(interval1 - interval2) < 100 && interval1 > 500) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(clicks[i-1].x, clicks[i-1].y);
        ctx.lineTo(clicks[i].x, clicks[i].y);
        ctx.lineTo(clicks[i+1].x, clicks[i+1].y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };
  
  const highlightStraightSegments = (ctx: CanvasRenderingContext2D) => {
    if (points.length < 10) return;
    
    const segmentSize = 8;
    
    for (let i = 0; i < points.length - segmentSize; i++) {
      const segment = points.slice(i, i + segmentSize + 1);
      
      const startPoint = segment[0];
      const endPoint = segment[segment.length - 1];
      
      const expectedLength = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + 
        Math.pow(endPoint.y - startPoint.y, 2)
      );
      
      if (expectedLength < 15) continue;
      
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
      
      if (straightnessRatio > 0.98) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 4;
        
        ctx.moveTo(segment[0].x, segment[0].y);
        segment.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      }
    }
  };
  
  return (
    <>
      <canvas ref={canvasRef} style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        pointerEvents: 'none',
        zIndex: -1
      }} />
      
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        right: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        minWidth: '220px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Enhanced Bot Detection Lab</h3>
        
        {/* Mode Selector */}
        <div style={{ marginBottom: '15px' }}>
          <select 
            value={detectionMode} 
            onChange={(e) => setDetectionMode(e.target.value as 'movement' | 'clicks' | 'combined')}
            style={{
              width: '100%',
              padding: '5px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="movement">Movement Only</option>
            <option value="combined">Combined Analysis</option>
            <option value="clicks">Click Pattern Only</option>
          </select>
        </div>
        
        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
          {detectionMode !== 'clicks' && (
            <>
              <div>Straight Lines: <span style={{color: metrics.straightness > 0.6 ? 'red' : 'green'}}>{(metrics.straightness * 100).toFixed(1)}%</span></div>
              <div>Constant Speed: <span style={{color: metrics.velocityConsistency > 0.8 ? 'red' : 'green'}}>{(metrics.velocityConsistency * 100).toFixed(1)}%</span></div>
              <div>Teleportation: <span style={{color: metrics.teleportation > 0.3 ? 'red' : 'orange'}}>{(metrics.teleportation * 100).toFixed(1)}%</span></div>
              <div>Movement Density: <span style={{color: metrics.movementDensity > 0.5 ? 'red' : 'orange'}}>{(metrics.movementDensity * 100).toFixed(1)}%</span></div>
              {teleportationEvents.length > 0 && (
                <div style={{marginTop: '5px', padding: '3px', background: 'rgba(255,0,0,0.1)', borderRadius: '3px'}}>
                  <div style={{fontSize: '10px'}}>Teleports: {teleportationEvents.length}</div>
                  <div style={{fontSize: '10px'}}>
                    🚨{teleportationEvents.filter(e => e.severity === 'critical').length} 
                    ⚠️{teleportationEvents.filter(e => e.severity === 'high').length}
                    ⚡{teleportationEvents.filter(e => e.severity === 'medium').length}
                    ℹ️{teleportationEvents.filter(e => e.severity === 'low').length}
                  </div>
                </div>
              )}
            </>
          )}
          {detectionMode !== 'movement' && (
            <div>Click Regularity: <span style={{color: metrics.clickPattern > 0.6 ? 'red' : 'green'}}>{(metrics.clickPattern * 100).toFixed(1)}%</span></div>
          )}
          <div style={{ 
            marginTop: '10px', 
            fontWeight: 'bold',
            color: calculateBotScore(metrics.straightness, metrics.velocityConsistency, metrics.clickPattern, metrics.teleportation, metrics.movementDensity) > 70 ? 'red' : 
                  calculateBotScore(metrics.straightness, metrics.velocityConsistency, metrics.clickPattern, metrics.teleportation, metrics.movementDensity) > 40 ? 'orange' : 'green'
          }}>
            Bot Probability: {calculateBotScore(metrics.straightness, metrics.velocityConsistency, metrics.clickPattern, metrics.teleportation, metrics.movementDensity)}%
          </div>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <button onClick={() => setIsTracking(!isTracking)} style={{
            marginRight: '8px',
            padding: '5px 10px',
            border: 'none',
            borderRadius: '4px',
            background: isTracking ? '#dc3545' : '#28a745',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            {isTracking ? 'Pause' : 'Resume'}
          </button>
          
          <button onClick={() => {
            setPoints([]);
            setClicks([]);
            setTeleportationEvents([]);
            onScoreUpdate(0);
            setMetrics({ 
              straightness: 0, 
              velocityConsistency: 0, 
              clickPattern: 0, 
              teleportation: 0, 
              movementDensity: 0 
            });
          }} style={{
            padding: '5px 10px',
            border: 'none',
            borderRadius: '4px',
            background: '#6c757d',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            Clear
          </button>
        </div>

        {/* Configuration Info */}
        <div style={{ 
          marginTop: '15px', 
          padding: '8px', 
          background: 'rgba(0,0,0,0.05)', 
          borderRadius: '4px',
          fontSize: '10px',
          color: '#666'
        }}>
          <div><strong>Lab Thresholds:</strong></div>
          <div>Teleport: {CONFIG.teleportation.minSuspiciousDistance}px+</div>
          <div>Critical: {CONFIG.teleportation.criticalDistance}px in {CONFIG.teleportation.maxNormalTime}ms</div>
          <div>Data Points: {points.length}M / {clicks.length}C</div>
        </div>
      </div>
    </>
  );
}