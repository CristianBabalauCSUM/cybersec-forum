// app/(laboratory-environment)/mouse-tracker/MouseTracker.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import styles from './MouseTracker.module.css';

type Point = {
  x: number;
  y: number;
  timestamp: number;
};


type Velocity = {
  value: number;
  timestamp: number;
};


type Props = {
  onScoreUpdate: (score: number) => void;
};

export default function MouseTracker({ onScoreUpdate }: Props) {
  const [points, setPoints] = useState<Point[]>([]);
  const [isTracking, setIsTracking] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState({
    straightness: 0,
    velocityConsistency: 0,
    angularVariation: 0,
    accelerationVariation: 0,
    pauseFrequency: 0
  });
  
  // Start tracking when component mounts
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
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isTracking]);
  
  // Calculate bot probability based on mouse movements
  useEffect(() => {
    if (points.length < 20) return; // Need more points for reliable analysis
    
    // Calculate all metrics
    const straightness = calculateStraightness(points);
    const velocityConsistency = calculateVelocityConsistency(points);
    const angularVariation = calculateAngularVariation(points);
    const accelerationVariation = calculateAccelerationVariation(points);
    const pauseFrequency = calculatePauseFrequency(points);
    
    setMetrics({
      straightness,
      velocityConsistency,
      angularVariation,
      accelerationVariation,
      pauseFrequency
    });
    
    // Combine metrics with weighted importance
    const botScore = calculateCombinedScore({
      straightness,
      velocityConsistency,
      angularVariation,
      accelerationVariation,
      pauseFrequency
    });
    
    onScoreUpdate(botScore);
    
    // Draw points on canvas
    drawPointsOnCanvas();
  }, [points, onScoreUpdate]);
  
  // Draw points and lines on canvas
  const drawPointsOnCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw lines between points
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(75, 192, 192, 0.6)';
    ctx.lineWidth = 2;
    
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    
    ctx.stroke();
    
    // Highlight potential bot-like segments
    highlightBotSegments(ctx);
  };
  
  // Highlight segments with bot-like characteristics
  const highlightBotSegments = (ctx: CanvasRenderingContext2D) => {
    if (points.length < 10) return;
    
    // Find segments with very straight lines
    for (let i = 5; i < points.length; i++) {
      const segment = points.slice(i-5, i+1);
      const segmentStraightness = calculateStraightness(segment);
      
      // If segment is unusually straight, highlight it
      if (segmentStraightness > 0.9) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 3;
        
        ctx.moveTo(segment[0].x, segment[0].y);
        segment.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        
        ctx.stroke();
      }
    }
  };
  
  // Calculate combined score with weighted metrics
  const calculateCombinedScore = (metrics: {
    straightness: number,
    velocityConsistency: number,
    angularVariation: number,
    accelerationVariation: number,
    pauseFrequency: number
  }): number => {

    const weights = {
      straightness: 0.25,         // Higher = more bot-like
      velocityConsistency: 0.20,  // Higher = more bot-like
      angularVariation: 0.20,     // Lower = more bot-like
      accelerationVariation: 0.20,// Lower = more bot-like
      pauseFrequency: 0.15        // Lower = more bot-like
    };
    
    // For metrics where lower values indicate bots, invert the score
    const invertedAngularVariation = 1 - metrics.angularVariation;
    const invertedAccelerationVariation = 1 - metrics.accelerationVariation;
    const invertedPauseFrequency = 1 - metrics.pauseFrequency;
    
    // Calculate weighted sum
    const weightedScore = 
      (metrics.straightness * weights.straightness) +
      (metrics.velocityConsistency * weights.velocityConsistency) +
      (invertedAngularVariation * weights.angularVariation) +
      (invertedAccelerationVariation * weights.accelerationVariation) +
      (invertedPauseFrequency * weights.pauseFrequency);
    
    // Apply a sigmoid function to get a better distribution
    // This helps avoid clustering around specific values
    const sigmoidScore = 1 / (1 + Math.exp(-8 * (weightedScore - 0.5)));
    
    // Convert to percentage (0-100)
    return sigmoidScore * 100;
  };
  
  // IMPROVED: Calculate straightness with better thresholds
  const calculateStraightness = (mousePoints: Point[]): number => {
    if (mousePoints.length < 6) return 0;
    
    let deviationSum = 0;
    const segmentSize = 5; // Look at segments of 5 points
    
    // Analyze straightness in small segments
    for (let i = 0; i < mousePoints.length - segmentSize; i++) {
      const segment = mousePoints.slice(i, i + segmentSize + 1);
      
      // Find start and end points of segment
      const startPoint = segment[0];
      const endPoint = segment[segment.length - 1];
      
      // Calculate line equation: ax + by + c = 0
      const a = endPoint.y - startPoint.y;
      const b = startPoint.x - endPoint.x;
      const c = endPoint.x * startPoint.y - startPoint.x * endPoint.y;
      
      // Calculate max deviation from line
      let maxDeviation = 0;
      for (let j = 1; j < segment.length - 1; j++) {
        const point = segment[j];
        
        // Distance from point to line
        const distance = Math.abs(a * point.x + b * point.y + c) / Math.sqrt(a * a + b * b);
        maxDeviation = Math.max(maxDeviation, distance);
      }
      
      // Calculate segment length
      const segmentLength = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + 
        Math.pow(endPoint.y - startPoint.y, 2)
      );
      
      // Normalize deviation by segment length
      const normalizedDeviation = segmentLength > 0 ? maxDeviation / segmentLength : 0;
      deviationSum += normalizedDeviation;
    }
    
    // Calculate average deviation
    const avgDeviation = deviationSum / (mousePoints.length - segmentSize);
    
    // Convert to straightness score (0-1)
    // Lower deviation = straighter line = higher score
    const maxExpectedDeviation = 0.2; // Calibrate based on testing
    const straightnessScore = Math.max(0, 1 - Math.min(1, avgDeviation / maxExpectedDeviation));
    
    return straightnessScore;
  };
  
    const calculateVelocityConsistency = (mousePoints: Point[]): number => {
    if (mousePoints.length < 10) return 0;
    
    const velocities: number[] = []; 
    let lastValidTimestamp = mousePoints[0].timestamp;
    
    for (let i = 1; i < mousePoints.length; i++) {
      const p1 = mousePoints[i - 1];
      const p2 = mousePoints[i];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dt = p2.timestamp - p1.timestamp;
      
      // Skip points with very small time differences
      if (dt > 5) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / dt;
        velocities.push(velocity); 
        lastValidTimestamp = p2.timestamp;
      }
    }

    
    if (velocities.length < 5) return 0;
    
    const mean = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    
    // Handle outliers by removing values outside 3 standard deviations
    const initialStdDev = Math.sqrt(
      velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length
    );
    
    const filteredVelocities = velocities.filter(
      v => Math.abs(v - mean) <= 3 * initialStdDev
    );
    
    // Recalculate with filtered values
    const filteredMean = filteredVelocities.reduce((sum, v) => sum + v, 0) / filteredVelocities.length;
    const filteredVariance = filteredVelocities.reduce((sum, v) => sum + Math.pow(v - filteredMean, 2), 0) / filteredVelocities.length;
    const filteredStdDev = Math.sqrt(filteredVariance);
    
    // Calculate coefficient of variation (lower = more consistent = more bot-like)
    const cv = filteredMean > 0 ? filteredStdDev / filteredMean : 0;
    
    // Convert to 0-1 score where 1 is very consistent (bot-like)
    // Human-like movements typically have CV > 0.5, bots often < 0.2
    const maxExpectedCV = 0.6; 
    const consistencyScore = Math.max(0, 1 - Math.min(1, cv / maxExpectedCV));
    
    return consistencyScore;
  };
  
  // NEW: Calculate variation in angular movement
  const calculateAngularVariation = (mousePoints: Point[]): number => {
    if (mousePoints.length < 10) return 0;
    
    const angles: number[] = [];
    
    for (let i = 2; i < mousePoints.length; i++) {
      const p1 = mousePoints[i - 2];
      const p2 = mousePoints[i - 1];
      const p3 = mousePoints[i];
      
      // Vector 1
      const v1x = p2.x - p1.x;
      const v1y = p2.y - p1.y;
      
      // Vector 2
      const v2x = p3.x - p2.x;
      const v2y = p3.y - p2.y;
      
      // Calculate dot product
      const dotProduct = v1x * v2x + v1y * v2y;
      
      // Calculate magnitudes
      const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
      
      // Calculate angle in radians
      if (mag1 > 0 && mag2 > 0) {
        const cosTheta = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
        const angle = Math.acos(cosTheta);
        angles.push(angle);
      }
    }
    
    if (angles.length < 3) return 0;
    
    // Calculate standard deviation of angles
    const avgAngle = angles.reduce((sum, angle) => sum + angle, 0) / angles.length;
    const variance = angles.reduce((sum, angle) => sum + Math.pow(angle - avgAngle, 2), 0) / angles.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize - higher std dev = more variation = more human-like
    // Typical human values range from 0.3 to 0.8 radians
    const maxExpectedStdDev = 0.7;
    const variationScore = Math.min(1, stdDev / maxExpectedStdDev);
    
    return variationScore;
  };
  
  // NEW: Calculate acceleration variation
