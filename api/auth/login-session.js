import crypto from "crypto";
import { UAParser } from "ua-parser-js";

function cleanIp(ip) {
  let cleaned = (ip || '').trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

function isValidPublicIp(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = cleanIp(ip);
  if (!trimmed || trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === 'localhost') {
    return false;
  }

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = trimmed.match(ipv4Regex);
  if (match) {
    const o1 = parseInt(match[1], 10);
    const o2 = parseInt(match[2], 10);
    const o3 = parseInt(match[3], 10);
    const o4 = parseInt(match[4], 10);
    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return false;

    if (o1 === 0) return false;
    if (o1 === 10) return false;
    if (o1 === 127) return false;
    if (o1 === 169 && o2 === 254) return false;
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return false;
    if (o1 === 192 && o2 === 168) return false;
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return false;
    if (o1 >= 224) return false;

    return true;
  }

  if (trimmed.includes(':')) {
    const lower = trimmed.toLowerCase();
    if (lower === '::1' || lower === '::') return false;
    if (lower.startsWith('fe80:')) return false;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return false;
    return true;
  }

  return false;
}

function isPrivateOrLocalIp(ip) {
  if (!ip) return true;
  const cleaned = cleanIp(ip);
  if (!cleaned || cleaned === '127.0.0.1' || cleaned === '::1' || cleaned === 'localhost') {
    return true;
  }
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = cleaned.match(ipv4Regex);
  if (match) {
    const o1 = parseInt(match[1], 10);
    const o2 = parseInt(match[2], 10);
    if (o1 === 0 || o1 === 10 || o1 === 127) return true;
    if (o1 === 169 && o2 === 254) return true;
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    if (o1 === 192 && o2 === 168) return true;
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;
    if (o1 >= 224) return true;
    return false;
  }
  if (cleaned.includes(':')) {
    const lower = cleaned.toLowerCase();
    if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
  }
  return false;
}

function extractClientIp(req, clientReportedPublicIp) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const rawList = (Array.isArray(forwarded) ? forwarded.join(',') : forwarded)
      .split(',')
      .map(s => cleanIp(s.trim()))
      .filter(Boolean);

    for (const ip of rawList) {
      if (isValidPublicIp(ip)) {
        return ip;
      }
    }
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp && isValidPublicIp(cleanIp(String(realIp)))) {
    return cleanIp(String(realIp));
  }

  if (clientReportedPublicIp && isValidPublicIp(clientReportedPublicIp)) {
    return cleanIp(clientReportedPublicIp);
  }

  const rawSocketIp = cleanIp(req.ip || req.socket?.remoteAddress || '');
  return rawSocketIp || '127.0.0.1';
}

async function reverseGeocodeGps(lat, lon) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || '';
      const region = data.principalSubdivision || '';
      const country = data.countryName || '';
      const countryCode = data.countryCode || '';
      if (!lat || !lon || (lat === 0 && lon === 0)) {
        return { location: 'Coordinates unavailable' };
      }
      const parts = [city, region, country].filter(Boolean);
      return {
        location: parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        city: city || undefined,
        region: region || undefined,
        country: country || undefined,
        countryCode: countryCode || undefined
      };
    }
  } catch (e) {}

  return {
    location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  };
}

const geoCache = new Map();

async function getApproximateLocation(ip) {
  const cleanedIp = cleanIp(ip);

  if (isPrivateOrLocalIp(cleanedIp)) {
    return {
      status: 'unresolvable',
      reason: 'private_or_local_ip',
      lat: null,
      lng: null,
      city: null,
      region: null,
      country: null,
      source: 'approximate_ip'
    };
  }

  if (geoCache.has(cleanedIp)) {
    return geoCache.get(cleanedIp);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(cleanedIp)}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const lat = typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude);
        const lng = typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude);

        if (!lat || !lng || (lat === 0 && lng === 0)) {
          return {
            status: 'failed',
            reason: 'null_island_from_provider',
            lat: null,
            lng: null,
            city: null,
            region: null,
            country: null,
            source: 'approximate_ip'
          };
        }

        const successResult = {
          status: 'success',
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          city: data.city || 'Unknown',
          region: data.region || 'Unknown',
          country: data.country || 'Unknown',
          accuracyRadiusKm: 25,
          source: 'ip'
        };
        geoCache.set(cleanedIp, successResult);
        return successResult;
      }
    }
  } catch (err) {}

  return {
    status: 'failed',
    reason: 'provider_unavailable',
    lat: null,
    lng: null,
    city: null,
    region: null,
    country: null,
    source: 'approximate_ip'
  };
}

