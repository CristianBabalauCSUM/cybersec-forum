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

type Props = {
  onScoreUpdate: (score: number) => void;
};

export default function MouseTracker({ onScoreUpdate }: Props) {
  const [points, setPoints] = useState<Point[]>([]);
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [isTracking, setIsTracking] = useState(true);
  const [detectionMode, setDetectionMode] = useState<'movement' | 'clicks' | 'combined'>('combined');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState({
    straightness: 0,
    velocityConsistency: 0,
    clickPattern: 0
  });
  
  // Track mouse movements and clicks
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isTracking) return;
      
      const newPoint = {
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
      };
      
      setPoints(prevPoints => [...prevPoints, newPoint]);
    };

    const handleClick = (e: MouseEvent) => {
      if (!isTracking) return;
      
      const newClick = {
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
        button: e.button
      };
      
      setClicks(prevClicks => [...prevClicks, newClick]);
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
    
    setMetrics({ 
      straightness, 
      velocityConsistency, 
      clickPattern 
    });
    
    // Calculate bot score based on current mode
    const botScore = calculateBotScore(straightness, velocityConsistency, clickPattern);
    onScoreUpdate(botScore);
    
    if (detectionMode !== 'clicks') {
      drawMovementPath();
    } else {
      drawClickPattern();
    }
  }, [points, clicks, onScoreUpdate, detectionMode]);
  
  // Calculate how straight the movement paths are
  const calculateStraightness = (mousePoints: Point[]): number => {
    if (mousePoints.length < 10) return 0;
    
    let straightSegments = 0;
    let totalSegments = 0;
    const segmentSize = 8; // Analyze segments of 8 points
    
    for (let i = 0; i < mousePoints.length - segmentSize; i++) {
      const segment = mousePoints.slice(i, i + segmentSize + 1);
      
      const startPoint = segment[0];
      const endPoint = segment[segment.length - 1];
      
      // Calculate expected line between start and end
      const expectedLength = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + 
        Math.pow(endPoint.y - startPoint.y, 2)
      );
      
      if (expectedLength < 10) continue; // Skip very short segments
      
      // Calculate actual path length
      let actualLength = 0;
      for (let j = 0; j < segment.length - 1; j++) {
        const p1 = segment[j];
        const p2 = segment[j + 1];
        actualLength += Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + 
          Math.pow(p2.y - p1.y, 2)
        );
      }
      
      // If actual path is very close to straight line, it's suspicious
      const straightnessRatio = expectedLength / actualLength;
      if (straightnessRatio > 0.95) {
        straightSegments++;
      }
      totalSegments++;
    }
    
    return totalSegments > 0 ? straightSegments / totalSegments : 0;
  };
  
  // Calculate how consistent the velocity is (bots often move at constant speed)
  const calculateVelocityConsistency = (mousePoints: Point[]): number => {
    if (mousePoints.length < 10) return 0;
    
    const velocities: number[] = [];
    
    for (let i = 1; i < mousePoints.length; i++) {
      const p1 = mousePoints[i - 1];
      const p2 = mousePoints[i];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dt = p2.timestamp - p1.timestamp;
      
      if (dt > 8) { // Skip very small time differences
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / dt;
        velocities.push(velocity);
      }
    }
    
    if (velocities.length < 5) return 0;
    
    // Calculate coefficient of variation
    const mean = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    
    // Low variation = high consistency = more bot-like
    // Human movements typically have CV > 0.4, bots often < 0.2
    const consistency = Math.max(0, 1 - Math.min(1, coefficientOfVariation / 0.5));
    
    return consistency;
  };
  
  // Calculate click pattern consistency (bots often click at regular intervals)
  const calculateClickPattern = (clickEvents: ClickEvent[]): number => {
    if (clickEvents.length < 5) return 0;
    
    const intervals: number[] = [];
    
    // Calculate time intervals between clicks
    for (let i = 1; i < clickEvents.length; i++) {
      const interval = clickEvents[i].timestamp - clickEvents[i-1].timestamp;
      if (interval > 50 && interval < 10000) { // Filter out double-clicks and very long pauses
        intervals.push(interval);
      }
    }
    
    if (intervals.length < 3) return 0;
    
    // Calculate consistency of intervals
    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    
    // Check for suspiciously regular patterns
    let regularityScore = 0;
    
    // Very consistent timing (CV < 0.15) is suspicious
    if (coefficientOfVariation < 0.15) {
      regularityScore += 0.6;
    }
    
    // Check for repeated exact intervals (very bot-like)
    const intervalCounts = new Map();
    intervals.forEach(interval => {
      const rounded = Math.round(interval / 50) * 50; // Round to nearest 50ms
      intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1);
    });
    
    const maxRepeats = Math.max(...intervalCounts.values());
    if (maxRepeats >= intervals.length * 0.4) { // 40% or more identical intervals
      regularityScore += 0.4;
    }
    
    return Math.min(1, regularityScore);
  };
  // Calculate final bot probability score based on detection mode
  const calculateBotScore = (straightness: number, velocityConsistency: number, clickPattern: number): number => {
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
    
    // Apply threshold boost for extreme values
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
    
    // Highlight very straight segments in red
    highlightStraightSegments(ctx);
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
    
    // Draw click points
    clicks.forEach((click, index) => {
      ctx.beginPath();
      ctx.arc(click.x, click.y, 8, 0, 2 * Math.PI);
      
      // Color based on timing regularity
      if (index > 0) {
        const interval = click.timestamp - clicks[index-1].timestamp;
        const isRegular = interval > 800 && interval < 1200; // Suspiciously regular ~1 second intervals
        ctx.fillStyle = isRegular ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 123, 255, 0.7)';
      } else {
        ctx.fillStyle = 'rgba(0, 123, 255, 0.7)';
      }
      
      ctx.fill();
      
      // Draw click number
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), click.x, click.y + 4);
    });
    
    // Draw timing lines between consecutive clicks with similar intervals
    for (let i = 1; i < clicks.length - 1; i++) {
      const interval1 = clicks[i].timestamp - clicks[i-1].timestamp;
      const interval2 = clicks[i+1].timestamp - clicks[i].timestamp;
      
      // If intervals are very similar, draw a warning line
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
    
    const segmentSize = 6;
    
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
      
      // Highlight very straight segments
      if (straightnessRatio > 0.96) {
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
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Bot Detection</h3>
        
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
            <option value="combined">Combined Analysis</option>
            <option value="movement">Movement Only</option>
            <option value="clicks">Click Pattern Only</option>
          </select>
        </div>
        
        <div style={{ fontSize: '14px' }}>
          {detectionMode !== 'clicks' && (
            <>
              <div>Straight Lines: {(metrics.straightness * 100).toFixed(1)}%</div>
              <div>Constant Speed: {(metrics.velocityConsistency * 100).toFixed(1)}%</div>
            </>
          )}
          {detectionMode !== 'movement' && (
            <div>Click Regularity: {(metrics.clickPattern * 100).toFixed(1)}%</div>
          )}
          <div style={{ 
            marginTop: '10px', 
            fontWeight: 'bold',
            color: calculateBotScore(metrics.straightness, metrics.velocityConsistency, metrics.clickPattern) > 70 ? 'red' : 'green'
          }}>
            Bot Probability: {calculateBotScore(metrics.straightness, metrics.velocityConsistency, metrics.clickPattern)}%
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
            cursor: 'pointer'
          }}>
            {isTracking ? 'Pause' : 'Resume'}
          </button>
          
          <button onClick={() => {
            setPoints([]);
            setClicks([]);
            onScoreUpdate(0);
            setMetrics({ straightness: 0, velocityConsistency: 0, clickPattern: 0 });
          }} style={{
            padding: '5px 10px',
            border: 'none',
            borderRadius: '4px',
            background: '#6c757d',
            color: 'white',
            cursor: 'pointer'
          }}>
            Clear
          </button>
        </div>
      </div>
    </>
  );
}