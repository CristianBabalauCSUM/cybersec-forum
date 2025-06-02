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
  contextState: string;
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

  // Modern audio fingerprinting using AudioWorklet
  const getAudioInfo = async (): Promise<AudioInfo> => {
    try {
      // Create AudioContext without auto-starting
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const info: AudioInfo = {
        audioFingerprint: 'audio-unavailable',
        sampleRate: audioContext.sampleRate,
        maxChannelCount: audioContext.destination.maxChannelCount,
        numberOfInputs: audioContext.destination.numberOfInputs,
        numberOfOutputs: audioContext.destination.numberOfOutputs,
        baseLatency: (audioContext as any).baseLatency,
        contextState: audioContext.state
      };

      // Only try to generate fingerprint if context is allowed to start
      if (audioContext.state === 'running' || audioContext.state === 'suspended') {
        try {
          // Use offline context for fingerprinting to avoid user gesture requirement
          const offlineContext = new OfflineAudioContext(1, 44100, 44100);
          const fingerprint = await generateOfflineAudioFingerprint(offlineContext);
          info.audioFingerprint = fingerprint;
        } catch (error) {
          console.warn('Audio fingerprinting failed:', error);
          info.audioFingerprint = 'fingerprint-failed';
        }
      }

      // Clean up
      if (audioContext.state !== 'closed') {
        await audioContext.close();
      }

      return info;
    } catch (error) {
      console.warn('Audio context creation failed:', error);
      return {
        audioFingerprint: 'audio-unavailable',
        sampleRate: 0,
        maxChannelCount: 0,
        numberOfInputs: 0,
        numberOfOutputs: 0,
        contextState: 'unavailable'
      };
    }
  };

  // Generate audio fingerprint using OfflineAudioContext (no user gesture required)
  const generateOfflineAudioFingerprint = (offlineContext: OfflineAudioContext): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const oscillator = offlineContext.createOscillator();
        const analyser = offlineContext.createAnalyser();
        const gainNode = offlineContext.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(10000, offlineContext.currentTime);
        gainNode.gain.setValueAtTime(0.01, offlineContext.currentTime);

        oscillator.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(offlineContext.destination);

        oscillator.start(0);
        oscillator.stop(0.1);

        offlineContext.startRendering().then((renderedBuffer) => {
          const output = renderedBuffer.getChannelData(0);
          const hash = Array.from(output.slice(0, 100))
            .map(x => Math.round(x * 1000000))
            .join('');
          
          resolve(hash.substring(0, 50));
        }).catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  };

  // Enhanced font detection with more comprehensive list
  const getFontInfo = (): FontInfo => {
    const testFonts = [
      // Common system fonts
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Sans Unicode',
      'Tahoma', 'Lucida Console', 'Monaco', 'Courier', 'Bradley Hand',
      'Brush Script MT', 'Luminari', 'Chalkduster',
      
      // Windows fonts
      'Calibri', 'Cambria', 'Consolas', 'Constantia', 'Corbel',
      'Candara', 'Franklin Gothic Medium', 'Gabriola', 'Malgun Gothic',
      'Microsoft Sans Serif', 'MS Gothic', 'MS PGothic', 'MS UI Gothic',
      'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Segoe Print',
      'Segoe Script', 'Segoe UI', 'Segoe UI Historic', 'Segoe UI Symbol',
      'Sitka', 'Sylfaen', 'Yu Gothic',
      
      // macOS fonts
      'American Typewriter', 'Andale Mono', 'Apple Chancery', 'Apple Color Emoji',
      'Apple SD Gothic Neo', 'Arial Hebrew', 'Arial Rounded MT Bold',
      'Avenir', 'Avenir Next', 'Baskerville', 'Big Caslon', 'Bodoni 72',
      'Copperplate', 'Didot', 'Futura', 'Geneva', 'Gill Sans',
      'Helvetica Neue', 'Herculanum', 'Hoefler Text', 'Lucida Grande',
      'Marker Felt', 'Menlo', 'Optima', 'Papyrus', 'Phosphate',
      'Rockwell', 'Savoye LET', 'SignPainter', 'Skia', 'Snell Roundhand',
      'Zapfino',
      
      // Linux fonts
      'Liberation Sans', 'Liberation Serif', 'Liberation Mono',
      'DejaVu Sans', 'DejaVu Serif', 'DejaVu Sans Mono',
      'Ubuntu', 'Ubuntu Mono', 'Droid Sans', 'Droid Serif', 'Droid Sans Mono',
      'Noto Sans', 'Noto Serif', 'Source Sans Pro', 'Source Serif Pro'
    ];

    const availableFonts = testFonts.filter(font => isFontAvailable(font));
    const fontFingerprint = generateFontFingerprint(availableFonts);

    return {
      availableFonts,
      fontFingerprint,
      fontCount: availableFonts.length
    };
  };

  // Improved font detection
  const isFontAvailable = (fontName: string): boolean => {
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const fallbackFonts = ['monospace', 'sans-serif', 'serif'];

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Test against multiple fallback fonts for better accuracy
    for (const fallbackFont of fallbackFonts) {
      context.font = `${testSize} ${fallbackFont}`;
      const fallbackWidth = context.measureText(testString).width;

      context.font = `${testSize} "${fontName}", ${fallbackFont}`;
      const testWidth = context.measureText(testString).width;

      if (testWidth !== fallbackWidth) {
        return true;
      }
    }

    return false;
  };

  // Generate font fingerprint
  const generateFontFingerprint = (fonts: string[]): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    let fingerprint = '';
    fonts.slice(0, 20).forEach(font => { // Limit to first 20 fonts for performance
      ctx.font = `12px "${font}"`;
      const metrics = ctx.measureText('The quick brown fox jumps over the lazy dog');
      fingerprint += `${font}:${metrics.width.toFixed(2)};`;
    });

    return btoa(fingerprint).replace(/[+/=]/g, '').substring(0, 32);
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

  // Enhanced sensor information
  const getSensorInfo = async (): Promise<SensorInfo> => {
    const info: SensorInfo = {
      motionSupported: 'DeviceMotionEvent' in window && typeof (DeviceMotionEvent as any).requestPermission !== 'function',
      orientationSupported: 'DeviceOrientationEvent' in window && typeof (DeviceOrientationEvent as any).requestPermission !== 'function',
      vibrationSupported: 'vibrate' in navigator
    };

    // Check for iOS permission-based sensors
    if ('DeviceMotionEvent' in window && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      info.motionSupported = false; // Will require permission
    }

    if ('DeviceOrientationEvent' in window && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      info.orientationSupported = false; // Will require permission
    }

    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        info.batteryLevel = Math.round(battery.level * 100);
        info.batteryCharging = battery.charging;
      }
    } catch {
      // Battery API not available or blocked
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

  // Enhanced performance information
  const getPerformanceInfo = (): PerformanceInfo => {
    const info: PerformanceInfo = {
      performanceNowPrecision: getPerformancePrecision()
    };

    // Memory information (Chrome/Edge only)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      info.memoryUsed = memory.usedJSHeapSize;
      info.memoryTotal = memory.totalJSHeapSize;
    }

    // CPU class (IE only, but useful for fingerprinting)
    if ('cpuClass' in navigator) {
      info.cpuClass = (navigator as any).cpuClass;
    }

    return info;
  };

  // Get performance.now() precision
  const getPerformancePrecision = (): number => {
    const measurements: number[] = [];
    
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      // Small delay
      for (let j = 0; j < 1000; j++) {
        Math.random();
      }
      const end = performance.now();
      measurements.push(end - start);
    }
    
    // Calculate precision based on decimal places
    const precisions = measurements.map(time => {
      const timeStr = time.toString();
      const decimalIndex = timeStr.indexOf('.');
      return decimalIndex !== -1 ? timeStr.length - decimalIndex - 1 : 0;
    });
    
    return Math.max(...precisions);
  };

