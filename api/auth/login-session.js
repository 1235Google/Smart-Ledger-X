import crypto from "crypto";
import { extractClientIp, parseDeviceAndBrowser, reverseGeocodeGps, getApproximateLocation } from "../../src/server/security-service.js";

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
    } = req.body;
    
    // Extract Real Public Client IP
    const realIp = extractClientIp(req); // Note: Simplified in serverless
    
    // Parse Real Device, OS, Browser, Model via Client Hints & Headers
    const parsed = parseDeviceAndBrowser(req, clientHints);

    // Location
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
        approx.city !== 'Unavailable' ? approx.city : '',
        approx.region !== 'Unavailable' ? approx.region : '',
        approx.country !== 'Unknown' ? approx.country : ''
      ].filter(Boolean);
      finalLocation = locParts.length > 0 ? locParts.join(', ') : (location || 'Online');
      finalCity = approx.city !== 'Unavailable' ? approx.city : undefined;
      finalRegion = approx.region !== 'Unavailable' ? approx.region : undefined;
      finalCountry = approx.country !== 'Unknown' ? approx.country : undefined;
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
    // Non-blocking requirement
    return res.status(200).json({ success: true, session: null, note: "Session creation failed but login permitted." });
  }
}
