// app/(laboratory-environment)/mouse-tracker/page.tsx
"use client";

import { useState, useEffect } from 'react';
import MouseTracker from './MouseTracker';

export default function MouseTrackerPage() {
  const [botProbability, setBotProbability] = useState<number>(0);
  
  return (
    <div className="mouse-tracker-container">
      <h1>Mouse Movement Analysis</h1>
      <div className="score-display">
        <h2>Bot Probability: {botProbability.toFixed(2)}%</h2>
      </div>
      <MouseTracker onScoreUpdate={setBotProbability} />
      <div className="instruction-panel">
        <p>Move your mouse naturally around the screen to generate a bot probability score.</p>
      </div>
    </div>
  );
}