'use client';

import React, { useState, useEffect } from 'react';
import { useDeviceFingerprint } from '@/app/components/DeviceFingerprintProvider';

interface DeviceFingerprint {
  basic: {
    userAgent: string;
    platform: string;
    vendor: string;
    language: string;
    languages: string[];
    cookieEnabled: boolean;
    doNotTrack: string | null;
    hardwareConcurrency: number;
    deviceMemory?: number;
    maxTouchPoints: number;
    appVersion: string;
    buildID?: string;
  };
  screen: {
    screenWidth: number;
    screenHeight: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
    devicePixelRatio: number;
    windowWidth: number;
    windowHeight: number;
    orientation?: string;
  };
  graphics: {
    webglVendor: string;
    webglRenderer: string;
    webglVersion: string;
    webglExtensions: string[];
    canvasFingerprint: string;
    webglFingerprint: string;
    supportedFormats: string[];
  };
  audio: {
    audioFingerprint: string;
    sampleRate: number;
    maxChannelCount: number;
    numberOfInputs: number;
    numberOfOutputs: number;
    baseLatency?: number;
  };
  fonts: {
    availableFonts: string[];
    fontFingerprint: string;
    fontCount: number;
  };
  network: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    online: boolean;
    ipAddress?: string;
  };
  sensors: {
    batteryLevel?: number;
    batteryCharging?: boolean;
    motionSupported: boolean;
    orientationSupported: boolean;
    vibrationSupported: boolean;
  };
  timezone: {
    timezone: string;
    timezoneOffset: number;
    locale: string;
    dateFormat: string;
  };
  performance: {
    performanceNowPrecision: number;
    memoryUsed?: number;
    memoryTotal?: number;
    cpuClass?: string;
  };
  privacy: {
    adBlockDetected: boolean;
    privateBrowsing: boolean;
    webrtcLeakDetected: boolean;
    pluginsHidden: boolean;
  };
  hash: string;
  riskScore: number;
  riskFactors: string[];
}

interface SuspiciousRule {
  category: string;
  parameter: string;
  condition: (value: any, fingerprint: DeviceFingerprint) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  points: number;
}

