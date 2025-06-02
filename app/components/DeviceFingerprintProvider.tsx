'use client';

import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

// Types
interface DeviceFingerprint {
  basic: BasicInfo;
  screen: ScreenInfo;
  graphics: GraphicsInfo;
  audio: AudioInfo;
  fonts: FontInfo;
  network: NetworkInfo;
  sensors: SensorInfo;
  timezone: TimezoneInfo;
  performance: PerformanceInfo;
  privacy: PrivacyInfo;
  hash: string;
  riskScore: number;
  riskFactors: string[];
}

interface BasicInfo {
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
}

interface ScreenInfo {
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
}

interface GraphicsInfo {
  webglVendor: string;
  webglRenderer: string;
  webglVersion: string;
  webglExtensions: string[];
  canvasFingerprint: string;
  webglFingerprint: string;
  supportedFormats: string[];
}

interface AudioInfo {
  audioFingerprint: string;
  sampleRate: number;
  maxChannelCount: number;
  numberOfInputs: number;
  numberOfOutputs: number;
  baseLatency?: number;
}

interface FontInfo {
  availableFonts: string[];
  fontFingerprint: string;
  fontCount: number;
}

interface NetworkInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  online: boolean;
  ipAddress?: string;
}

interface SensorInfo {
  batteryLevel?: number;
  batteryCharging?: boolean;
  motionSupported: boolean;
  orientationSupported: boolean;
  vibrationSupported: boolean;
}

interface TimezoneInfo {
  timezone: string;
  timezoneOffset: number;
  locale: string;
  dateFormat: string;
}

interface PerformanceInfo {
  performanceNowPrecision: number;
  memoryUsed?: number;
  memoryTotal?: number;
  cpuClass?: string;
}

interface PrivacyInfo {
  adBlockDetected: boolean;
  privateBrowsing: boolean;
  webrtcLeakDetected: boolean;
  pluginsHidden: boolean;
}

interface DeviceFingerprintContextType {
  generateFingerprint: () => Promise<DeviceFingerprint>;
  getStoredFingerprint: () => DeviceFingerprint | null;
  sendFingerprint: (endpoint?: string) => Promise<void>;
}

// Create context
const DeviceFingerprintContext = createContext<DeviceFingerprintContextType | null>(null);

// Custom hook
export const useDeviceFingerprint = () => {
  const context = useContext(DeviceFingerprintContext);
  if (!context) {
    throw new Error('useDeviceFingerprint must be used within a DeviceFingerprintProvider');
  }
  return context;
};