const calculateAccelerationVariation = (mousePoints: Point[]): number => {
    if (mousePoints.length < 15) return 0;
    
    const accelerations: number[] = [];
    const velocities: Velocity[] = []; // Now properly typed
    
    // First calculate velocities
    for (let i = 1; i < mousePoints.length; i++) {
      const p1 = mousePoints[i - 1];
      const p2 = mousePoints[i];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dt = p2.timestamp - p1.timestamp;
      
      if (dt > 5) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / dt;
        velocities.push({ value: velocity, timestamp: p2.timestamp });
      }
    }
    
    // Then calculate accelerations
    for (let i = 1; i < velocities.length; i++) {
      const v1 = velocities[i - 1];
      const v2 = velocities[i];
      
      const dv = v2.value - v1.value;
      const dt = v2.timestamp - v1.timestamp;
      
      if (dt > 0) {
        const acceleration = dv / dt;
        accelerations.push(Math.abs(acceleration)); // Use absolute value
      }
    }
    
    // Rest of function remains the same
    
    if (accelerations.length < 5) return 0;
    
    // Calculate acceleration variation coefficient
    const mean = accelerations.reduce((sum, a) => sum + a, 0) / accelerations.length;
    const variance = accelerations.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / accelerations.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;
    
    // Normalize - higher variation = more human-like
    // Bots typically have very low variation in acceleration
    const maxExpectedCV = 1.5;
    const variationScore = Math.min(1, cv / maxExpectedCV);
    
    return variationScore;
  };
  
  
  // NEW: Calculate pause frequency
  const calculatePauseFrequency = (mousePoints: Point[]): number => {
    if (mousePoints.length < 10) return 0;
    
    let pauseCount = 0;
    const minPauseTime = 100; // ms
    
    for (let i = 1; i < mousePoints.length; i++) {
      const timeDiff = mousePoints[i].timestamp - mousePoints[i-1].timestamp;
      
      // Count as pause if time difference is significant
      if (timeDiff > minPauseTime) {
        pauseCount++;
      }
    }
    
    // Calculate pause frequency per second
    const totalTime = (mousePoints[mousePoints.length - 1].timestamp - mousePoints[0].timestamp) / 1000;
    const pauseFrequency = totalTime > 0 ? pauseCount / totalTime : 0;
    
    // Normalize - higher pause frequency = more human-like
    // Humans typically pause or change direction more frequently
    const maxExpectedPauseFreq = 0.8; // pauses per second
    const pauseScore = Math.min(1, pauseFrequency / maxExpectedPauseFreq);
    
    return pauseScore;
  };
  
  return (
    <>
      <canvas 
        ref={canvasRef} 
      />
      <div>
        <h3>Movement Metrics:</h3>
        <ul>
          <li>Path Straightness: {(metrics.straightness * 100).toFixed(1)}%</li>
          <li>Velocity Consistency: {(metrics.velocityConsistency * 100).toFixed(1)}%</li>
          <li>Angular Variation: {(metrics.angularVariation * 100).toFixed(1)}%</li>
          <li>Acceleration Variation: {(metrics.accelerationVariation * 100).toFixed(1)}%</li>
          <li>Pause Frequency: {(metrics.pauseFrequency * 100).toFixed(1)}%</li>
        </ul>
      </div>
      <div >
        <button onClick={() => setIsTracking(!isTracking)}>
          {isTracking ? 'Pause Tracking' : 'Resume Tracking'}
        </button>
        <button onClick={() => {
          setPoints([]);
          onScoreUpdate(0);
          setMetrics({
            straightness: 0,
            velocityConsistency: 0,
            angularVariation: 0,
            accelerationVariation: 0,
            pauseFrequency: 0
          });
        }}>
          Clear Data
        </button>
      </div>
    </>
  );
}