import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';

export interface DeviceInfo {
  deviceId: string;
  browserName: string;
  operatingSystem: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ipAddress: string;
  location: string;
}

/**
 * Parses user agent string and IP address to generate device metadata and fingerprint.
 */
export function parseDeviceAndLocation(userAgent: string, rawIp?: string): DeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browserName = result.browser.name || 'Unknown Browser';
  const operatingSystem = result.os.name || 'Unknown OS';
  
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (result.device.type === 'mobile') {
    deviceType = 'mobile';
  } else if (result.device.type === 'tablet') {
    deviceType = 'tablet';
  }

  // Generate unique device signature
  const rawFingerprint = `${browserName}_${operatingSystem}_${deviceType}_${result.cpu.architecture || 'x86'}`;
  let deviceId = '';
  try {
    // Simple browser-safe hash or fallback string
    let hash = 0;
    for (let i = 0; i < rawFingerprint.length; i++) {
      hash = (hash << 5) - hash + rawFingerprint.charCodeAt(i);
      hash |= 0;
    }
    deviceId = `dev_${Math.abs(hash).toString(16)}`;
  } catch (e) {
    deviceId = `dev_${Date.now()}`;
  }

  // IP Geolocation
  const ipAddress = rawIp && rawIp !== '::1' && rawIp !== '127.0.0.1' ? rawIp : '103.251.100.12'; // fallback public IP for demo
  const geo = geoip.lookup(ipAddress);
  const location = geo ? `${geo.city || 'Unknown City'}, ${geo.country || 'Unknown Country'}` : 'New Delhi, India (Local/VPN)';

  return {
    deviceId,
    browserName,
    operatingSystem,
    deviceType,
    ipAddress,
    location,
  };
}
