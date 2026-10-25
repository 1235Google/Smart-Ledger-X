import { UAParser } from 'ua-parser-js';

export type DeviceCategory = 
  | 'macbook' 
  | 'laptop' 
  | 'desktop' 
  | 'iphone' 
  | 'android-phone' 
  | 'ipad' 
  | 'android-tablet' 
  | 'wearable' 
  | 'unknown';

export type OSBrand = 'apple' | 'windows' | 'android' | 'chromeos' | 'linux' | 'unknown';
export type BrowserBrand = 'chrome' | 'safari' | 'firefox' | 'edge' | 'brave' | 'opera' | 'generic';

export interface DetailedDeviceDetection {
  deviceCategory: DeviceCategory;
  deviceLabel: string;             // e.g., "MacBook Pro", "Windows Laptop", "iPhone", "Desktop Workstation"
  osBrand: OSBrand;
  osName: string;                  // e.g., "macOS", "Windows", "iOS", "Android", "Ubuntu Linux"
  osVersion: string;               // e.g., "15.1 (Sequoia)", "11", "17.4"
  osFriendlyTitle: string;         // e.g., "macOS Sequoia 15.1"
  browserBrand: BrowserBrand;
  browserName: string;             // e.g., "Google Chrome", "Safari", "Brave", "Microsoft Edge"
  browserVersion: string;          // e.g., "126"
  isMobile: boolean;
  isTablet: boolean;
  isTouchDevice: boolean;
  hasBattery: boolean | null;      // heuristic for Laptop vs Desktop
  modelGuess?: string;             // e.g., "iPhone", "Pixel 8"
  confidence: 'high-client-hints' | 'medium-ua-heuristics' | 'low-fallback';
}

/**
 * macOS major version to marketing codenames mapping
 */
const MACOS_CODENAMES: Record<string, string> = {
  '15': 'Sequoia',
  '14': 'Sonoma',
  '13': 'Ventura',
  '12': 'Monterey',
  '11': 'Big Sur',
  '10.15': 'Catalina',
};

/**
 * Detects whether the current device has a battery (indicative of Laptop vs Desktop for PCs/Macs)
 */