// Provider component
export const DeviceFingerprintProvider: React.FC<{ 
  children: ReactNode; 
  apiEndpoint?: string;
}> = ({ children, apiEndpoint = '/api/device-fingerprint' }) => {
  const storedFingerprint = useRef<DeviceFingerprint | null>(null);

  // Basic system information
  const getBasicInfo = (): BasicInfo => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      languages: navigator.languages ? Array.from(navigator.languages) : [],
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      appVersion: navigator.appVersion,
      buildID: (navigator as any).buildID
    };
  };

  // Screen and display information
  const getScreenInfo = (): ScreenInfo => {
    return {
      screenWidth: screen.width,
      screenHeight: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      orientation: screen.orientation?.type
    };
  };

  // WebGL and Canvas fingerprinting
  const getGraphicsInfo = (): GraphicsInfo => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    let webglInfo = {
      webglVendor: 'unknown',
      webglRenderer: 'unknown',
      webglVersion: 'unknown',
      webglExtensions: [] as string[],
      webglFingerprint: 'unknown'
    };

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      webglInfo = {
        webglVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        webglRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        webglVersion: gl.getParameter(gl.VERSION),
        webglExtensions: gl.getSupportedExtensions() || [],
        webglFingerprint: generateWebGLFingerprint(gl)
      };
    }

    return {
      ...webglInfo,
      canvasFingerprint: generateCanvasFingerprint(ctx),
      supportedFormats: getSupportedImageFormats()
    };
  };

  // Canvas fingerprint generation
  const generateCanvasFingerprint = (ctx: CanvasRenderingContext2D | null): string => {
    if (!ctx) return 'no-canvas';
    
    const canvas = ctx.canvas;
    canvas.width = 200;
    canvas.height = 50;

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = 'red';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Device fingerprint test 🎯', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Device fingerprint test 🎯', 4, 17);

    return canvas.toDataURL();
  };

  // WebGL fingerprint generation
  const generateWebGLFingerprint = (gl: WebGLRenderingContext): string => {
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.width = 256;
    canvas.height = 128;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1, 1, 1
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    return canvas.toDataURL();
  };

  // Get supported image formats
  const getSupportedImageFormats = (): string[] => {
    const formats = ['webp', 'avif', 'jpeg', 'png'];
    const canvas = document.createElement('canvas');
    return formats.filter(format => {
      try {
        return canvas.toDataURL(`image/${format}`).startsWith(`data:image/${format}`);
      } catch {
        return false;
      }
    });
  };

  // Audio fingerprinting
  const getAudioInfo = async (): Promise<AudioInfo> => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fingerprint = await generateAudioFingerprint(audioContext);
      
      return {
        audioFingerprint: fingerprint,
        sampleRate: audioContext.sampleRate,
        maxChannelCount: audioContext.destination.maxChannelCount,
        numberOfInputs: audioContext.destination.numberOfInputs,
        numberOfOutputs: audioContext.destination.numberOfOutputs,
        baseLatency: (audioContext as any).baseLatency
      };
    } catch {
      return {
        audioFingerprint: 'audio-unavailable',
        sampleRate: 0,
        maxChannelCount: 0,
        numberOfInputs: 0,
        numberOfOutputs: 0
      };
    }
  };

  // Generate audio fingerprint
  const generateAudioFingerprint = (audioContext: AudioContext): Promise<string> => {
    return new Promise((resolve) => {
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      scriptProcessor.onaudioprocess = (event) => {
        const output = event.outputBuffer.getChannelData(0);
        const hash = Array.from(output.slice(0, 100))
          .map(x => Math.round(x * 1000))
          .join('');
        
        oscillator.disconnect();
        scriptProcessor.disconnect();
        resolve(hash.substring(0, 50));
      };

      oscillator.start(0);
      oscillator.stop(audioContext.currentTime + 0.1);
    });
  };

  // Font detection
  const getFontInfo = (): FontInfo => {
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Sans Unicode',
      'Tahoma', 'Lucida Console', 'Monaco', 'Courier', 'Bradley Hand',
      'Brush Script MT', 'Luminari', 'Chalkduster'
    ];

    const availableFonts = testFonts.filter(font => isFontAvailable(font));
    const fontFingerprint = generateFontFingerprint(availableFonts);

    return {
      availableFonts,
      fontFingerprint,
      fontCount: availableFonts.length
    };
  };

  // Check if font is available
  const isFontAvailable = (fontName: string): boolean => {
    const testString = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const testSize = '72px';
    const fallbackFont = 'monospace';

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    context.font = `${testSize} ${fallbackFont}`;
    const fallbackWidth = context.measureText(testString).width;

    context.font = `${testSize} ${fontName}, ${fallbackFont}`;
    const testWidth = context.measureText(testString).width;

    return testWidth !== fallbackWidth;
  };

  // Generate font fingerprint
  const generateFontFingerprint = (fonts: string[]): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    let fingerprint = '';
    fonts.forEach(font => {
      ctx.font = `12px ${font}`;
      const metrics = ctx.measureText('The quick brown fox jumps over the lazy dog');
      fingerprint += `${font}:${metrics.width}`;
    });

    return btoa(fingerprint).substring(0, 32);
  };

  // Network information
  const getNetworkInfo = (): NetworkInfo => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    return {
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      online: navigator.onLine
    };
  };

  // Sensor information
  const getSensorInfo = async (): Promise<SensorInfo> => {
    const info: SensorInfo = {
      motionSupported: 'DeviceMotionEvent' in window,
      orientationSupported: 'DeviceOrientationEvent' in window,
      vibrationSupported: 'vibrate' in navigator
    };

    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        info.batteryLevel = Math.round(battery.level * 100);
        info.batteryCharging = battery.charging;
      }
    } catch {
      // Battery API not available
    }

    return info;
  };

  // Timezone and locale information
  const getTimezoneInfo = (): TimezoneInfo => {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      dateFormat: new Intl.DateTimeFormat().format(new Date())
    };
  };

  // Performance information
  const getPerformanceInfo = (): PerformanceInfo => {
    const info: PerformanceInfo = {
      performanceNowPrecision: getPerformancePrecision()
    };

    // Memory information (Chrome only)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      info.memoryUsed = memory.usedJSHeapSize;
      info.memoryTotal = memory.totalJSHeapSize;
    }

    return info;
  };

  // Get performance.now() precision
  const getPerformancePrecision = (): number => {
    const start = performance.now();
    let precision = 0;
    
    for (let i = 0; i < 10; i++) {
      const time = performance.now() - start;
      const timeStr = time.toString();
      const decimalIndex = timeStr.indexOf('.');
      if (decimalIndex !== -1) {
        precision = Math.max(precision, timeStr.length - decimalIndex - 1);
      }
    }
    
    return precision;
  };

  // Privacy and security detection
  const getPrivacyInfo = (): PrivacyInfo => {
    return {
      adBlockDetected: detectAdBlock(),
      privateBrowsing: detectPrivateBrowsing(),
      webrtcLeakDetected: false, // Would need WebRTC implementation
      pluginsHidden: navigator.plugins.length === 0
    };
  };

  // Detect ad blockers
  const detectAdBlock = (): boolean => {
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbox';
    testAd.style.position = 'absolute';
    testAd.style.left = '-9999px';
    document.body.appendChild(testAd);
    
    const adBlocked = testAd.offsetHeight === 0;
    document.body.removeChild(testAd);
    
    return adBlocked;
  };

  // Detect private browsing (simplified)
  const detectPrivateBrowsing = (): boolean => {
    try {
      // Test localStorage access
      localStorage.setItem('__test__', 'test');
      localStorage.removeItem('__test__');
      return false;
    } catch {
      return true;
    }
  };

  // Calculate risk score based on anomalies
  const calculateRiskScore = (fingerprint: Omit<DeviceFingerprint, 'hash' | 'riskScore' | 'riskFactors'>): { score: number; factors: string[] } => {
    let score = 0;
    const factors: string[] = [];

    // Check for automation indicators
    if (fingerprint.basic.userAgent.includes('HeadlessChrome')) {
      score += 40;
      factors.push('Headless browser detected');
    }

    if (fingerprint.basic.userAgent.includes('PhantomJS')) {
      score += 40;
      factors.push('PhantomJS detected');
    }

    // Check for unusual hardware
    if (fingerprint.basic.hardwareConcurrency > 16) {
      score += 15;
      factors.push('Unusual CPU core count');
    }

    // Check for missing features
    if (!fingerprint.graphics.webglVendor || fingerprint.graphics.webglVendor === 'unknown') {
      score += 20;
      factors.push('WebGL not available');
    }

    // Check for privacy tools
    if (fingerprint.privacy.adBlockDetected) {
      score += 5;
      factors.push('Ad blocker detected');
    }

    if (fingerprint.privacy.privateBrowsing) {
      score += 10;
      factors.push('Private browsing mode');
    }

    // Check for unusual screen configurations
    if (fingerprint.screen.screenWidth === 1024 && fingerprint.screen.screenHeight === 768) {
      score += 10;
      factors.push('Common automation screen size');
    }

    // Check for missing fonts (automation often has fewer fonts)
    if (fingerprint.fonts.fontCount < 10) {
      score += 15;
      factors.push('Limited font selection');
    }

    // Performance timing precision (automation often has different precision)
    if (fingerprint.performance.performanceNowPrecision > 3) {
      score += 10;
      factors.push('High-precision timing');
    }

    return { score: Math.min(score, 100), factors };
  };

  // Generate comprehensive fingerprint hash
  const generateFingerprintHash = (data: Omit<DeviceFingerprint, 'hash' | 'riskScore' | 'riskFactors'>): string => {
    const hashableData = JSON.stringify(data, Object.keys(data).sort());
    return btoa(hashableData).replace(/[+/=]/g, '').substring(0, 32);
  };

  // Main fingerprint generation function
  const generateFingerprint = useCallback(async (): Promise<DeviceFingerprint> => {
    const basic = getBasicInfo();
    const screen = getScreenInfo();
    const graphics = getGraphicsInfo();
    const audio = await getAudioInfo();
    const fonts = getFontInfo();
    const network = getNetworkInfo();
    const sensors = await getSensorInfo();
    const timezone = getTimezoneInfo();
    const performance = getPerformanceInfo();
    const privacy = getPrivacyInfo();

    const partialFingerprint = {
      basic, screen, graphics, audio, fonts, 
      network, sensors, timezone, performance, privacy
    };

    const { score, factors } = calculateRiskScore(partialFingerprint);
    const hash = generateFingerprintHash(partialFingerprint);

    const fingerprint: DeviceFingerprint = {
      ...partialFingerprint,
      hash,
      riskScore: score,
      riskFactors: factors
    };

    storedFingerprint.current = fingerprint;
    return fingerprint;
  }, []);

  // Get stored fingerprint
  const getStoredFingerprint = useCallback((): DeviceFingerprint | null => {
    return storedFingerprint.current;
  }, []);

  // Send fingerprint to server
  const sendFingerprint = useCallback(async (endpoint?: string) => {
    const fingerprint = storedFingerprint.current || await generateFingerprint();
    const url = endpoint || apiEndpoint;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fingerprint),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send device fingerprint:', error);
      throw error;
    }
  }, [generateFingerprint, apiEndpoint]);

  const contextValue: DeviceFingerprintContextType = {
    generateFingerprint,
    getStoredFingerprint,
    sendFingerprint
  };

  return (
    <DeviceFingerprintContext.Provider value={contextValue}>
      {children}
    </DeviceFingerprintContext.Provider>
  );
};