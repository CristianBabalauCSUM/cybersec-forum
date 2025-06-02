import { NextRequest, NextResponse } from 'next/server';

interface DeviceFingerprint {
  basic: any;
  screen: any;
  graphics: any;
  audio: any;
  fonts: any;
  network: any;
  sensors: any;
  timezone: any;
  performance: any;
  privacy: any;
  hash: string;
  riskScore: number;
  riskFactors: string[];
}

export async function POST(request: NextRequest) {
  try {
    const fingerprint: DeviceFingerprint = await request.json();
    
    // Validate the fingerprint data
    if (!fingerprint.hash || typeof fingerprint.riskScore !== 'number') {
      return NextResponse.json(
        { message: 'Invalid fingerprint data structure' },
        { status: 400 }
      );
    }

    // Advanced analysis and storage
    const analysis = await analyzeDeviceFingerprint(fingerprint);
    
    // Store in database (example)
    // await storeDeviceFingerprint(fingerprint, analysis);
    
    // Log suspicious activity
    if (fingerprint.riskScore > 70) {
      console.warn('High-risk device detected:', {
        hash: fingerprint.hash,
        riskScore: fingerprint.riskScore,
        factors: fingerprint.riskFactors,
        userAgent: fingerprint.basic.userAgent
      });
    }

    return NextResponse.json({ 
      success: true, 
      analysis,
      message: 'Device fingerprint processed successfully' 
    });
    
  } catch (error) {
    console.error('Error processing device fingerprint:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Advanced Device Analysis Function
// ============================================================================

async function analyzeDeviceFingerprint(fingerprint: DeviceFingerprint) {
  const analysis = {
    deviceType: detectDeviceType(fingerprint),
    browserType: detectBrowserType(fingerprint),
    automationRisk: calculateAutomationRisk(fingerprint),
    uniquenessScore: calculateUniquenessScore(fingerprint),
    geoConsistency: checkGeoConsistency(fingerprint),
    recommendedAction: 'allow' as 'allow' | 'challenge' | 'block',
    confidence: 0
  };

  // Determine recommended action based on analysis
  if (fingerprint.riskScore > 80 || analysis.automationRisk > 0.8) {
    analysis.recommendedAction = 'block';
    analysis.confidence = 95;
  } else if (fingerprint.riskScore > 50 || analysis.automationRisk > 0.5) {
    analysis.recommendedAction = 'challenge';
    analysis.confidence = 75;
  } else {
    analysis.recommendedAction = 'allow';
    analysis.confidence = 60 + (100 - fingerprint.riskScore) * 0.4;
  }

  return analysis;
}

function detectDeviceType(fingerprint: DeviceFingerprint): string {
  const { userAgent } = fingerprint.basic;
  const { screenWidth, screenHeight, maxTouchPoints } = fingerprint.basic;

  if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    return maxTouchPoints > 0 ? 'mobile_touch' : 'mobile';
  }
  
  if (/Tablet|iPad/i.test(userAgent)) {
    return 'tablet';
  }

  if (screenWidth <= 1024 && screenHeight <= 768) {
    return 'desktop_small';
  }

  return 'desktop';
}

function detectBrowserType(fingerprint: DeviceFingerprint): string {
  const { userAgent } = fingerprint.basic;

  if (/Chrome/i.test(userAgent) && !/Edge|OPR/i.test(userAgent)) {
    return 'chrome';
  }
  if (/Firefox/i.test(userAgent)) {
    return 'firefox';
  }
  if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    return 'safari';
  }
  if (/Edge/i.test(userAgent)) {
    return 'edge';
  }
  if (/OPR|Opera/i.test(userAgent)) {
    return 'opera';
  }

  return 'unknown';
}

function calculateAutomationRisk(fingerprint: DeviceFingerprint): number {
  let risk = 0;

  // Check for headless browsers
  if (/HeadlessChrome|PhantomJS|SlimerJS/i.test(fingerprint.basic.userAgent)) {
    risk += 0.8;
  }

  // Check for automation frameworks
  if (/Selenium|WebDriver|Puppeteer|Playwright/i.test(fingerprint.basic.userAgent)) {
    risk += 0.9;
  }

  // Check for unusual WebGL configurations
  if (fingerprint.graphics.webglVendor === 'Brian Paul' || 
      fingerprint.graphics.webglRenderer.includes('SwiftShader')) {
    risk += 0.3;
  }

  // Check for missing or limited fonts
  if (fingerprint.fonts.fontCount < 5) {
    risk += 0.4;
  }

  // Check for automation-typical screen sizes
  const commonAutomationSizes = [
    [1024, 768], [1280, 1024], [1920, 1080]
  ];
  
  if (commonAutomationSizes.some(([w, h]) => 
    fingerprint.screen.screenWidth === w && fingerprint.screen.screenHeight === h)) {
    risk += 0.2;
  }

  // Check for missing APIs that humans typically have
  if (fingerprint.audio.audioFingerprint === 'audio-unavailable') {
    risk += 0.3;
  }

  return Math.min(risk, 1);
}

function calculateUniquenessScore(fingerprint: DeviceFingerprint): number {
  // Calculate how unique this fingerprint is (0-100)
  let uniqueness = 0;

  // WebGL and Canvas contribute heavily to uniqueness
  if (fingerprint.graphics.canvasFingerprint !== 'no-canvas') {
    uniqueness += 25;
  }
  if (fingerprint.graphics.webglFingerprint !== 'unknown') {
    uniqueness += 25;
  }

  // Audio fingerprint adds uniqueness
  if (fingerprint.audio.audioFingerprint.length > 10) {
    uniqueness += 20;
  }

  // Font selection contributes
  uniqueness += Math.min(fingerprint.fonts.fontCount * 2, 20);

  // Hardware characteristics
  if (fingerprint.basic.deviceMemory && fingerprint.basic.deviceMemory > 4) {
    uniqueness += 5;
  }
  if (fingerprint.basic.hardwareConcurrency > 4) {
    uniqueness += 5;
  }

  return Math.min(uniqueness, 100);
}

function checkGeoConsistency(fingerprint: DeviceFingerprint): boolean {
  // Check if timezone and language are geographically consistent
  const { timezone, locale } = fingerprint.timezone;
  const { language } = fingerprint.basic;

  // Simple consistency checks (would be more sophisticated in production)
  if (timezone.includes('America') && !language.startsWith('en') && !language.startsWith('es')) {
    return false;
  }
  if (timezone.includes('Europe') && language.startsWith('zh')) {
    return false;
  }
  if (timezone.includes('Asia') && language.startsWith('en') && !timezone.includes('Singapore')) {
    return false;
  }

  return true;
}