async function checkHasBattery(): Promise<boolean | null> {
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      // If charging status or level is valid, battery hardware exists
      return typeof battery?.level === 'number';
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Detects if the current browser is Brave (Brave masks itself as Chrome in standard UA and brands)
 */
async function checkIsBrave(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && (navigator as any).brave) {
    try {
      return await (navigator as any).brave.isBrave();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Primary Device & Environment Detector
 * Combines User-Agent Client Hints, Battery/Touch heuristics, and fallback UA parsing.
 */
export async function detectDeviceEnvironment(): Promise<DetailedDeviceDetection> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const parser = new UAParser(ua);
  const uaResult = parser.getResult();
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;

  let confidence: 'high-client-hints' | 'medium-ua-heuristics' | 'low-fallback' = 'low-fallback';
  let highEntropyHints: Record<string, any> = {};

  if (nav?.userAgentData?.getHighEntropyValues) {
    try {
      highEntropyHints = await nav.userAgentData.getHighEntropyValues([
        'platform',
        'platformVersion',
        'architecture',
        'model',
        'uaFullVersion',
        'fullVersionList',
        'formFactors'
      ]);
      confidence = 'high-client-hints';
    } catch {
      confidence = 'medium-ua-heuristics';
    }
  } else {
    confidence = 'medium-ua-heuristics';
  }

  const isBrave = await checkIsBrave();
  const hasBattery = await checkHasBattery();
  const isTouchDevice = typeof window !== 'undefined' && 
    ((navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window);
  
  const screenWidth = typeof window !== 'undefined' ? window.screen?.width || window.innerWidth : 1024;
  const screenHeight = typeof window !== 'undefined' ? window.screen?.height || window.innerHeight : 768;

  // -------------------------------------------------------------
  // 1. Operating System Detection
  // -------------------------------------------------------------
  let osBrand: OSBrand = 'unknown';
  let osName = 'Unknown OS';
  let osVersion = '';
  let osFriendlyTitle = 'Unknown OS';

  const rawPlatform = (highEntropyHints.platform || nav?.userAgentData?.platform || uaResult.os.name || '').toLowerCase();
  const rawPlatformVersion = highEntropyHints.platformVersion || '';

  if (rawPlatform.includes('win') || /Windows/i.test(ua)) {
    osBrand = 'windows';
    osName = 'Windows';

    // Disambiguate Windows 11 vs Windows 10
    // In Client Hints: PlatformVersion >= 13 is Windows 11 (e.g. 13.0.0, 14.0.0, 15.0.0)
    if (rawPlatformVersion) {
      const major = parseInt(rawPlatformVersion.split('.')[0], 10);
      osVersion = major >= 13 ? '11' : '10';
    } else if (/Windows NT 10.0/i.test(ua)) {
      // In reduced UA, both Win 10 & 11 report Windows NT 10.0
      osVersion = '11 / 10';
    } else if (uaResult.os.version) {
      osVersion = uaResult.os.version;
    }
    osFriendlyTitle = `Windows ${osVersion}`.trim();
  } else if (rawPlatform.includes('mac') || /Macintosh|Mac OS X/i.test(ua)) {
    // Check if it's iPad masquerading as Mac (iPadOS 13+ requests desktop site by default)
    const isIPadDesktop = isTouchDevice && navigator.maxTouchPoints > 1 && !/iPhone/i.test(ua);

    if (isIPadDesktop) {
      osBrand = 'apple';
      osName = 'iPadOS';
      osVersion = uaResult.os.version || '17';
      osFriendlyTitle = `iPadOS ${osVersion}`.trim();
    } else {
      osBrand = 'apple';
      osName = 'macOS';
      let macMajor = '';
      if (rawPlatformVersion) {
        macMajor = rawPlatformVersion.split('.')[0];
        osVersion = rawPlatformVersion;
      } else {
        const match = ua.match(/Mac OS X\s+([0-9_]+)/i);
        if (match) {
          osVersion = match[1].replace(/_/g, '.');
          macMajor = osVersion.split('.')[0] === '10' ? `10.${osVersion.split('.')[1]}` : osVersion.split('.')[0];
        }
      }
      const codename = MACOS_CODENAMES[macMajor] ? ` (${MACOS_CODENAMES[macMajor]})` : '';
      osFriendlyTitle = `macOS ${osVersion || '14'}${codename}`;
    }
  } else if (/iphone/i.test(ua) || (rawPlatform.includes('ios') && !rawPlatform.includes('ipad'))) {
    osBrand = 'apple';
    osName = 'iOS';
    const match = ua.match(/OS\s+([0-9_]+)/i);
    osVersion = match ? match[1].replace(/_/g, '.') : uaResult.os.version || '';
    osFriendlyTitle = `iOS ${osVersion}`.trim();
  } else if (/ipad/i.test(ua)) {
    osBrand = 'apple';
    osName = 'iPadOS';
    const match = ua.match(/OS\s+([0-9_]+)/i);
    osVersion = match ? match[1].replace(/_/g, '.') : uaResult.os.version || '';
    osFriendlyTitle = `iPadOS ${osVersion}`.trim();
  } else if (rawPlatform.includes('android') || /Android/i.test(ua)) {
    osBrand = 'android';
    osName = 'Android';
    const match = ua.match(/Android\s+([0-9.]+)/i);
    osVersion = match ? match[1] : (rawPlatformVersion || uaResult.os.version || '');
    osFriendlyTitle = `Android ${osVersion}`.trim();
  } else if (rawPlatform.includes('cros') || /CrOS/i.test(ua)) {
    osBrand = 'chromeos';
    osName = 'ChromeOS';
    osVersion = rawPlatformVersion || '';
    osFriendlyTitle = 'ChromeOS';
  } else if (rawPlatform.includes('linux') || /Linux/i.test(ua)) {
    osBrand = 'linux';
    osName = 'Linux';
    osFriendlyTitle = 'Linux';
  }

  // -------------------------------------------------------------
  // 2. Browser Detection
  // -------------------------------------------------------------
  let browserBrand: BrowserBrand = 'generic';
  let browserName = 'Web Browser';
  let browserVersion = '';

  const brands = highEntropyHints.fullVersionList || nav?.userAgentData?.brands || [];
  const brandStrings = brands.map((b: any) => `${b.brand} ${b.version}`);

  if (isBrave || /Brave/i.test(ua)) {
    browserBrand = 'brave';
    browserName = 'Brave';
    const match = ua.match(/Chrome\/([0-9.]+)/);
    browserVersion = match ? match[1].split('.')[0] : '';
  } else if (/Edg\//i.test(ua) || brandStrings.some((b: string) => /Microsoft Edge/i.test(b))) {
    browserBrand = 'edge';
    browserName = 'Microsoft Edge';
    const match = ua.match(/Edg\/([0-9.]+)/i);
    browserVersion = match ? match[1].split('.')[0] : (uaResult.browser.version?.split('.')[0] || '');
  } else if (/OPR\/|Opera/i.test(ua)) {
    browserBrand = 'opera';
    browserName = 'Opera';
    const match = ua.match(/OPR\/([0-9.]+)/i);
    browserVersion = match ? match[1].split('.')[0] : '';
  } else if (/Chrome\//i.test(ua) || brandStrings.some((b: string) => /Google Chrome/i.test(b))) {
    browserBrand = 'chrome';
    browserName = 'Google Chrome';
    const match = ua.match(/Chrome\/([0-9.]+)/i);
    browserVersion = match ? match[1].split('.')[0] : (uaResult.browser.version?.split('.')[0] || '');
  } else if (/Firefox\//i.test(ua)) {
    browserBrand = 'firefox';
    browserName = 'Mozilla Firefox';
    const match = ua.match(/Firefox\/([0-9.]+)/i);
    browserVersion = match ? match[1].split('.')[0] : (uaResult.browser.version?.split('.')[0] || '');
  } else if (/Safari\//i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) {
    browserBrand = 'safari';
    browserName = 'Apple Safari';
    const match = ua.match(/Version\/([0-9.]+)/i);
    browserVersion = match ? match[1].split('.')[0] : (uaResult.browser.version?.split('.')[0] || '');
  }

  // -------------------------------------------------------------
  // 3. Device Category & Silhouette Shape Detection
  // -------------------------------------------------------------
  let deviceCategory: DeviceCategory = 'unknown';
  let deviceLabel = 'Unknown Device';
  const isMobileHint = nav?.userAgentData?.mobile;

  // Form Factors Client Hint if supported
  const formFactors: string[] = highEntropyHints.formFactors || [];
  const formFactorStr = formFactors.join(' ').toLowerCase();

  const isTabletCheck = 
    osName === 'iPadOS' ||
    /Tablet|iPad/i.test(ua) ||
    formFactorStr.includes('tablet') ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
    (isTouchDevice && Math.min(screenWidth, screenHeight) >= 600 && Math.max(screenWidth, screenHeight) <= 1366 && (osBrand === 'apple' || osBrand === 'android'));

  const isWatchCheck = 
    /Watch|Wearable/i.test(ua) || 
    formFactorStr.includes('wearable') || 
    formFactorStr.includes('watch') ||
    (Math.max(screenWidth, screenHeight) <= 400 && isTouchDevice);

  const isPhoneCheck = 
    !isTabletCheck && !isWatchCheck &&
    (isMobileHint === true || /Mobile|iPhone|Android/i.test(ua) || formFactorStr.includes('mobile'));

  if (isWatchCheck) {
    deviceCategory = 'wearable';
    deviceLabel = osBrand === 'apple' ? 'Apple Watch' : 'Smartwatch';
  } else if (isTabletCheck) {
    if (osBrand === 'apple') {
      deviceCategory = 'ipad';
      deviceLabel = 'Apple iPad';
    } else {
      deviceCategory = 'android-tablet';
      deviceLabel = 'Android Tablet';
    }
  } else if (isPhoneCheck) {
    if (osBrand === 'apple') {
      deviceCategory = 'iphone';
      deviceLabel = 'Apple iPhone';
    } else {
      deviceCategory = 'android-phone';
      const rawModel = highEntropyHints.model || uaResult.device.model || '';
      deviceLabel = rawModel ? `Android (${rawModel})` : 'Android Smartphone';
    }
  } else {
    // It's a PC or Mac desktop/laptop
    if (osBrand === 'apple') {
      // Distinguish MacBook from iMac/Mac Studio/Mac mini/Mac Pro
      // Heuristic: Presence of battery = MacBook. Or screen width common for laptops (13"-16" retina: 1440-1800 viewport)
      if (hasBattery === true || (hasBattery === null && screenWidth <= 1800)) {
        deviceCategory = 'macbook';
        deviceLabel = 'MacBook';
      } else {
        deviceCategory = 'desktop';
        deviceLabel = 'Mac Desktop (iMac / Studio)';
      }
    } else if (osBrand === 'windows') {
      // Heuristic for Windows Laptop vs Desktop Tower:
      // 1. Has battery API reported true -> Laptop
      // 2. Touch screen laptop with clamshell or standard laptop resolutions (1366, 1536, 1920)
      if (hasBattery === true || (isTouchDevice && screenWidth <= 1920)) {
        deviceCategory = 'laptop';
        deviceLabel = 'Windows Laptop';
      } else if (hasBattery === false) {
        deviceCategory = 'desktop';
        deviceLabel = 'Windows Desktop PC';
      } else {
        // Default to laptop as standard workforce remote setup
        deviceCategory = 'laptop';
        deviceLabel = 'Windows PC';
      }
    } else if (osBrand === 'chromeos') {
      deviceCategory = 'laptop';
      deviceLabel = 'Chromebook';
    } else if (osBrand === 'linux') {
      deviceCategory = hasBattery === true ? 'laptop' : 'desktop';
      deviceLabel = hasBattery === true ? 'Linux Laptop' : 'Linux Workstation';
    } else {
      deviceCategory = 'unknown';
      deviceLabel = 'Workstation';
    }
  }

  return {
    deviceCategory,
    deviceLabel,
    osBrand,
    osName,
    osVersion,
    osFriendlyTitle,
    browserBrand,
    browserName,
    browserVersion,
    isMobile: isPhoneCheck,
    isTablet: isTabletCheck,
    isTouchDevice,
    hasBattery,
    modelGuess: highEntropyHints.model || uaResult.device.model || undefined,
    confidence
  };
}
