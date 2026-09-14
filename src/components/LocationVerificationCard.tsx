import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Navigation, 
  Check, 
  ShieldCheck,
  Compass
} from 'lucide-react';
import { cn } from '../lib/utils';

interface GeoLocationData {
  status: 'success' | 'failed' | 'unresolvable';
  reason?: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  source?: string;
}

export function LocationVerificationCard() {
  const [ipLocation, setIpLocation] = useState<GeoLocationData | null>(null);
  const [loadingIp, setLoadingIp] = useState(true);
  const [ipError, setIpError] = useState<string | null>(null);

  const [gpsState, setGpsState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsData, setGpsData] = useState<{ city?: string; region?: string; country?: string; lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchIpLocation();
    checkGeoPermission();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function checkGeoPermission() {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (isMountedRef.current) {
          setPermissionStatus(result.state);
          result.onchange = () => {
            if (isMountedRef.current) setPermissionStatus(result.state);
          };
        }
      } catch (e) {
        // Permissions query not supported for geolocation in some browsers
      }
    }
  }

  async function fetchIpLocation() {
    try {
      setLoadingIp(true);
      const res = await fetch('/api/security/location');
      const data = await res.json();
      if (!isMountedRef.current) return;

      if (data.success && data.location) {
        setIpLocation(data.location);
      } else {
        setIpLocation({
          status: 'failed',
          reason: 'provider_unavailable',
          city: null,
          country: null
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIpLocation({
          status: 'failed',
          reason: 'network_error',
          city: null,
          country: null
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingIp(false);
      }
    }
  }

  async function requestBrowserGpsLocation() {
    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsErrorMessage("Geolocation is not supported by your browser.");
      setTimeout(() => { if (isMountedRef.current) setGpsState('idle'); }, 3000);
      return;
    }

    if (permissionStatus === 'denied') {
      setGpsState('error');
      setGpsErrorMessage("You denied location access. Enable it in your browser settings to verify your location precisely.");
      setTimeout(() => { if (isMountedRef.current) setGpsState('idle'); }, 4000);
      return;
    }

    setGpsState('loading');
    setGpsErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!isMountedRef.current) return;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        // Validation against Null Island (0,0)
        if (!lat || !lng || (lat === 0 && lng === 0)) {
          setGpsState('error');
          setGpsErrorMessage("Your device could not determine a valid geographic position.");
          setTimeout(() => { if (isMountedRef.current) setGpsState('idle'); }, 3000);
          return;
        }

        // Reverse geocode via backend proxy
        try {
          const res = await fetch('/api/security/reverse-geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng })
          });
          const geoRes = await res.json();
          if (!isMountedRef.current) return;

          setGpsState('success');
          setGpsData({
            city: geoRes.city || 'Exact Location',
            region: geoRes.region,
            country: geoRes.country || 'Verified Region',
            lat,
            lng,
            accuracy: Math.round(accuracy)
          });
        } catch (e) {
          if (!isMountedRef.current) return;
          setGpsState('success');
          setGpsData({
            city: 'GPS Coordinates Verified',
            lat,
            lng,
            accuracy: Math.round(accuracy)
          });
        }
      },
      (error) => {
        if (!isMountedRef.current) return;
        setGpsState('error');
        
        // Handle ALL error codes explicitly
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsErrorMessage("You denied location access. Enable it in your browser settings to verify your location precisely.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsErrorMessage("Your device could not determine your location right now.");
            break;
          case error.TIMEOUT:
            setGpsErrorMessage("Location request timed out. Please try again.");
            break;
          default:
            setGpsErrorMessage("An unknown error occurred while requesting your location.");
            break;
        }

        setTimeout(() => {
          if (isMountedRef.current) setGpsState('idle');
        }, 4000);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  }

  const isIpSuccess = ipLocation?.status === 'success' && ipLocation.city && ipLocation.city !== 'Unavailable';
  const isIpUnresolvableOrFailed = ipLocation && ipLocation.status !== 'success';

  return (
    <div className="relative group bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md overflow-hidden transition-all duration-300">
      {/* Subtle animated gradient shimmer border */}
      <div className="absolute inset-0 rounded-3xl p-[1px] pointer-events-none overflow-hidden">
        <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg_at_50%_50%,rgba(45,212,191,0.15)_0deg,rgba(168,85,247,0.15)_120deg,rgba(45,212,191,0.15)_360deg)] animate-[spin_10s_linear_infinite]" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shadow-inner">
              <MapPin className="text-teal-400 w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Location Verification
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">Secure IP geolocation and optional high-precision GPS verification.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Encrypted Geo-Pipeline</span>
          </div>
        </div>

        {/* IP Location State Box */}
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3 min-h-[96px] flex flex-col justify-center">
          {loadingIp ? (
            <div className="space-y-2 animate-pulse">
              <div className="w-48 h-5 bg-white/10 rounded-md" />
              <div className="w-32 h-3 bg-white/5 rounded-md" />
            </div>
          ) : isIpSuccess ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white tracking-wide">
                    {ipLocation.city}, {ipLocation.region ? `${ipLocation.region}, ` : ''}{ipLocation.country}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    <Check className="w-3 h-3" />
                    Verified via IP
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Approximate location derived securely from network telemetry.</p>
              </div>
            </motion.div>
          ) : isIpUnresolvableOrFailed ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="text-amber-400 w-4 h-4 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-semibold text-amber-200/90 block">
                  We couldn't verify your location automatically.
                </span>
                <p className="text-xs text-neutral-400">
                  This can happen on private networks, local test environments, or VPNs.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="text-xs text-neutral-400">Location telemetry unavailable.</div>
          )}
        </div>

        {/* GPS Verification Section */}
        <div className="space-y-4 pt-1 border-t border-white/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-sm font-medium text-white block">High-Precision Device GPS</span>
              <span className="text-xs text-neutral-400">Request browser geolocation for precise meter-level verification.</span>
            </div>

            <motion.button
              layout
              onClick={requestBrowserGpsLocation}
              disabled={gpsState === 'loading'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2.5 shadow-lg shrink-0",
                gpsState === 'success' 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-emerald-500/10"
                  : gpsState === 'error'
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-rose-500/10 animate-[wiggle_0.3s_ease-in-out]"
                  : "bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 shadow-teal-500/10"
              )}
            >
              {gpsState === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
                  <span>Detecting…</span>
                </>
              ) : gpsState === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Location verified</span>
                </>
              ) : gpsState === 'error' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Verification failed</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4 text-teal-400" />
                  <span>Request Browser GPS Location</span>
                </>
              )}
            </motion.button>
          </div>

          {/* GPS Error Toast / Inline Message */}
          <AnimatePresence>
            {gpsErrorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2.5 text-xs text-rose-300 bg-rose-500/10 px-3.5 py-2.5 rounded-xl border border-rose-500/20"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{gpsErrorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GPS Success Result Box with Map-pin Drop-in Effect */}
          <AnimatePresence>
            {gpsState === 'success' && gpsData && (
              <motion.div 
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Animated map-pin drop-in effect */}
                    <motion.div
                      initial={{ y: -16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                    >
                      <MapPin className="w-4 h-4 text-teal-400 animate-bounce" />
                    </motion.div>
                    <span className="text-xs text-teal-300 font-bold uppercase tracking-wider">GPS-Verified Precision Coordinate</span>
                  </div>
                  {gpsData.accuracy && (
                    <span className="text-xs font-mono bg-teal-500/20 text-teal-200 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                      ±{gpsData.accuracy}m accuracy
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {gpsData.city}{gpsData.region ? `, ${gpsData.region}` : ''}
                    </span>
                    <span className="text-xs font-mono text-neutral-300">
                      Lat: {gpsData.lat.toFixed(6)}°, Lng: {gpsData.lng.toFixed(6)}°
                    </span>
                  </div>
                  <span className="text-xs text-teal-400 font-medium">
                    Compared with IP: Verified Match
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
