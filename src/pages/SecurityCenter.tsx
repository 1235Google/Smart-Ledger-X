import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { io } from 'socket.io-client';
import { 
  Shield, 
  Smartphone, 
  Lock, 
  KeyRound, 
  Clock, 
  LogOut, 
  History, 
  Laptop, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  User,
  Monitor,
  Wifi,
  WifiOff,
  MapPin,
  AlertTriangle,
  Loader2,
  Tablet,
  Sparkles,
  Copy,
  ChevronDown,
  Info,
  AlertCircle
} from 'lucide-react';
import { 
  subscribeToLoginHistory, 
  subscribeToUserDevices, 
  revokeUserDevice, 
  revokeAllOtherDevices,
  hashPin,
  verifyPin,
  updateActiveSessionLocation,
  DeviceInfo
} from '../lib/securityService';
import { detectClient, ClientInfo } from '../lib/detectClient';
import { LoginHistoryEntry, UserDevice } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { LocationVerificationCard } from '../components/LocationVerificationCard';

type TabType = 'overview' | 'session' | 'devices' | 'history' | 'autologout' | 'pin';

// BUG FIX: reduced UA / frozen version
// BUG FIX: Chromium vs Chrome brand detection
function BrowserInformationCard() {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    let isMounted = true;
    const loadClient = async () => {
      try {
        setLoading(true);
        const info = await detectClient();
        if (isMounted) {
          setClientInfo(info);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Unable to read browser information');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadClient();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCopyUA = () => {
    if (!clientInfo?.rawUserAgent) return;
    navigator.clipboard.writeText(clientInfo.rawUserAgent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatTz = () => {
    const rawTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const tzName = rawTz === 'Asia/Calcutta' ? 'Asia/Kolkata' : rawTz;
    let offset = 'GMT+0:00';
    try {
      const d = new Date();
      const tzStr = d.toLocaleTimeString('en-US', { timeZone: tzName, timeZoneName: 'shortOffset' });
      const m = tzStr.match(/GMT[+-]\d{1,2}(?::?\d{2})?/);
      if (m) offset = m[0];
    } catch (e) {}
    return `${tzName} (${offset})`;
  };

  if (error) {
    return (
      <div className="bg-white/[0.03] border border-rose-500/30 rounded-3xl p-6 shadow-xl backdrop-blur-md text-center py-10">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h4 className="text-white font-bold text-lg mb-1">Unable to read browser information</h4>
        <p className="text-xs text-neutral-400">{error}</p>
      </div>
    );
  }

  return (
    <motion.div 
      // ANIMATION: Card entrance: fade + slide up 12px, duration 0.5s, ease [0.22, 1, 0.36, 1]
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Browser Information
            <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
          </h3>
          <p className="text-sm text-neutral-400">Advanced client hints telemetry & environment fingerprinting.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* ANIMATION: Layered pulsing dot (solid dot + animate-ping ring) in emerald; switches to amber Offline with a slow pulse */}
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border shadow-sm",
            isOnline 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          )}>
            <span className="relative flex h-2 w-2">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isOnline ? "bg-emerald-400" : "bg-amber-400")} />
              <span className={cn("relative inline-flex rounded-full h-2 w-2", isOnline ? "bg-emerald-500" : "bg-amber-500")} />
            </span>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : clientInfo ? (
        <div className="space-y-3">
          {[
            {
              label: 'BROWSER',
              value: `${clientInfo.browserName} ${clientInfo.browserVersion}`,
              extra: !clientInfo.isTrustworthy && (
                <span title="Your browser does not support Client Hints, so some details are estimated." className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase cursor-help">
                  Estimated
                </span>
              ),
              icon: <Globe className="text-teal-400 w-5 h-5" />
            },
            {
              label: 'OPERATING SYSTEM',
              value: `${clientInfo.osName}${clientInfo.osVersion ? ` ${clientInfo.osVersion}` : ''} (${clientInfo.architecture})`,
              icon: <Monitor className="text-blue-400 w-5 h-5" />
            },
            {
              label: 'DEVICE',
              value: clientInfo.deviceType === 'Unknown' || !clientInfo.deviceType ? (
                <span title="We couldn't confidently detect this device type." className="text-neutral-400 italic cursor-help">
                  Unknown device
                </span>
              ) : clientInfo.deviceType,
              icon: clientInfo.deviceType.toLowerCase().includes('mobile') ? <Smartphone className="text-teal-400 w-5 h-5" /> : clientInfo.deviceType.toLowerCase().includes('tablet') ? <Tablet className="text-teal-400 w-5 h-5" /> : clientInfo.deviceType.toLowerCase().includes('desktop') ? <Monitor className="text-teal-400 w-5 h-5" /> : <AlertCircle className="text-neutral-400 w-5 h-5" />
            },
            {
              label: 'LANGUAGE',
              value: `${navigator.languages?.[0] || navigator.language || 'en-GB'}`,
              icon: <Globe className="text-purple-400 w-5 h-5" />
            },
            {
              label: 'TIME ZONE',
              value: formatTz(),
              icon: <Clock className="text-amber-400 w-5 h-5" />
            },
            {
              label: 'SCREEN',
              value: `${window.screen.width} × ${window.screen.height} @ ${window.devicePixelRatio || 1}x`,
              icon: <Monitor className="text-emerald-400 w-5 h-5" />
            }
          ].map((row, idx) => (
            <motion.div
              key={row.label}
              // ANIMATION: Info rows staggered reveal and row hover teal left-border wipe
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.3 }}
              className="group relative flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-teal-500/40 hover:bg-white/[0.05] transition-all overflow-hidden"
            >
              <div className="absolute inset-y-0 left-0 w-[3px] bg-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3">
                {/* ANIMATION: Browser logo subtle 3s infinite float */}
                <motion.div 
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-inner"
                >
                  {row.icon}
                </motion.div>
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">{row.label}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-semibold text-white">{row.value}</span>
                    {row.extra}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Technical Details Accordion */}
          <div className="pt-2">
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-black/20 hover:bg-black/40 border border-white/5 text-xs font-semibold text-neutral-300 transition-all"
            >
              <span className="flex items-center gap-2">
                <Info size={15} className="text-teal-400" />
                Technical Details & Raw User Agent
              </span>
              {/* ANIMATION: Chevron rotates 180deg */}
              <motion.div animate={{ rotate: showTechDetails ? 180 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
                <ChevronDown size={16} />
              </motion.div>
            </button>

            <AnimatePresence>
              {showTechDetails && (
                <motion.div
                  // ANIMATION: Technical-details accordion height auto-animate via AnimatePresence, spring transition
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">Raw User Agent String</span>
                      {/* ANIMATION: Copy button morph icon from clipboard -> checkmark with a scale bounce */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyUA}
                        className="px-3 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow"
                      >
                        {copied ? <Check size={13} className="text-emerald-400 animate-bounce" /> : <Copy size={13} />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </motion.button>
                    </div>
                    <div className="p-3 rounded-xl bg-black/80 font-mono text-xs text-neutral-300 break-all border border-white/5">
                      {clientInfo.rawUserAgent}
                    </div>
                    <p className="text-[11px] text-neutral-400 italic">
                      Modern browsers report a reduced user agent string. Version numbers here may appear as 0.0.0.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

export default function SecurityCenter() {
  const { 
    securitySettings, 
    updateSecuritySettings, 
    lockApp, 
    currentUser, 
    userProfile,
    logout
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Real-time Firestore & local state
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginHistoryEntry[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Modals state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinLengthChoice, setPinLengthChoice] = useState<4 | 6>(securitySettings.pinLength || 4);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Device revoking state
  const [deviceToRemove, setDeviceToRemove] = useState<UserDevice | null>(null);
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // Browser Data State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [geoLoc, setGeoLoc] = useState<{lat: number, lon: number} | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const currentTimeout = securitySettings.inactivityTimeout ?? 30;
  const isAutoLogout = securitySettings.autoLogoutEnabled !== false;

  // Active user identity details
  const activeUserEmail = currentUser?.email || userProfile?.email || 'Authorized Local User';
  const activeUserUid = currentUser?.uid || 'local_session_user';
  const authProvider = currentUser?.providerData?.[0]?.providerId === 'google.com' 
    ? 'Google' 
    : currentUser?.email 
      ? 'Email & Password' 
      : 'Local Session';

  // Test Email state
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/security/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: activeUserEmail })
      });
      const data = await res.json();
      setTestEmailResult(data);
    } catch (e: any) {
      setTestEmailResult({ success: false, error: e.message });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Subscriptions to Firestore and local telemetry
  useEffect(() => {
    setLoadingDevices(true);
    setLoadingLogs(true);

    const unsubDevices = subscribeToUserDevices(activeUserUid, (data) => {
      setDevices(prev => {
        const merged = [...prev];
        data.forEach(d => {
           if (!merged.find(m => m.id === d.id)) {
              merged.push(d);
           }
        });
        return merged.sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime());
      });
      setLoadingDevices(false);
    });

    const unsubHistory = subscribeToLoginHistory(activeUserUid, (data) => {
      setLoginLogs(data);
      setLoadingLogs(false);
    });

    const socket = io();
    socket.emit('join_user_room', activeUserUid);

    socket.on('new_session', (sessionData) => {
       setDevices(prev => {
          const exists = prev.find(d => d.id === sessionData.sessionId);
          if (exists) {
            return prev.map(d => d.id === sessionData.sessionId ? {
              ...d,
              ...sessionData,
              deviceType: sessionData.deviceType || sessionData.device || d.deviceType,
              model: sessionData.model || d.model,
              manufacturer: sessionData.manufacturer || d.manufacturer,
              location: sessionData.location || d.location,
              ip: sessionData.ip || d.ip,
              browser: sessionData.browser || d.browser,
              os: sessionData.os || d.os,
              lastActive: new Date(sessionData.lastActive || Date.now()).toISOString()
            } : d);
          }
          
          const newDevice: UserDevice = {
             id: sessionData.sessionId,
             userId: sessionData.userId,
             deviceId: sessionData.sessionId,
             deviceName: sessionData.browser + ' on ' + sessionData.os,
             deviceType: sessionData.deviceType || sessionData.device || 'desktop',
             model: sessionData.model,
             manufacturer: sessionData.manufacturer,
             browser: sessionData.browser,
             os: sessionData.os,
             ip: sessionData.ip,
             location: sessionData.location,
             city: sessionData.city,
             region: sessionData.region,
             country: sessionData.country,
             countryCode: sessionData.countryCode,
             latitude: sessionData.latitude,
             longitude: sessionData.longitude,
             accuracy: sessionData.accuracy,
             locationSource: sessionData.locationSource,
             lastActive: new Date(sessionData.lastActive || Date.now()).toISOString(),
             createdAt: new Date(sessionData.loginTime || Date.now()).toISOString(),
             isCurrent: false,
             status: sessionData.status
          };
          return [newDevice, ...prev];
       });
    });

    socket.on('session_updated', (updateData) => {
       setDevices(prev => prev.map(d => 
          d.id === updateData.sessionId ? { 
            ...d, 
            ...updateData,
            lastActive: new Date(updateData.lastActive || Date.now()).toISOString() 
          } : d
       ));
    });

    socket.on('session_activity', ({ sessionId, lastActive }) => {
       setDevices(prev => prev.map(d => 
          d.id === sessionId ? { ...d, lastActive: new Date(lastActive).toISOString() } : d
       ));
    });

    return () => {
      unsubDevices();
      unsubHistory();
      socket.disconnect();
    };
  }, [activeUserUid]);

  useEffect(() => {
    const handleDeviceUpdate = (e: any) => {
      if (e.detail && e.detail.id) {
        setDevices(prev => prev.map(d => (d.id === e.detail.id || d.deviceId === e.detail.deviceId) ? { ...d, ...e.detail } : d));
      }
    };
    window.addEventListener('smartledger:device_updated', handleDeviceUpdate);
    return () => window.removeEventListener('smartledger:device_updated', handleDeviceUpdate);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        // BUG FIX: validate coordinates != 0,0
        if (lat === 0 && lon === 0) {
          setGeoError("Location unavailable (Null Island detected)");
          return;
        }

        setGeoLoc({ lat, lon });
        setGeoError(null);

        try {
          const updated = await updateActiveSessionLocation({
            latitude: lat,
            longitude: lon,
            accuracy
          });
          if (updated) {
            setDevices(prev => prev.map(d => (d.isCurrent || d.id === updated.id) ? { ...d, ...updated } : d));
          }
        } catch (e) {}
      },
      () => {
        setGeoError("Location unavailable (Permission denied or blocked).");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((status) => {
        if (status.state === 'granted') {
          requestLocation();
        }
      }).catch(() => {});
    }
  }, []);

  const handleTimeoutChange = (minutes: number) => {
    updateSecuritySettings({
      inactivityTimeout: minutes,
      autoLogoutEnabled: minutes > 0
    });
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (securitySettings.pinEnabled && securitySettings.pin) {
      const isMatch = verifyPin(currentPinInput, securitySettings.pin);
      if (!isMatch) {
        setPinError('Current PIN is incorrect.');
        return;
      }
    }

    if (newPinInput.length !== pinLengthChoice) {
      setPinError(`New PIN must be exactly ${pinLengthChoice} digits.`);
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setPinError('New PINs do not match.');
      return;
    }

    const hashed = hashPin(newPinInput);
    updateSecuritySettings({
      pin: hashed,
      pinLength: pinLengthChoice,
      pinEnabled: true
    });

    setPinSuccess('PIN updated successfully!');
    setTimeout(() => {
      setShowPinModal(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinSuccess('');
      setPinError('');
    }, 1200);
  };
  
  const handleRemovePin = () => {
    if (securitySettings.pinEnabled && securitySettings.pin) {
        const isMatch = verifyPin(currentPinInput, securitySettings.pin);
        if (!isMatch) {
            setPinError('Current PIN is incorrect.');
            return;
        }
    }
    updateSecuritySettings({
        pin: undefined,
        pinEnabled: false
    });
    setPinSuccess('PIN removed successfully!');
    setTimeout(() => {
      setShowPinModal(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinSuccess('');
      setPinError('');
    }, 1200);
  };

  const handleConfirmRevokeDevice = async () => {
    if (!deviceToRemove) return;
    setIsRevokingId(deviceToRemove.id);
    
    try {
      await revokeUserDevice(activeUserUid, deviceToRemove.id);
      if (deviceToRemove.isCurrent) {
          logout();
      }
    } finally {
      setIsRevokingId(null);
      setDeviceToRemove(null);
    }
  };

  const handleRevokeAllOther = async () => {
    setIsRevokingAll(true);
    try {
      await revokeAllOtherDevices(activeUserUid);
    } finally {
      setIsRevokingAll(false);
      setShowRevokeAllModal(false);
    }
  };

  const activeDevices = devices.filter(d => d.status === 'active');
  const activeDeviceCount = activeDevices.length;
  const lastSignIn = loginLogs.length > 0 ? loginLogs[0].timestamp : null;

  // Render correct device icon based on device type
  const renderDeviceIcon = (type?: string, isCurrent?: boolean) => {
    const t = (type || 'unknown').toLowerCase();
    if (t.includes('mobile')) return <Smartphone className="text-teal-400" size={24} />;
    if (t.includes('tablet')) return <Tablet className="text-teal-400" size={24} />;
    if (t.includes('desktop')) return <Monitor className="text-teal-400" size={24} />;
    if (t.includes('wearable') || t.includes('xr')) return <Sparkles className="text-teal-400" size={24} />;
    if (t.includes('tv')) return <Globe className="text-teal-400" size={24} />;
    return <AlertCircle className="text-neutral-400" size={24} />;
  };

  return (
    <div className="relative min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 overflow-hidden">
      {/* CINEMATIC UI: Animated Gradient Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-2/3 right-1/3 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[130px] animate-pulse" style={{ animationDuration: '7s' }} />
      </div>

      {/* Main Container with Soft Ambient Glow Border */}
      <div className="relative p-[1px] rounded-[32px] bg-gradient-to-r from-teal-500/30 via-purple-500/30 to-blue-500/30 shadow-2xl">
        <div className="bg-[#0b0f19]/90 backdrop-blur-2xl rounded-[31px] p-6 sm:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-4"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1], 
                  filter: [
                    'drop-shadow(0 0 10px rgba(20,184,166,0.3))', 
                    'drop-shadow(0 0 22px rgba(20,184,166,0.6))', 
                    'drop-shadow(0 0 10px rgba(20,184,166,0.3))'
                  ] 
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 shadow-inner"
              >
                <Shield className="text-teal-400" size={30} />
              </motion.div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Security Center
                  <Sparkles className="w-5 h-5 text-teal-400 animate-pulse" />
                </h1>
                <p className="text-sm text-neutral-400 mt-0.5">
                  Manage your account security, active device sessions, and privacy telemetry in real-time.
                </p>
              </div>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSendTestEmail}
              disabled={isSendingTestEmail}
              className="px-4 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-sm font-semibold flex items-center gap-2 transition-all shadow-lg"
            >
              {isSendingTestEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              <span>Test Security Email</span>
            </motion.button>
          </div>

          {testEmailResult && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={cn("p-3 rounded-xl text-xs font-medium border", testEmailResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300")}>
              {testEmailResult.success ? "✓ Test security alert email dispatched successfully!" : `✕ Failed to send test email: ${testEmailResult.error}`}
            </motion.div>
          )}

          {/* Navigation Tabs with Sliding Pill Indicator */}
          <div className="relative flex flex-wrap items-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
            {[
              { id: 'overview', label: 'Overview', icon: Shield },
              { id: 'session', label: 'Current Session', icon: Globe },
              { id: 'devices', label: 'Active Sessions', icon: Laptop },
              { id: 'history', label: 'Login History', icon: History },
              { id: 'autologout', label: 'Auto Logout', icon: Clock },
              { id: 'pin', label: 'App Lock', icon: KeyRound }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors z-10",
                    isActive ? "text-teal-300" : "text-neutral-400 hover:text-white"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-blue-500/20 border border-teal-500/40 rounded-xl shadow-lg -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("w-4 h-4 transition-transform", isActive && "rotate-6")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <User className="text-teal-400 w-5 h-5" />
                    Account Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-neutral-400">Signed-in account</span>
                      <span className="text-white font-medium">{activeUserEmail}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-neutral-400">Sign-in method</span>
                      <span className="text-white font-medium">{authProvider}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-neutral-400">Current session status</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Active & Secure
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-neutral-400">Last sign-in time</span>
                      <span className="text-white font-medium">{lastSignIn ? format(new Date(lastSignIn), 'PP p') : 'Just now'}</span>
                    </div>
                    <div className="flex justify-between pb-3">
                      <span className="text-neutral-400">Active sessions</span>
                      <span className="text-teal-400 font-bold">{activeDeviceCount || 1} active device(s)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Shield className="text-teal-400 w-5 h-5" />
                    Security Recommendations
                  </h3>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/30 border border-white/5">
                      <div className="flex items-center gap-3">
                        <KeyRound className={securitySettings.pinEnabled ? "text-teal-400" : "text-neutral-500"} />
                        <div>
                          <span className="text-white font-medium block">App Lock (PIN)</span>
                          <span className="text-xs text-neutral-400">Protect app access with a secure PIN</span>
                        </div>
                      </div>
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase", securitySettings.pinEnabled ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "bg-white/5 text-neutral-400")}>
                        {securitySettings.pinEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/30 border border-white/5">
                      <div className="flex items-center gap-3">
                        <Clock className={isAutoLogout ? "text-teal-400" : "text-neutral-500"} />
                        <div>
                          <span className="text-white font-medium block">Inactivity Auto-Logout</span>
                          <span className="text-xs text-neutral-400">Lock session after inactivity</span>
                        </div>
                      </div>
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase", isAutoLogout ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "bg-white/5 text-neutral-400")}>
                        {isAutoLogout ? `${currentTimeout}m` : 'Off'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: CURRENT SESSION */}
          {activeTab === 'session' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
               <BrowserInformationCard />
              
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                 <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                   <MapPin className="text-teal-400" size={20} />
                   Location Verification
                 </h3>
                 <p className="text-sm text-neutral-400 mb-4">
                   IP-based geolocation is resolved securely on the backend. You can also request precise browser GPS coordinates.
                 </p>
                 {geoLoc ? (
                   <div className="p-4 rounded-2xl bg-black/30 border border-teal-500/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">GPS Verified Coordinates</span>
                        <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      </div>
                      <span className="text-sm text-white font-mono">Lat: {geoLoc.lat.toFixed(6)}°, Lon: {geoLoc.lon.toFixed(6)}°</span>
                   </div>
                 ) : (
                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                     <button onClick={requestLocation} className="px-5 py-2.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl font-semibold text-sm hover:bg-teal-500/30 transition-all shadow-lg">
                       Request Browser GPS Location
                     </button>
                     {geoError ? (
                       <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                         <AlertTriangle className="w-4 h-4 shrink-0" />
                         <span>{geoError}</span>
                       </div>
                     ) : (
                       <div className="flex items-center gap-2 text-xs text-neutral-400">
                         <AlertTriangle className="w-4 h-4 text-amber-400" />
                         <span>Location unavailable / using IP fallback</span>
                       </div>
                     )}
                   </div>
                 )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: ACTIVE SESSIONS */}
          {activeTab === 'devices' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                 <div className="flex items-center justify-between mb-4">
                     <div>
                       <h3 className="text-lg font-bold text-white">Active Sessions</h3>
                       <p className="text-xs text-neutral-400 mt-0.5">Real-time telemetry and active device connections.</p>
                     </div>
                     {activeDevices.length > 1 && (
                         <button 
                           onClick={() => setShowRevokeAllModal(true)} 
                           disabled={isRevokingAll}
                           className="px-4 py-2 text-xs sm:text-sm bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 rounded-xl font-semibold transition-all flex items-center gap-2"
                         >
                           {isRevokingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                           <span>Sign Out All Other Sessions</span>
                         </button>
                     )}
                 </div>
              
              {loadingDevices ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-5 rounded-2xl bg-black/20 border border-white/5 animate-pulse flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/5" />
                        <div className="space-y-2">
                          <div className="w-48 h-4 bg-white/10 rounded" />
                          <div className="w-32 h-3 bg-white/5 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeDevices.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-sm">No active sessions found.</div>
              ) : (
                <div className="space-y-4">
                  {activeDevices.map((device, index) => (
                    <motion.div 
                      key={device.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -3, scale: 1.005 }}
                      className={cn(
                        "p-5 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md shadow-lg",
                        device.isCurrent ? "bg-teal-600/10 border-teal-500/40" : "bg-black/30 border-white/10 hover:border-teal-500/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                         <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20">
                           {renderDeviceIcon(device.deviceType, device.isCurrent)}
                         </div>
                         <div>
                           <div className="flex flex-wrap items-center gap-2 mb-1">
                             <h4 className="text-white font-bold">{device.browser || 'Browser'} on {device.os || 'OS'}</h4>
                             
                             {/* ACTIVE BADGE with live pulsing green dot */}
                             <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1.5">
                               <span className="relative flex h-2 w-2">
                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                               </span>
                               Active
                             </span>

                             {device.isCurrent && (
                               <span className="relative overflow-hidden px-2.5 py-0.5 rounded-full bg-gradient-to-r from-teal-500/30 to-blue-500/30 text-teal-200 border border-teal-400/40 text-[10px] font-extrabold uppercase tracking-wider">
                                 This Device
                               </span>
                             )}
                           </div>

                           <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-teal-300 font-medium mt-1">
                             {/* Location Label (Primary: City, Country) */}
                             <div className="flex items-center gap-1.5">
                               <MapPin size={14} className="text-teal-400 shrink-0" />
                               <span>
                                 {device.location && device.location !== 'Unknown' && device.location !== 'Location unavailable'
                                   ? device.location
                                   : 'Location unavailable'}
                               </span>
                             </div>

                             {device.ip && device.ip !== 'Detecting...' && (
                               <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-xs">
                                 <Globe size={13} className="text-neutral-500" />
                                 {device.ip}
                               </div>
                             )}
                           </div>

                           <div className="text-xs text-neutral-400 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                             <span><strong className="text-neutral-300">Signed in:</strong> {format(new Date(device.createdAt || Date.now()), 'MMM d, yyyy h:mm a')}</span>
                             <span><strong className="text-neutral-300">Last active:</strong> {format(new Date(device.lastActive || Date.now()), 'MMM d, yyyy h:mm a')}</span>
                           </div>
                         </div>
                      </div>

                      <motion.button 
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setDeviceToRemove(device)}
                          disabled={isRevokingId === device.id}
                          className="px-4 py-2 text-xs sm:text-sm text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all font-semibold whitespace-nowrap flex items-center gap-2"
                      >
                          {isRevokingId === device.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                          <span>Sign Out</span>
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: LOGIN HISTORY */}
          {activeTab === 'history' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-1">Login History</h3>
                <p className="text-sm text-neutral-400 mb-6">Recent authentication attempts recorded securely by our backend.</p>

                {loadingLogs ? (
                   <div className="text-neutral-400 text-sm py-8 text-center">Loading login history...</div>
                 ) : loginLogs.length === 0 ? (
                   <div className="text-neutral-400 text-sm py-8 text-center">No login history available.</div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm text-neutral-300">
                       <thead className="bg-black/30 text-neutral-400 text-xs uppercase tracking-wider">
                         <tr>
                           <th className="px-4 py-3.5 rounded-l-xl font-semibold">Date & Time</th>
                           <th className="px-4 py-3.5 font-semibold">Status</th>
                           <th className="px-4 py-3.5 font-semibold">Method</th>
                           <th className="px-4 py-3.5 rounded-r-xl font-semibold">Location & Device</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                         {loginLogs.map((log) => (
                           <tr key={log.id} className="hover:bg-white/5 transition-colors">
                             <td className="px-4 py-3.5 whitespace-nowrap text-xs sm:text-sm text-neutral-300">{format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}</td>
                             <td className="px-4 py-3.5 text-xs sm:text-sm">
                               {log.status === 'Success' ? (
                                 <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                                   <CheckCircle2 size={14} /> Success
                                 </span>
                               ) : (
                                 <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium">
                                   <XCircle size={14} /> Failed
                                 </span>
                               )}
                             </td>
                             <td className="px-4 py-3.5 text-xs sm:text-sm text-neutral-300">{log.method || 'Unknown'}</td>
                             <td className="px-4 py-3.5">
                               <div className="font-medium text-white text-xs sm:text-sm">{log.browser} on {log.os}</div>
                               <div className="text-xs text-teal-300/80 mt-0.5 flex items-center gap-1">
                                 <MapPin size={12} className="text-teal-400 shrink-0" />
                                 <span>{log.location && log.location !== 'Unknown' ? log.location : 'Location unavailable'}</span>
                               </div>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: AUTO LOGOUT */}
          {activeTab === 'autologout' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-1">Auto Logout Settings</h3>
                <p className="text-sm text-neutral-400 mb-6">Automatically lock and sign out your session after a period of inactivity.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Off', minutes: 0 },
                    { label: '5 minutes', minutes: 5 },
                    { label: '15 minutes', minutes: 15 },
                    { label: '30 minutes', minutes: 30 },
                    { label: '1 hour', minutes: 60 }
                  ].map((opt) => {
                    const isSelected = (!isAutoLogout && opt.minutes === 0) || (isAutoLogout && currentTimeout === opt.minutes);
                    return (
                      <motion.button
                        key={opt.minutes}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTimeoutChange(opt.minutes)}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all backdrop-blur-md",
                          isSelected 
                            ? "bg-teal-500/20 border-teal-500/50 text-teal-200 shadow-lg shadow-teal-500/10"
                            : "bg-black/30 border-white/5 hover:border-white/20 text-neutral-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{opt.label}</span>
                          {isSelected && <Check className="w-5 h-5 text-teal-400" />}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: PIN / APP LOCK */}
          {activeTab === 'pin' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                 <h3 className="text-lg font-bold text-white mb-1">App Lock (PIN)</h3>
                 <p className="text-sm text-neutral-400 mb-6">Require a secure PIN to unlock Smart Ledger X when opened or after inactivity.</p>
                 
                 <div className="flex flex-col sm:flex-row gap-4">
                   {securitySettings.pinEnabled ? (
                     <>
                       <button 
                         onClick={() => setShowPinModal(true)}
                         className="px-6 py-3 rounded-xl bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 font-semibold border border-teal-500/30 transition-all shadow-lg"
                       >
                         Change PIN
                       </button>
                       <button 
                         onClick={lockApp}
                         className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 font-semibold transition-all"
                       >
                         Lock App Now
                       </button>
                     </>
                   ) : (
                     <button 
                       onClick={() => setShowPinModal(true)}
                       className="px-6 py-3 rounded-xl bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 font-semibold border border-teal-500/30 transition-all shadow-lg"
                     >
                       Set Up PIN Lock
                     </button>
                   )}
                 </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* MODALS WITH CINEMATIC BLUR BACKDROP & SCALE ENTRANCE */}
      <AnimatePresence>
        {deviceToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              onClick={() => setDeviceToRemove(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.92, y: 10 }} 
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative bg-[#0b0f19] border border-white/15 rounded-[28px] p-6 max-w-sm w-full shadow-2xl backdrop-blur-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Sign Out Session?</h3>
              <p className="text-sm text-neutral-400 mb-6">
                Are you sure you want to sign out <strong>{deviceToRemove.deviceName || deviceToRemove.browser}</strong>? This session will be terminated immediately.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeviceToRemove(null)} 
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmRevokeDevice} 
                  disabled={isRevokingId !== null}
                  className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                >
                  {isRevokingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRevokeAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              onClick={() => setShowRevokeAllModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.92, y: 10 }} 
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative bg-[#0b0f19] border border-white/15 rounded-[28px] p-6 max-w-sm w-full shadow-2xl backdrop-blur-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Sign Out Other Sessions?</h3>
              <p className="text-sm text-neutral-400 mb-6">
                Are you sure you want to sign out all other active sessions? Your current session will remain active.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRevokeAllModal(false)} 
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRevokeAllOther} 
                  disabled={isRevokingAll}
                  className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                >
                  {isRevokingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  <span>Sign Out All Others</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              onClick={() => setShowPinModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.92, y: 10 }} 
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative bg-[#0b0f19] border border-white/15 rounded-[28px] p-6 max-w-sm w-full shadow-2xl backdrop-blur-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">{securitySettings.pinEnabled ? 'Change PIN' : 'Set Up PIN'}</h3>
              <p className="text-sm text-neutral-400 mb-6">Enter a secure PIN to protect your Smart Ledger X account.</p>
              
              <form onSubmit={handleSavePin} className="space-y-4">
                {securitySettings.pinEnabled && (
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Current PIN</label>
                    <input 
                      type="password" 
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-center tracking-widest text-lg font-mono"
                      maxLength={securitySettings.pinLength || 4}
                      required
                    />
                  </div>
                )}
                
                {!securitySettings.pinEnabled && (
                  <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => setPinLengthChoice(4)} className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all", pinLengthChoice === 4 ? "bg-teal-500/20 text-teal-300 border border-teal-500/40" : "bg-white/5 text-neutral-400")}>4 Digits</button>
                    <button type="button" onClick={() => setPinLengthChoice(6)} className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all", pinLengthChoice === 6 ? "bg-teal-500/20 text-teal-300 border border-teal-500/40" : "bg-white/5 text-neutral-400")}>6 Digits</button>
                  </div>
                )}

                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">New PIN</label>
                  <input 
                    type="password" 
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-center tracking-widest text-lg font-mono"
                    maxLength={pinLengthChoice}
                    minLength={pinLengthChoice}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Confirm New PIN</label>
                  <input 
                    type="password" 
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-center tracking-widest text-lg font-mono"
                    maxLength={pinLengthChoice}
                    minLength={pinLengthChoice}
                    required
                  />
                </div>

                {pinError && <p className="text-rose-400 text-xs font-medium">{pinError}</p>}
                {pinSuccess && <p className="text-emerald-400 text-xs font-medium">{pinSuccess}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all">Cancel</button>
                  {securitySettings.pinEnabled && (
                      <button type="button" onClick={handleRemovePin} className="flex-1 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium border border-rose-500/30 transition-all">Remove</button>
                  )}
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold shadow-lg shadow-teal-500/20 transition-all">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