export default function DeviceSecurityAnalysisPage() {
  const { generateFingerprint } = useDeviceFingerprint();
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [suspiciousItems, setSuspiciousItems] = useState<Array<SuspiciousRule & { value: any }>>([]);
  const [totalRiskScore, setTotalRiskScore] = useState(0);

  // Suspicious detection rules
  const suspiciousRules: SuspiciousRule[] = [
    // Browser/User Agent Rules
    {
      category: 'Browser',
      parameter: 'userAgent',
      condition: (value) => /HeadlessChrome|PhantomJS|Selenium|WebDriver|Puppeteer|Playwright/i.test(value),
      severity: 'critical',
      description: 'Automation framework detected in user agent',
      points: 40
    },
    {
      category: 'Browser',
      parameter: 'userAgent',
      condition: (value) => value.length < 50 || value.length > 500,
      severity: 'medium',
      description: 'Unusual user agent length',
      points: 15
    },
    {
      category: 'Browser',
      parameter: 'vendor',
      condition: (value) => value === '' || value === 'unknown',
      severity: 'medium',
      description: 'Missing or unknown browser vendor',
      points: 10
    },

    // Hardware Rules
    {
      category: 'Hardware',
      parameter: 'hardwareConcurrency',
      condition: (value) => value > 32 || value === 1,
      severity: 'medium',
      description: 'Unusual CPU core count (too high or too low)',
      points: 15
    },
    {
      category: 'Hardware',
      parameter: 'deviceMemory',
      condition: (value) => value && (value > 32 || value < 1),
      severity: 'low',
      description: 'Unusual device memory configuration',
      points: 10
    },
    {
      category: 'Hardware',
      parameter: 'maxTouchPoints',
      condition: (value, fp) => value === 0 && /Mobile|Android|iPhone/i.test(fp.basic.userAgent),
      severity: 'medium',
      description: 'Mobile device claiming no touch support',
      points: 20
    },

    // Screen Rules
    {
      category: 'Screen',
      parameter: 'screen',
      condition: (_, fp) => {
        const common = [[1024, 768], [1280, 1024], [1366, 768], [1920, 1080]];
        return common.some(([w, h]) => fp.screen.screenWidth === w && fp.screen.screenHeight === h);
      },
      severity: 'low',
      description: 'Common automation screen resolution detected',
      points: 10
    },
    {
      category: 'Screen',
      parameter: 'devicePixelRatio',
      condition: (value) => value === 1.0,
      severity: 'low',
      description: 'Standard pixel ratio (common in VMs)',
      points: 5
    },
    {
      category: 'Screen',
      parameter: 'colorDepth',
      condition: (value) => value !== 24,
      severity: 'medium',
      description: 'Unusual color depth',
      points: 15
    },

    // Graphics Rules
    {
      category: 'Graphics',
      parameter: 'webglVendor',
      condition: (value) => /Brian Paul|Mesa|Software|SwiftShader/i.test(value),
      severity: 'high',
      description: 'Software rendering or emulated graphics detected',
      points: 30
    },
    {
      category: 'Graphics',
      parameter: 'webglRenderer',
      condition: (value) => /Software|Emulation|Virtual|VM|ANGLE/i.test(value),
      severity: 'high',
      description: 'Virtual or emulated graphics renderer',
      points: 25
    },
    {
      category: 'Graphics',
      parameter: 'webglExtensions',
      condition: (value) => Array.isArray(value) && value.length < 10,
      severity: 'medium',
      description: 'Limited WebGL extensions (typical of automation)',
      points: 20
    },
    {
      category: 'Graphics',
      parameter: 'canvasFingerprint',
      condition: (value) => value === 'no-canvas' || value.length < 50,
      severity: 'high',
      description: 'Canvas rendering unavailable or limited',
      points: 25
    },

    // Audio Rules
    {
      category: 'Audio',
      parameter: 'audioFingerprint',
      condition: (value) => value === 'audio-unavailable' || value.length < 10,
      severity: 'medium',
      description: 'Audio context unavailable or limited',
      points: 20
    },
    {
      category: 'Audio',
      parameter: 'sampleRate',
      condition: (value) => value === 0 || value > 192000,
      severity: 'low',
      description: 'Unusual audio sample rate',
      points: 10
    },

    // Font Rules
    {
      category: 'Fonts',
      parameter: 'fontCount',
      condition: (value) => value < 10,
      severity: 'high',
      description: 'Very limited font selection (automation indicator)',
      points: 25
    },
    {
      category: 'Fonts',
      parameter: 'availableFonts',
      condition: (value) => {
        const basicFonts = ['Arial', 'Times New Roman', 'Courier New'];
        return basicFonts.every(font => !value.includes(font));
      },
      severity: 'medium',
      description: 'Missing common system fonts',
      points: 15
    },

    // Language/Location Rules
    {
      category: 'Locale',
      parameter: 'languages',
      condition: (value) => Array.isArray(value) && value.length === 1,
      severity: 'low',
      description: 'Only one language configured',
      points: 5
    },
    {
      category: 'Locale',
      parameter: 'timezone',
      condition: (value, fp) => {
        const lang = fp.basic.language;
        if (value.includes('America') && !lang.startsWith('en') && !lang.startsWith('es') && !lang.startsWith('fr')) return true;
        if (value.includes('Europe') && lang.startsWith('zh')) return true;
        if (value.includes('Asia') && lang.startsWith('en') && !value.includes('Singapore') && !value.includes('Hong_Kong')) return true;
        return false;
      },
      severity: 'medium',
      description: 'Geographic inconsistency between timezone and language',
      points: 20
    },

    // Performance Rules
    {
      category: 'Performance',
      parameter: 'performanceNowPrecision',
      condition: (value) => value > 5 || value === 0,
      severity: 'low',
      description: 'Unusual performance timer precision',
      points: 10
    },
    {
      category: 'Performance',
      parameter: 'memoryUsed',
      condition: (value) => value && value < 1024 * 1024, // Less than 1MB
      severity: 'medium',
      description: 'Suspiciously low memory usage',
      points: 15
    },

    // Privacy Rules
    {
      category: 'Privacy',
      parameter: 'pluginsHidden',
      condition: (value) => value === true,
      severity: 'medium',
      description: 'Browser plugins are hidden or disabled',
      points: 15
    },
    {
      category: 'Privacy',
      parameter: 'cookieEnabled',
      condition: (value) => value === false,
      severity: 'low',
      description: 'Cookies are disabled',
      points: 5
    },

    // Network Rules
    {
      category: 'Network',
      parameter: 'online',
      condition: (value) => value === false,
      severity: 'low',
      description: 'Browser reports offline status',
      points: 5
    },

    // Sensor Rules
    {
      category: 'Sensors',
      parameter: 'sensors',
      condition: (_, fp) => {
        return !fp.sensors.motionSupported && 
               !fp.sensors.orientationSupported && 
               !fp.sensors.vibrationSupported;
      },
      severity: 'medium',
      description: 'No device sensors available (desktop/VM indicator)',
      points: 10
    }
  ];

  // Generate fingerprint on mount
  useEffect(() => {
    handleGenerateFingerprint();
  }, []);

  const handleGenerateFingerprint = async () => {
    setLoading(true);
    try {
      const fp = await generateFingerprint();
      setFingerprint(fp);
      analyzeSuspiciousItems(fp);
      console.log('=== DEVICE SECURITY ANALYSIS ===');
      console.log('Fingerprint:', fp);
    } catch (error) {
      console.error('Failed to generate fingerprint:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeSuspiciousItems = (fp: DeviceFingerprint) => {
    const detected: Array<SuspiciousRule & { value: any }> = [];
    let totalPoints = 0;

    suspiciousRules.forEach(rule => {
      let value: any;
      
      // Extract the value based on the parameter path
      switch (rule.parameter) {
        case 'userAgent':
          value = fp.basic.userAgent;
          break;
        case 'vendor':
          value = fp.basic.vendor;
          break;
        case 'hardwareConcurrency':
          value = fp.basic.hardwareConcurrency;
          break;
        case 'deviceMemory':
          value = fp.basic.deviceMemory;
          break;
        case 'maxTouchPoints':
          value = fp.basic.maxTouchPoints;
          break;
        case 'screen':
          value = fp.screen;
          break;
        case 'devicePixelRatio':
          value = fp.screen.devicePixelRatio;
          break;
        case 'colorDepth':
          value = fp.screen.colorDepth;
          break;
        case 'webglVendor':
          value = fp.graphics.webglVendor;
          break;
        case 'webglRenderer':
          value = fp.graphics.webglRenderer;
          break;
        case 'webglExtensions':
          value = fp.graphics.webglExtensions;
          break;
        case 'canvasFingerprint':
          value = fp.graphics.canvasFingerprint;
          break;
        case 'audioFingerprint':
          value = fp.audio.audioFingerprint;
          break;
        case 'sampleRate':
          value = fp.audio.sampleRate;
          break;
        case 'fontCount':
          value = fp.fonts.fontCount;
          break;
        case 'availableFonts':
          value = fp.fonts.availableFonts;
          break;
        case 'languages':
          value = fp.basic.languages;
          break;
        case 'timezone':
          value = fp.timezone.timezone;
          break;
        case 'performanceNowPrecision':
          value = fp.performance.performanceNowPrecision;
          break;
        case 'memoryUsed':
          value = fp.performance.memoryUsed;
          break;
        case 'pluginsHidden':
          value = fp.privacy.pluginsHidden;
          break;
        case 'cookieEnabled':
          value = fp.basic.cookieEnabled;
          break;
        case 'online':
          value = fp.network.online;
          break;
        case 'sensors':
          value = fp.sensors;
          break;
        default:
          value = null;
      }

      if (rule.condition(value, fp)) {
        detected.push({ ...rule, value });
        totalPoints += rule.points;
      }
    });

    setSuspiciousItems(detected);
    setTotalRiskScore(Math.min(totalPoints, 100));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  };

  const getRiskLevel = (score: number) => {
    if (score < 30) return { level: 'Low Risk', color: 'text-green-600', bg: 'bg-green-100' };
    if (score < 60) return { level: 'Medium Risk', color: 'text-orange-600', bg: 'bg-orange-100' };
    if (score < 80) return { level: 'High Risk', color: 'text-red-600', bg: 'bg-red-100' };
    return { level: 'Critical Risk', color: 'text-red-800', bg: 'bg-red-200' };
  };

  const formatValue = (value: any, maxLength: number = 50): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') return 'Object';
    const str = String(value);
    return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
  };

  const isParameterSuspicious = (category: string, parameter: string): boolean => {
    return suspiciousItems.some(item => item.category === category && item.parameter === parameter);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Analyzing Device Security</h2>
          <p className="text-gray-600">Collecting and analyzing device parameters...</p>
        </div>
      </div>
    );
  }

  if (!fingerprint) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Analysis Failed</h2>
          <p className="text-red-600 mb-4">Unable to generate device fingerprint</p>
          <button
            onClick={handleGenerateFingerprint}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  const risk = getRiskLevel(totalRiskScore);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Device Security Analysis Dashboard
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Comprehensive analysis of device characteristics with automatic detection of suspicious patterns and automation indicators.
        </p>
      </div>

      {/* Risk Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Security Risk Assessment</h2>
          <button
            onClick={handleGenerateFingerprint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh Analysis
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="50" fill="none" strokeWidth="8"
                  stroke={totalRiskScore < 30 ? '#10b981' : totalRiskScore < 60 ? '#f59e0b' : '#ef4444'}
                  strokeDasharray={`${totalRiskScore * 3.14} 314`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalRiskScore}%</div>
                  <div className="text-xs text-gray-600">Risk Score</div>
                </div>
              </div>
            </div>
            <div className={`inline-block px-3 py-1 rounded-full font-semibold ${risk.bg} ${risk.color}`}>
              {risk.level}
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {suspiciousItems.length}
            </div>
            <div className="text-lg font-semibold">Suspicious Parameters</div>
            <div className="text-sm text-gray-600">Security Issues Detected</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {fingerprint.hash.substring(0, 8)}...
            </div>
            <div className="text-lg font-semibold">Device ID</div>
            <div className="text-sm text-gray-600">Unique Fingerprint</div>
          </div>
        </div>

        {/* Suspicious Items Alert */}
        {suspiciousItems.length > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-3">🚨 Security Alerts ({suspiciousItems.length})</h3>
            <div className="space-y-2">
              {suspiciousItems.slice(0, 5).map((item, index) => (
                <div key={index} className={`flex items-center justify-between p-2 rounded border ${getSeverityColor(item.severity)}`}>
                  <div className="flex items-center">
                    <span className="mr-2">{getSeverityIcon(item.severity)}</span>
                    <span className="font-medium">{item.category}:</span>
                    <span className="ml-1">{item.description}</span>
                  </div>
                  <span className="font-bold">+{item.points}pts</span>
                </div>
              ))}
              {suspiciousItems.length > 5 && (
                <div className="text-red-600 text-sm">
                  ...and {suspiciousItems.length - 5} more issues
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Device Parameters Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Basic System Information
          </h3>
          <div className="space-y-3">
            {Object.entries(fingerprint.basic).map(([key, value]) => (
              <div key={key} className={`flex justify-between items-center p-2 rounded ${
                isParameterSuspicious('Browser', key) || isParameterSuspicious('Hardware', key) || isParameterSuspicious('Locale', key) 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <span className="font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 text-sm text-right max-w-md">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Screen & Display */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Screen & Display Properties
          </h3>
          <div className="space-y-3">
            {Object.entries(fingerprint.screen).map(([key, value]) => (
              <div key={key} className={`flex justify-between items-center p-2 rounded ${
                isParameterSuspicious('Screen', key) 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <span className="font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 text-sm">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Graphics Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
            Graphics & WebGL
          </h3>
          <div className="space-y-3">
            {Object.entries(fingerprint.graphics).map(([key, value]) => (
              <div key={key} className={`flex justify-between items-center p-2 rounded ${
                isParameterSuspicious('Graphics', key) 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <span className="font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 text-sm text-right max-w-md">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audio Context */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Audio Context Analysis
          </h3>
          <div className="space-y-3">
            {Object.entries(fingerprint.audio).map(([key, value]) => (
              <div key={key} className={`flex justify-between items-center p-2 rounded ${
                isParameterSuspicious('Audio', key) 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <span className="font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 text-sm text-right max-w-md">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Font Detection */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            Font Analysis
          </h3>
          <div className="space-y-3">
            <div className={`flex justify-between items-center p-2 rounded ${
              isParameterSuspicious('Fonts', 'fontCount') 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-gray-50'
            }`}>
              <span className="font-medium text-gray-700">Font Count:</span>
              <span className="text-gray-900">{fingerprint.fonts.fontCount}</span>
            </div>
            <div className={`p-2 rounded ${
              isParameterSuspicious('Fonts', 'availableFonts') 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-gray-50'
            }`}>
              <span className="font-medium text-gray-700 block mb-2">Available Fonts:</span>
              <div className="max-h-32 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {fingerprint.fonts.availableFonts.map((font, index) => (
                    <div key={index} className="text-gray-600">• {font}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-gray-50">
              <span className="font-medium text-gray-700">Font Fingerprint:</span>
              <span className="text-gray-900 text-xs">{fingerprint.fonts.fontFingerprint}</span>
            </div>
          </div>
        </div>

        {/* Network Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
            Network Properties
          </h3>
          <div className="space-y-3">
            {Object.entries(fingerprint.network).map(([key, value]) => (
              <div key={key} className={`flex justify-between items-center p-2 rounded ${
                isParameterSuspicious('Network', key) 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <span className="font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 text-sm">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensors Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-pink-500 rounded-full mr-2"></span>
            Hardware Sensors
          </h3>
          <div className="space-y-3">
            {Object.entries(fingerprint.sensors).map(([key, value]) => (
              <div key={key} className={`flex justify-between items-center p-2 rounded ${
                isParameterSuspicious('Sensors', key) 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <span className="font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 text-sm">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timezone & Locale */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-teal-500 rounded-full mr-2"></span>
            Timezone & Locale
          </h3>
          <div className="space-y-3">
            {Object.entries(fingerprint.timezone).map(([key, value]) => (
              <div key={key} className={`flex justify-between items-center p-2 rounded ${
                isParameterSuspicious('Locale', key) 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <span className="font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 text-sm">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
            Performance Metrics
          </h3>
          <div className="space-y-3">
            {Object.entries(fingerprint.performance).map(([key, value]) => (
              <div key={key} className={`flex justify-between items-center p-2 rounded ${
                isParameterSuspicious('Performance', key) 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <span className="font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 text-sm">
                  {key === 'memoryUsed' || key === 'memoryTotal' 
                    ? (typeof value === 'number' ? `${Math.round(value / 1024 / 1024)} MB` : 'N/A')
                    : formatValue(value)
                  }
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
            Privacy & Security
          </h3>
          <div className="space-y-3">
            {Object.entries(fingerprint.privacy).map(([key, value]) => (
              <div key={key} className={`flex justify-between items-center p-2 rounded ${
                isParameterSuspicious('Privacy', key) 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <span className="font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-gray-900 text-sm">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Suspicious Items Analysis */}
      {suspiciousItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🔍 Detailed Security Analysis</h3>
          <div className="space-y-4">
            {suspiciousItems.map((item, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(item.severity)}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{getSeverityIcon(item.severity)}</span>
                    <div>
                      <div className="font-semibold">
                        {item.category} - {item.parameter.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-sm opacity-90">{item.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">+{item.points}</div>
                    <div className="text-xs opacity-75">risk points</div>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-white bg-opacity-50 rounded">
                  <span className="text-xs font-medium">Detected Value: </span>
                  <code className="text-xs">{formatValue(item.value, 100)}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fingerprint Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">🔐 Fingerprint Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{fingerprint.fonts.fontCount}</div>
            <div className="text-sm text-blue-800">Available Fonts</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{fingerprint.graphics.webglExtensions.length}</div>
            <div className="text-sm text-green-800">WebGL Extensions</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{fingerprint.basic.hardwareConcurrency}</div>
            <div className="text-sm text-purple-800">CPU Cores</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{fingerprint.basic.languages.length}</div>
            <div className="text-sm text-orange-800">Languages</div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Device Fingerprint Hash:</span>
            <button 
              onClick={() => navigator.clipboard.writeText(fingerprint.hash)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              📋 Copy
            </button>
          </div>
          <code className="text-sm bg-white p-2 rounded border w-full block overflow-x-auto">
            {fingerprint.hash}
          </code>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">📊 Risk Assessment Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3">Severity Levels</h4>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-xl mr-2">🚨</span>
                <span className="px-2 py-1 rounded text-sm bg-red-100 border-red-300 text-red-800 mr-2">Critical</span>
                <span className="text-sm">30-40 points - Automation detected</span>
              </div>
              <div className="flex items-center">
                <span className="text-xl mr-2">⚠️</span>
                <span className="px-2 py-1 rounded text-sm bg-orange-100 border-orange-300 text-orange-800 mr-2">High</span>
                <span className="text-sm">20-30 points - Strong indicators</span>
              </div>
              <div className="flex items-center">
                <span className="text-xl mr-2">⚡</span>
                <span className="px-2 py-1 rounded text-sm bg-yellow-100 border-yellow-300 text-yellow-800 mr-2">Medium</span>
                <span className="text-sm">10-20 points - Suspicious patterns</span>
              </div>
              <div className="flex items-center">
                <span className="text-xl mr-2">ℹ️</span>
                <span className="px-2 py-1 rounded text-sm bg-blue-100 border-blue-300 text-blue-800 mr-2">Low</span>
                <span className="text-sm">5-10 points - Minor anomalies</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Parameter Highlighting</h4>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"></div>
                <span className="text-sm">Suspicious parameter detected by security rules</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-50 rounded mr-2"></div>
                <span className="text-sm">Normal parameter - no issues detected</span>
              </div>
            </div>
            <div className="mt-4">
              <h5 className="font-medium mb-2">Common Automation Indicators:</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Headless browser signatures</li>
                <li>• Virtual graphics rendering</li>
                <li>• Limited font collections</li>
                <li>• Geographic inconsistencies</li>
                <li>• Missing device sensors</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Console Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-blue-800">
          <strong>Developer Console:</strong> Open your browser's developer console (F12) to see the complete device fingerprint data and analysis details.
        </p>
      </div>
    </div>
  );
}