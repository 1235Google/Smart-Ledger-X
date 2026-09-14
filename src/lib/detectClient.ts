import { detectDeviceType, DeviceType } from './detectDevice';

export type ClientInfo = {
  browserName: string;        // e.g. "Chromium", "Google Chrome", "Microsoft Edge", "Brave", "Firefox", "Safari"
  browserVersion: string;     // full version from client hints, fallback "Unknown"
  engine: string;             // "Blink" | "Gecko" | "WebKit" | "Unknown"
  osName: string;             // "Windows", "macOS", "Linux", "ChromeOS", "Android", "iOS", "Unknown"
  osVersion: string;
  deviceType: DeviceType;     // "Desktop" | "Mobile" | "Tablet" | "TV" | "Wearable" | "Unknown"
  architecture: string;       // "x86_64", "arm", etc. or "Unknown"
  isTrustworthy: boolean;     // true if data came from Client Hints, false if UA-string fallback
  rawUserAgent: string;
};

// BUG FIX: reduced UA / frozen version & Chromium vs Chrome brand detection
export async function detectClient(): Promise<ClientInfo> {
  const rawUserAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let engine = 'Unknown';
  let osName = 'Unknown';
  let osVersion = '';
  let deviceType: DeviceType = 'Desktop';
  let architecture = 'Unknown';
  let isTrustworthy = false;

  try {
    const nav = navigator as any;
    if (nav && nav.userAgentData) {
      isTrustworthy = true;
      let hints: any = {};
      try {
        hints = await nav.userAgentData.getHighEntropyValues([
          "platform", "platformVersion", "architecture", "model",
          "uaFullVersion", "fullVersionList", "bitness", "formFactors"
        ]);
      } catch (e) {
        hints = {
          platform: nav.userAgentData.platform,
          brands: nav.userAgentData.brands,
          mobile: nav.userAgentData.mobile
        };
      }

      // Architecture & Bitness
      if (hints.architecture) {
        architecture = hints.architecture;
        if (hints.bitness) {
          architecture += ` (${hints.bitness}-bit)`;
        }
      }

      // OS Name & Version (CrOS handling: do not display frozen 14541.0.0)
      const rawPlatform = hints.platform || nav.userAgentData.platform || '';
      if (/cros|chrome os/i.test(rawPlatform) || /cros/i.test(rawUserAgent)) {
        osName = 'ChromeOS';
        const pVer = hints.platformVersion || '';
        if (pVer && !pVer.startsWith('14541') && !pVer.startsWith('0.')) {
          osVersion = pVer;
        } else {
          osVersion = '';
        }
      } else if (/win/i.test(rawPlatform)) {
        osName = 'Windows';
        const pVer = hints.platformVersion || '';
        if (pVer) {
          const major = parseInt(pVer.split('.')[0], 10);
          osVersion = major >= 13 ? '11' : major >= 10 ? '10' : pVer;
        }
      } else if (/mac/i.test(rawPlatform)) {
        osName = 'macOS';
        osVersion = hints.platformVersion || '';
      } else if (/linux/i.test(rawPlatform)) {
        osName = 'Linux';
        osVersion = hints.platformVersion || '';
      } else if (/android/i.test(rawPlatform)) {
        osName = 'Android';
        osVersion = hints.platformVersion || '';
      } else if (/ios|iphone|ipad|ipod/i.test(rawPlatform)) {
        osName = 'iOS';
        osVersion = hints.platformVersion || '';
      } else {
        osName = rawPlatform || 'Unknown';
      }

      // Browser Name & Version (Chromium vs Chrome distinction)
      const versionList = hints.fullVersionList || nav.userAgentData.brands || [];
      const cleanBrands = versionList.filter((b: any) => {
        const brand = b.brand || '';
        return !/not.{0,3}a.{0,3}brand/i.test(brand) && !brand.includes('?') && !brand.includes(';');
      });

      let matchedBrand = cleanBrands.find((b: any) => /google chrome/i.test(b.brand));
      if (!matchedBrand) matchedBrand = cleanBrands.find((b: any) => /microsoft edge/i.test(b.brand));
      if (!matchedBrand) matchedBrand = cleanBrands.find((b: any) => /brave|opera|vivaldi|firefox|safari|chromium/i.test(b.brand));

      if (matchedBrand) {
        const brandName = matchedBrand.brand;
        if (/google chrome/i.test(brandName)) browserName = 'Google Chrome';
        else if (/microsoft edge/i.test(brandName)) browserName = 'Microsoft Edge';
        else if (/brave/i.test(brandName)) browserName = 'Brave';
        else if (/opera/i.test(brandName)) browserName = 'Opera';
        else if (/vivaldi/i.test(brandName)) browserName = 'Vivaldi';
        else if (/firefox/i.test(brandName)) browserName = 'Firefox';
        else if (/safari/i.test(brandName)) browserName = 'Safari';
        else if (/chromium/i.test(brandName)) browserName = 'Chromium';
        else browserName = brandName;

        browserVersion = matchedBrand.version || hints.uaFullVersion || 'Unknown';
      } else {
        browserName = 'Chromium';
        browserVersion = hints.uaFullVersion || 'Unknown';
      }

      // Engine
      if (/chrome|chromium|edge|brave|opera|vivaldi/i.test(browserName)) {
        engine = 'Blink';
      } else if (/firefox/i.test(browserName)) {
        engine = 'Gecko';
      } else if (/safari/i.test(browserName)) {
        engine = 'WebKit';
      }

      // BUG FIX: removed unreliable "Laptop" guess, replaced with formFactors-based detection
      deviceType = await detectDeviceType();

    } else {
      isTrustworthy = false;
      const ua = rawUserAgent;

      if (/windows nt/i.test(ua)) {
        osName = 'Windows';
        const match = ua.match(/Windows NT (\d+\.\d+)/);
        if (match) {
          const v = match[1];
          osVersion = v === '10.0' ? '10/11' : v;
        }
      } else if (/mac os x/i.test(ua)) {
        osName = 'macOS';
        const match = ua.match(/Mac OS X ([_0-9]+)/);
        if (match) osVersion = match[1].replace(/_/g, '.');
      } else if (/cros/i.test(ua)) {
        osName = 'ChromeOS';
        osVersion = '';
      } else if (/android/i.test(ua)) {
        osName = 'Android';
        const match = ua.match(/Android ([0-9.]+)/);
        if (match) osVersion = match[1];
      } else if (/iphone|ipad|ipod/i.test(ua)) {
        osName = 'iOS';
        const match = ua.match(/OS ([0-9_]+)/);
        if (match) osVersion = match[1].replace(/_/g, '.');
      } else if (/linux/i.test(ua)) {
        osName = 'Linux';
      }

      if (/firefox/i.test(ua)) {
        browserName = 'Firefox';
        const match = ua.match(/Firefox\/([0-9.]+)/);
        if (match) browserVersion = match[1];
        engine = 'Gecko';
      } else if (/edg\//i.test(ua)) {
        browserName = 'Microsoft Edge';
        const match = ua.match(/Edg\/([0-9.]+)/);
        if (match) browserVersion = match[1];
        engine = 'Blink';
      } else if (/opr\//i.test(ua)) {
        browserName = 'Opera';
        const match = ua.match(/OPR\/([0-9.]+)/);
        if (match) browserVersion = match[1];
        engine = 'Blink';
      } else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) {
        browserName = 'Google Chrome';
        const match = ua.match(/Chrome\/([0-9.]+)/);
        if (match) browserVersion = match[1];
        engine = 'Blink';
      } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
        browserName = 'Safari';
        const match = ua.match(/Version\/([0-9.]+)/);
        if (match) browserVersion = match[1];
        engine = 'WebKit';
      } else {
        browserName = 'Unknown Browser';
      }

      if (/mobile/i.test(ua)) {
        deviceType = 'Mobile';
      } else if (/ipad|tablet/i.test(ua)) {
        deviceType = 'Tablet';
      } else {
        deviceType = 'Desktop';
      }

      if (/x86_64|win64|wow64|amd64/i.test(ua)) {
        architecture = 'x86_64';
      } else if (/arm|aarch64/i.test(ua)) {
        architecture = 'ARM';
      }
    }
  } catch (err) {}

  return {
    browserName: browserName || 'Unknown',
    browserVersion: browserVersion || 'Unknown',
    engine: engine || 'Unknown',
    osName: osName || 'Unknown',
    osVersion: osVersion || '',
    deviceType: deviceType || 'Desktop',
    architecture: architecture || 'Unknown',
    isTrustworthy,
    rawUserAgent
  };
}