// Enhanced privacy and security detection
  const getPrivacyInfo = (): PrivacyInfo => {
    return {
      adBlockDetected: detectAdBlock(),
      privateBrowsing: detectPrivateBrowsing(),
      webrtcLeakDetected: false, // Could be implemented with WebRTC
      pluginsHidden: navigator.plugins.length === 0 || !navigator.plugins
    };
  };

  // Enhanced ad blocker detection
  const detectAdBlock = (): boolean => {
    try {
      // Create multiple test elements with different ad-like characteristics
      const testElements = [
        { className: 'adsbox', id: 'ads' },
        { className: 'ad-banner', id: 'google-ads' },
        { className: 'advertisement', id: 'doubleclick' },
        { className: 'sponsor', id: 'sponsored-content' }
      ];

      for (const testConfig of testElements) {
        const testAd = document.createElement('div');
        testAd.innerHTML = '&nbsp;';
        testAd.className = testConfig.className;
        testAd.id = testConfig.id;
        testAd.style.position = 'absolute';
        testAd.style.left = '-9999px';
        testAd.style.width = '1px';
        testAd.style.height = '1px';
        
        document.body.appendChild(testAd);
        
        const isBlocked = testAd.offsetHeight === 0 || 
                         testAd.offsetWidth === 0 || 
                         !testAd.offsetParent;
        
        document.body.removeChild(testAd);
        
        if (isBlocked) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  };

  // Enhanced private browsing detection
  const detectPrivateBrowsing = (): boolean => {
    try {
      // Multiple detection methods
      
      try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
      } catch {
        return true;
      }

      if (!window.indexedDB) {
        return true;
      }

      // Method 3: Safari-specific test
      if ('safariIncognito' in window && (window as any).safariIncognito) {
        return true;
      }

      // Method 4: Chrome FileSystem API test
      if ('webkitRequestFileSystem' in window) {
        try {
          (window as any).webkitRequestFileSystem(
            0, 1,
            () => {},
            () => { return true; }
          );
        } catch {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  // Enhanced risk score calculation with better bot detection
  const calculateRiskScore = (fingerprint: Omit<DeviceFingerprint, 'hash' | 'riskScore' | 'riskFactors'>): { score: number; factors: string[] } => {
    let score = 0;
    const factors: string[] = [];

    // Critical automation indicators
    const userAgent = fingerprint.basic.userAgent.toLowerCase();
    const criticalBotSignatures = [
      'headlesschrome', 'phantomjs', 'selenium', 'webdriver', 
      'puppeteer', 'playwright', 'chromedriver', 'geckodriver'
    ];

    for (const signature of criticalBotSignatures) {
      if (userAgent.includes(signature)) {
        score += 50;
        factors.push(`${signature} detected in user agent`);
      }
    }

    // WebDriver detection
    if ((window as any).webdriver || (navigator as any).webdriver) {
      score += 40;
      factors.push('WebDriver property detected');
    }

    // Phantom.js specific detection
    if ((window as any).callPhantom || (window as any)._phantom) {
      score += 40;
      factors.push('PhantomJS environment detected');
    }

    // Graphics/WebGL suspicious patterns
    const renderer = fingerprint.graphics.webglRenderer.toLowerCase();
    const vendor = fingerprint.graphics.webglVendor.toLowerCase();
    
    if (renderer.includes('swiftshader') || renderer.includes('llvmpipe') || 
        renderer.includes('mesa') || vendor.includes('brian paul')) {
      score += 30;
      factors.push('Software rendering detected');
    }

    // Hardware inconsistencies
    if (fingerprint.basic.hardwareConcurrency === 1 && 
        !userAgent.includes('mobile') && !userAgent.includes('android')) {
      score += 20;
      factors.push('Single core on non-mobile device');
    }

    if (fingerprint.basic.hardwareConcurrency > 32) {
      score += 15;
      factors.push('Unusually high CPU core count');
    }

    // Font limitations (strong bot indicator)
    if (fingerprint.fonts.fontCount < 5) {
      score += 30;
      factors.push('Very limited font selection');
    } else if (fingerprint.fonts.fontCount < 15) {
      score += 15;
      factors.push('Limited font selection');
    }

    // Screen resolution patterns
    const commonBotResolutions = [
      [1024, 768], [1280, 1024], [800, 600], [1366, 768]
    ];
    
    if (commonBotResolutions.some(([w, h]) => 
        fingerprint.screen.screenWidth === w && fingerprint.screen.screenHeight === h)) {
      score += 10;
      factors.push('Common automation screen resolution');
    }

    // Canvas fingerprinting issues
    if (fingerprint.graphics.canvasFingerprint === 'no-canvas' || 
        fingerprint.graphics.canvasFingerprint.length < 100) {
      score += 25;
      factors.push('Canvas rendering issues');
    }

    // Audio context issues
    if (fingerprint.audio.audioFingerprint === 'audio-unavailable' || 
        fingerprint.audio.contextState === 'unavailable') {
      score += 20;
      factors.push('Audio context unavailable');
    }

    // Missing sensors (desktop/VM indicator)
    if (!fingerprint.sensors.motionSupported && 
        !fingerprint.sensors.orientationSupported && 
        !fingerprint.sensors.vibrationSupported) {
      score += 10;
      factors.push('No device sensors available');
    }

    // Performance timing precision anomalies
    if (fingerprint.performance.performanceNowPrecision === 0 || 
        fingerprint.performance.performanceNowPrecision > 5) {
      score += 10;
      factors.push('Unusual performance timing precision');
    }

    // Plugin anomalies
    if (fingerprint.privacy.pluginsHidden) {
      score += 10;
      factors.push('Browser plugins hidden');
    }

    // Geographic inconsistencies
    const timezone = fingerprint.timezone.timezone;
    const language = fingerprint.basic.language;
    
    // Simple geographic consistency check
    if (timezone.includes('America') && !language.startsWith('en') && 
        !language.startsWith('es') && !language.startsWith('fr')) {
      score += 15;
      factors.push('Geographic inconsistency detected');
    }

    return { score: Math.min(score, 100), factors };
  };

  // Generate comprehensive fingerprint hash
  const generateFingerprintHash = (data: Omit<DeviceFingerprint, 'hash' | 'riskScore' | 'riskFactors'>): string => {
    // Create a more stable hash by excluding volatile data
    const stableData = {
      basic: {
        ...data.basic,
        userAgent: data.basic.userAgent.replace(/\d+\.\d+\.\d+/g, 'X.X.X') // Normalize version numbers
      },
      screen: data.screen,
      graphics: data.graphics,
      fonts: data.fonts,
      timezone: data.timezone,
      // Exclude audio, network, performance, privacy as they can be volatile
    };
    
    const hashableData = JSON.stringify(stableData, Object.keys(stableData).sort());
    
    // Simple hash function (you might want to use a proper crypto hash in production)
    let hash = 0;
    for (let i = 0; i < hashableData.length; i++) {
      const char = hashableData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36).padStart(8, '0');
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

// Debug component for device fingerprint
export const DeviceFingerprintDebug: React.FC = () => {
  const { generateFingerprint, getStoredFingerprint } = useDeviceFingerprint();
  const [fingerprint, setFingerprint] = React.useState<DeviceFingerprint | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState<number>(0);

  // Auto-generate fingerprint on mount and periodically
  React.useEffect(() => {
    const generateFP = async () => {
      setIsLoading(true);
      try {
        const fp = await generateFingerprint();
        setFingerprint(fp);
        setLastUpdate(Date.now());
      } catch (error) {
        console.error('Failed to generate fingerprint:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Generate immediately
    generateFP();

    // Auto-refresh every 30 seconds
    const interval = setInterval(generateFP, 30000);

    return () => clearInterval(interval);
  }, [generateFingerprint]);

  if (!fingerprint && !isLoading) return null;

  // Calculate trust score (inverse of risk score)
  const trustScore = fingerprint ? Math.max(0, 100 - fingerprint.riskScore) : 0;

  // Get status color based on trust score
  const getStatusColor = (score: number) => {
    if (score >= 80) return '#22c55e'; // Green
    if (score >= 60) return '#eab308'; // Yellow
    if (score >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const statusColor = getStatusColor(trustScore);

  return (
    <div style={{
      position: 'fixed',
      bottom: '200px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '11px',
      zIndex: 9999,
      pointerEvents: 'none',
      fontFamily: 'monospace',
      minWidth: '200px',
      maxWidth: '280px',
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
        <span>Device Fingerprint</span>
        {isLoading && (
          <span style={{ color: '#60a5fa', fontSize: '10px' }}>⚡</span>
        )}
      </div>

      {fingerprint ? (
        <>
          {/* Trust Score */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '4px'
            }}>
              <span>Trust Score:</span>
              <span style={{ 
                color: statusColor,
                fontWeight: 'bold'
              }}>
                {trustScore}%
              </span>
            </div>
            
            {/* Trust Score Bar */}
            <div style={{
              width: '100%',
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${trustScore}%`,
                height: '100%',
                background: statusColor,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Device Info */}
          <div style={{ fontSize: '10px', opacity: 0.9, marginBottom: '8px' }}>
            <div>Device ID: {fingerprint.hash.substring(0, 8)}...</div>
            <div>Platform: {fingerprint.basic.platform}</div>
            <div>Browser: {fingerprint.basic.vendor}</div>
            <div>Screen: {fingerprint.screen.screenWidth}×{fingerprint.screen.screenHeight}</div>
            <div>Fonts: {fingerprint.fonts.fontCount}</div>
            <div>WebGL: {fingerprint.graphics.webglExtensions.length} ext</div>
          </div>

          {/* Hardware Stats */}
          <div style={{ fontSize: '10px', borderTop: '1px solid #444', paddingTop: '6px', marginBottom: '6px' }}>
            <div>CPU Cores: {fingerprint.basic.hardwareConcurrency}</div>
            <div>Memory: {fingerprint.basic.deviceMemory ? `${fingerprint.basic.deviceMemory}GB` : 'Unknown'}</div>
            <div>Touch Points: {fingerprint.basic.maxTouchPoints}</div>
            <div>Languages: {fingerprint.basic.languages.length}</div>
            <div>Timezone: {fingerprint.timezone.timezone.split('/').pop()}</div>
          </div>

          {/* Risk Factors */}
          {fingerprint.riskFactors.length > 0 && (
            <div style={{ 
              fontSize: '9px', 
              borderTop: '1px solid #444', 
              paddingTop: '6px',
              marginBottom: '6px'
            }}>
              <div style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: '3px' }}>
                🚨 Risk Factors ({fingerprint.riskFactors.length}):
              </div>
              <div style={{ maxHeight: '60px', overflowY: 'auto' }}>
                {fingerprint.riskFactors.slice(0, 3).map((factor, index) => (
                  <div key={index} style={{ marginBottom: '1px' }}>
                    • {factor}
                  </div>
                ))}
                {fingerprint.riskFactors.length > 3 && (
                  <div style={{ color: '#888' }}>
                    ...and {fingerprint.riskFactors.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Privacy & Security */}
          <div style={{ fontSize: '9px', borderTop: '1px solid #444', paddingTop: '6px', marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Privacy Status:</div>
            <div>Ad Block: {fingerprint.privacy.adBlockDetected ? '✅' : '❌'}</div>
            <div>Private Mode: {fingerprint.privacy.privateBrowsing ? '✅' : '❌'}</div>
            <div>Audio: {fingerprint.audio.contextState}</div>
            <div>Online: {fingerprint.network.online ? '✅' : '❌'}</div>
          </div>

          {/* Performance Metrics */}
          <div style={{ fontSize: '9px', borderTop: '1px solid #444', paddingTop: '6px', marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Performance:</div>
            <div>Timer Precision: {fingerprint.performance.performanceNowPrecision}ms</div>
            {fingerprint.performance.memoryUsed && (
              <div>Memory Used: {Math.round(fingerprint.performance.memoryUsed / 1024 / 1024)}MB</div>
            )}
            {fingerprint.sensors.batteryLevel && (
              <div>Battery: {fingerprint.sensors.batteryLevel}%</div>
            )}
          </div>

          {/* Graphics Info */}
          <div style={{ fontSize: '9px', borderTop: '1px solid #444', paddingTop: '6px', marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Graphics:</div>
            <div>Vendor: {fingerprint.graphics.webglVendor.substring(0, 20)}...</div>
            <div>Renderer: {fingerprint.graphics.webglRenderer.substring(0, 20)}...</div>
            <div>Formats: {fingerprint.graphics.supportedFormats.join(', ')}</div>
          </div>

          
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: '8px' }}>🔄 Generating fingerprint...</div>
          <div style={{ fontSize: '9px', opacity: 0.7 }}>
            Analyzing device characteristics
          </div>
        </div>
      )}
    </div>
  );
};