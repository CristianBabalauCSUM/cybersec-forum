// Enhanced Trust Scoring Provider with BotD Integration
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// @ts-ignore
import BotD from '@fingerprintjs/botd';

interface TrustScore {
  overall: number; // 0-100 trust score
  components: {
    device: number;      // Device fingerprint trust
    botDetection: number; // Bot detection confidence
    consistency: number;  // Cross-session consistency
  };
  riskFactors: string[];
  lastUpdated: number;
}

interface TrustScoringContextType {
  trustScore: TrustScore;
  isAnalyzing: boolean;
  refreshTrustScore: () => Promise<void>;
  getTrustLevel: () => 'very-high' | 'high' | 'medium' | 'low' | 'very-low';
}

const TrustScoringContext = createContext<TrustScoringContextType | null>(null);

export const useTrustScore = () => {
  const context = useContext(TrustScoringContext);
  if (!context) {
    throw new Error('useTrustScore must be used within TrustScoringProvider');
  }
  return context;
};

interface TrustScoringProviderProps {
  children: React.ReactNode;
  // Import your existing providers
  deviceFingerprint?: any;
  keystrokeAnalysis?: any;
  mouseAnalysis?: any;
}

export const TrustScoringProvider: React.FC<TrustScoringProviderProps> = ({ 
  children,
  deviceFingerprint,
  keystrokeAnalysis,
  mouseAnalysis
}) => {
  const [trustScore, setTrustScore] = useState<TrustScore>({
    overall: 50,
    components: {
      device: 50,
      botDetection: 50,
      consistency: 50
    },
    riskFactors: [],
    lastUpdated: Date.now()
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [botDetector, setBotDetector] = useState<any>(null);

  // Initialize BotD
  useEffect(() => {
    const initBotD = async () => {
      try {
        const botd = await BotD.load();
        setBotDetector(botd);
        console.log('BotD initialized successfully');
      } catch (error) {
        console.error('Failed to initialize BotD:', error);
      }
    };

    initBotD();
  }, []);

  // Calculate device trust score
  const calculateDeviceTrust = useCallback((fingerprint: any): number => {
    if (!fingerprint) return 50;

    let score = 100;
    const riskFactors: string[] = [];

    // Penalize automation indicators
    if (fingerprint.riskScore) {
      score -= fingerprint.riskScore;
      if (fingerprint.riskScore > 70) {
        riskFactors.push('High automation risk');
      }
    }

    // Reward device consistency
    if (fingerprint.fonts?.fontCount > 20) {
      score += 5; // Rich font environment
    }

    if (fingerprint.graphics?.webglExtensions?.length > 15) {
      score += 5; // Rich graphics capabilities
    }

    // Penalize VM/headless indicators
    if (fingerprint.privacy?.pluginsHidden) {
      score -= 10;
      riskFactors.push('Hidden browser plugins');
    }

    return Math.max(0, Math.min(100, score));
  }, []);

  // Calculate behavior trust score

  // Calculate bot detection trust score using BotD
  const calculateBotDetectionTrust = useCallback(async (): Promise<{ score: number; factors: string[] }> => {
    if (!botDetector) return { score: 50, factors: [] };

    try {
      const result = await botDetector.detect();
      const riskFactors: string[] = [];
      
      let score = 100;

      if (result.bot) {
        score = 0;
        riskFactors.push('BotD detected automation');
      } else {
        score = 90; // High confidence human
      }

      // Additional BotD analysis
      if (result.automationTool) {
        score -= 40;
        riskFactors.push(`Automation tool: ${result.automationTool}`);
      }

      if (result.searchBot) {
        score -= 20;
        riskFactors.push('Search bot detected');
      }

      return { score: Math.max(0, score), factors: riskFactors };
    } catch (error) {
      console.error('BotD detection failed:', error);
      return { score: 50, factors: ['BotD analysis failed'] };
    }
  }, [botDetector]);

  // Calculate session consistency
  const calculateConsistencyTrust = useCallback((): number => {
    // Check for stored trust history
    const storedHistory = localStorage.getItem('trustHistory');
    if (!storedHistory) return 50;

    try {
      const history = JSON.parse(storedHistory);
      const recentScores = history.slice(-5); // Last 5 sessions
      
      if (recentScores.length < 2) return 50;

      // Calculate variance in trust scores
      const avg = recentScores.reduce((sum: number, score: number) => sum + score, 0) / recentScores.length;
      const variance = recentScores.reduce((sum: number, score: number) => sum + Math.pow(score - avg, 2), 0) / recentScores.length;
      
      // Low variance = high consistency = higher trust
      if (variance < 100) return Math.min(100, avg + 10);
      if (variance > 500) return Math.max(0, avg - 20);
      
      return avg;
    } catch {
      return 50;
    }
  }, []);

  // Main trust score calculation
  const refreshTrustScore = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      console.log('=== CALCULATING TRUST SCORE ===');
      
      // Calculate component scores
      const deviceScore = calculateDeviceTrust(deviceFingerprint);
      const { score: botScore, factors: botFactors } = await calculateBotDetectionTrust();
      const consistencyScore = calculateConsistencyTrust();

      // Weighted overall score
      const weights = {
        device: 0.50,
        botDetection: 0.40,
        consistency: 0.10
      };

      const overall = Math.round(
        deviceScore * weights.device +
        botScore * weights.botDetection +
        consistencyScore * weights.consistency
      );

      // Collect all risk factors
      const allRiskFactors: string[] = [...botFactors];
      
      if (deviceScore < 50) allRiskFactors.push('Device fingerprint suspicious');
      if (consistencyScore < 50) allRiskFactors.push('Inconsistent session history');

      const newTrustScore: TrustScore = {
        overall,
        components: {
          device: Math.round(deviceScore),
          botDetection: Math.round(botScore),
          consistency: Math.round(consistencyScore)
        },
        riskFactors: allRiskFactors,
        lastUpdated: Date.now()
      };

      setTrustScore(newTrustScore);

      // Store in history for consistency tracking
      try {
        const history = JSON.parse(localStorage.getItem('trustHistory') || '[]');
        history.push(overall);
        if (history.length > 10) history.shift(); // Keep last 10
        localStorage.setItem('trustHistory', JSON.stringify(history));
      } catch (error) {
        console.warn('Failed to store trust history:', error);
      }

      console.log('Trust Score Updated:', newTrustScore);
      console.log('================================');
      
    } catch (error) {
      console.error('Trust score calculation failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [deviceFingerprint, keystrokeAnalysis, mouseAnalysis, calculateDeviceTrust, calculateBotDetectionTrust, calculateConsistencyTrust]);

  // Auto-refresh trust score
  useEffect(() => {
    // Initial calculation
    refreshTrustScore();

    // Refresh every 30 seconds
    const interval = setInterval(refreshTrustScore, 30000);
    return () => clearInterval(interval);
  }, [refreshTrustScore]);

  // Get trust level category
  const getTrustLevel = useCallback((): 'very-high' | 'high' | 'medium' | 'low' | 'very-low' => {
    const score = trustScore.overall;
    if (score >= 90) return 'very-high';
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'low';
    return 'very-low';
  }, [trustScore.overall]);

  const contextValue: TrustScoringContextType = {
    trustScore,
    isAnalyzing,
    refreshTrustScore,
    getTrustLevel
  };

  return (
    <TrustScoringContext.Provider value={contextValue}>
      {children}
    </TrustScoringContext.Provider>
  );
};

// Trust Score Debug Component
export const TrustScoreDebug: React.FC = () => {
  const { trustScore, isAnalyzing, getTrustLevel } = useTrustScore();
  
  const trustLevel = getTrustLevel();
  const getColorForScore = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '250px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '11px',
      zIndex: 9999,
      pointerEvents: 'none',
      fontFamily: 'monospace',
      minWidth: '200px',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Header */}
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>User Trust Score</span>
        {isAnalyzing && (
          <span style={{ color: '#60a5fa', fontSize: '10px' }}>⚡</span>
        )}
      </div>

      {/* Overall Score */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '4px'
        }}>
          <span>Overall Trust:</span>
          <span style={{ 
            color: getColorForScore(trustScore.overall),
            fontWeight: 'bold'
          }}>
            {trustScore.overall}%
          </span>
        </div>
        
        {/* Trust Level Badge */}
        <div style={{
          background: getColorForScore(trustScore.overall),
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '9px',
          textAlign: 'center',
          textTransform: 'uppercase'
        }}>
          {trustLevel.replace('-', ' ')} Trust
        </div>
      </div>

      {/* Component Scores */}
      <div style={{ fontSize: '10px', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Components:</div>
        <div>Device: <span style={{ color: getColorForScore(trustScore.components.device) }}>{trustScore.components.device}%</span></div>
        <div>Bot Detection: <span style={{ color: getColorForScore(trustScore.components.botDetection) }}>{trustScore.components.botDetection}%</span></div>
        <div>Consistency: <span style={{ color: getColorForScore(trustScore.components.consistency) }}>{trustScore.components.consistency}%</span></div>
      </div>

      {/* Risk Factors */}
      {trustScore.riskFactors.length > 0 && (
        <div style={{ 
          fontSize: '9px', 
          borderTop: '1px solid #444', 
          paddingTop: '6px',
          marginBottom: '6px'
        }}>
          <div style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: '3px' }}>
            ⚠️ Risk Factors:
          </div>
          <div style={{ maxHeight: '50px', overflowY: 'auto' }}>
            {trustScore.riskFactors.slice(0, 3).map((factor, index) => (
              <div key={index} style={{ marginBottom: '1px' }}>
                • {factor}
              </div>
            ))}
            {trustScore.riskFactors.length > 3 && (
              <div style={{ color: '#888' }}>
                ...and {trustScore.riskFactors.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Update */}
      <div style={{ 
        fontSize: '8px', 
        opacity: 0.6,
        borderTop: '1px solid #444',
        paddingTop: '4px'
      }}>
        Updated: {new Date(trustScore.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
};