function parseDeviceAndBrowser(req, clientHintsPayload) {
  const userAgent = req.headers['user-agent'] || (clientHintsPayload?.userAgent) || '';
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const secChUaPlatform = req.headers['sec-ch-ua-platform'];
  const chPlatformVersion = (req.headers['sec-ch-ua-platform-version']) || (clientHintsPayload?.platformVersion);
  const chBrands = clientHintsPayload?.brands || [];

  let os = 'Unknown OS';
  let osVersion = 'Unavailable';

  const isFydeInUa = /FydeOS|FlintOS/i.test(userAgent);
  const isFydeInPlatform = /FydeOS/i.test(secChUaPlatform || '') || /FydeOS/i.test(clientHintsPayload?.platform || '');
  const isFydeInBrands = Array.isArray(chBrands) && chBrands.some((b) => /FydeOS/i.test(b?.brand || ''));

  if (isFydeInUa || isFydeInPlatform || isFydeInBrands) {
    os = 'FydeOS';
    const match = userAgent.match(/(?:FydeOS|FlintOS)[\/\s]?v?([0-9.]+)/i);
    if (match) {
      osVersion = match[1];
    } else if (chPlatformVersion && chPlatformVersion !== 'Unavailable') {
      osVersion = chPlatformVersion.replace(/['"]/g, '').trim();
    }
  } else if (
    /CrOS|Chrome\s?OS|Chromium\s?OS/i.test(userAgent) ||
    /Chrome\s?OS|Chromium\s?OS/i.test(secChUaPlatform || '') ||
    /Chrome\s?OS|Chromium\s?OS/i.test(clientHintsPayload?.platform || '')
  ) {
    os = 'ChromeOS';
    const match = userAgent.match(/CrOS\s+[^\s]+\s+([0-9.]+)/i) || userAgent.match(/ChromeOS\/([0-9.]+)/i);
    if (match) {
      osVersion = match[1];
    } else if (chPlatformVersion && chPlatformVersion !== 'Unavailable') {
      osVersion = chPlatformVersion.replace(/['"]/g, '').trim();
    }
  } else if (result.os.name) {
    os = result.os.name;
    osVersion = result.os.version || 'Unavailable';
  }

  let browser = result.browser.name || 'Web Browser';
  let browserVersion = result.browser.version || 'Unavailable';

  let category = 'Desktop';
  if (result.device.type === 'mobile') category = 'Mobile';
  else if (result.device.type === 'tablet') category = 'Tablet';
  else if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    category = /iPad|Tablet/i.test(userAgent) ? 'Tablet' : 'Mobile';
  }

  let model = result.device.model || 'Unavailable';
  let manufacturer = result.device.vendor || undefined;

  return {
    category,
    model,
    manufacturer,
    os,
    osVersion,
    browser,
    browserVersion,
    userAgent
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { 
      userId, 
      sessionId, 
      clientPublicIp, 
      clientHints, 
      geo, 
      device, 
      browser, 
      os, 
      location, 
      loginTime 
    } = req.body || {};
    
    const realIp = extractClientIp(req, clientPublicIp);
    const parsed = parseDeviceAndBrowser(req, clientHints);

    let finalLocation = location || 'Online';
    let finalCity = undefined;
    let finalRegion = undefined;
    let finalCountry = undefined;
    let finalCountryCode = undefined;
    let finalLat = undefined;
    let finalLon = undefined;
    let finalAccuracy = undefined;
    let locationSource = 'ip';

    if (geo && typeof geo.latitude === 'number' && typeof geo.longitude === 'number') {
      finalLat = geo.latitude;
      finalLon = geo.longitude;
      finalAccuracy = typeof geo.accuracy === 'number' ? geo.accuracy : undefined;
      locationSource = 'gps';

      const geoResult = await reverseGeocodeGps(geo.latitude, geo.longitude);
      finalLocation = geoResult.location;
      finalCity = geoResult.city;
      finalRegion = geoResult.region;
      finalCountry = geoResult.country;
      finalCountryCode = geoResult.countryCode;
    } else {
      const approx = await getApproximateLocation(realIp);
      const locParts = [
        approx.city && approx.city !== 'Unavailable' ? approx.city : '',
        approx.region && approx.region !== 'Unavailable' ? approx.region : '',
        approx.country && approx.country !== 'Unknown' ? approx.country : ''
      ].filter(Boolean);
      finalLocation = locParts.length > 0 ? locParts.join(', ') : (location || 'Online');
      finalCity = approx.city && approx.city !== 'Unavailable' ? approx.city : undefined;
      finalRegion = approx.region && approx.region !== 'Unavailable' ? approx.region : undefined;
      finalCountry = approx.country && approx.country !== 'Unknown' ? approx.country : undefined;
    }

    const resolvedDeviceType = (parsed.category !== 'Unknown' 
      ? parsed.category.toLowerCase() 
      : (device ? device.toLowerCase() : 'desktop'));

    const sessionData = {
      userId: userId || 'local_user',
      sessionId: sessionId || crypto.randomUUID(),
      ip: realIp,
      userAgent: parsed.userAgent,
      device: resolvedDeviceType,
      deviceType: resolvedDeviceType,
      model: parsed.model !== 'Unavailable' ? parsed.model : undefined,
      manufacturer: parsed.manufacturer || undefined,
      browser: parsed.browser || browser || 'Web Browser',
      os: parsed.os !== 'Unknown OS' ? parsed.os : (os || 'Unknown OS'),
      location: finalLocation,
      city: finalCity,
      region: finalRegion,
      country: finalCountry,
      countryCode: finalCountryCode,
      latitude: finalLat,
      longitude: finalLon,
      accuracy: finalAccuracy,
      locationSource,
      loginTime: loginTime || Date.now(),
      lastActive: Date.now(),
      status: 'active',
      isTrusted: false
    };

    return res.status(200).json({ success: true, session: sessionData });
  } catch (error) {
    console.error("API ERROR (/api/auth/login-session):", error);
    return res.status(200).json({ success: true, session: null, note: "Session creation failed but login permitted." });
  }
}
