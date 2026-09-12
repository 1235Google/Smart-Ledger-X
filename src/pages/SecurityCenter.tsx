import AnimatedDeviceGraphic from "../components/AnimatedDeviceGraphic";
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
  MapPin
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
import { LoginHistoryEntry, UserDevice } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

type TabType = 'overview' | 'session' | 'devices' | 'history' | 'autologout' | 'pin';

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
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);

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

  // Subscriptions to Firestore and local telemetry
  useEffect(() => {
    setLoadingDevices(true);
    setLoadingLogs(true);

    // Initial load and backup listener
    const unsubDevices = subscribeToUserDevices(activeUserUid, (data) => {
      setDevices(prev => {
        // Only update if we don't have these already from socket, or just merge
        // A simple merge favoring newest data
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

    // Real-time WebSockets (Socket.IO) for instant session push notifications (100-500ms)
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
        setGeoError("Location not shared.");
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

  // Handle Timeout Change
  const handleTimeoutChange = (minutes: number) => {
    updateSecuritySettings({
      inactivityTimeout: minutes,
      autoLogoutEnabled: minutes > 0
    });
  };

  // Handle PIN Setup/Change Form
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
    
    await revokeUserDevice(activeUserUid, deviceToRemove.id);
    if (deviceToRemove.isCurrent) {
        logout();
    }
    setDeviceToRemove(null);
  };

  const handleRevokeAllOther = async () => {
    await revokeAllOtherDevices(activeUserUid);
    setShowRevokeAllModal(false);
  };

  const activeDevices = devices.filter(d => d.status === 'active');
  const activeDeviceCount = activeDevices.length;
  const lastSignIn = loginLogs.length > 0 ? loginLogs[0].timestamp : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="text-emerald-400" size={28} />
            Security Center
          </h1>
          <p className="text-neutral-400 mt-1">
            Manage your account security, active sessions, and privacy settings.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
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
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap",
                isActive 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Account Information</h3>
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
                  <span className="text-emerald-400 font-medium">Active</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Last sign-in time</span>
                  <span className="text-white font-medium">{lastSignIn ? format(new Date(lastSignIn), 'PP p') : 'Not available'}</span>
                </div>
                <div className="flex justify-between pb-3">
                  <span className="text-neutral-400">Active sessions</span>
                  <span className="text-white font-medium">{activeDeviceCount || 'Not available'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Security Recommendations</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-3">
                    <KeyRound className={securitySettings.pinEnabled ? "text-emerald-400" : "text-neutral-500"} />
                    <span className="text-white font-medium">PIN Lock</span>
                  </div>
                  <span className={securitySettings.pinEnabled ? "text-emerald-400 text-sm" : "text-neutral-400 text-sm"}>
                    {securitySettings.pinEnabled ? 'On' : 'Off'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Clock className={isAutoLogout ? "text-emerald-400" : "text-neutral-500"} />
                    <span className="text-white font-medium">Auto Logout</span>
                  </div>
                  <span className={isAutoLogout ? "text-emerald-400 text-sm" : "text-neutral-400 text-sm"}>
                    {isAutoLogout ? `${currentTimeout} min` : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'session' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
             <h3 className="text-lg font-bold text-white mb-4">Browser Information</h3>
             <p className="text-sm text-neutral-400 mb-6">This information is reported by your browser.</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Browser / User Agent</span>
                  <span className="text-sm text-white">{navigator.userAgent}</span>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Language</span>
                  <span className="text-sm text-white">{navigator.language || 'Not available'}</span>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Time Zone</span>
                  <span className="text-sm text-white">{Intl.DateTimeFormat().resolvedOptions().timeZone || 'Not available'}</span>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Screen Size</span>
                  <span className="text-sm text-white">{window.screen.width}x{window.screen.height}</span>
                </div>
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Status</span>
                    <span className="text-sm text-white">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                  {isOnline ? <Wifi className="text-emerald-400" /> : <WifiOff className="text-rose-400" />}
                </div>
             </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
             <h3 className="text-lg font-bold text-white mb-4">Location</h3>
             <p className="text-sm text-neutral-400 mb-4">
               We can request your location through the browser to verify your login area. 
               This requires your permission.
             </p>
             {geoLoc ? (
               <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Coordinates</span>
                  <span className="text-sm text-white">Lat: {geoLoc.lat.toFixed(4)}, Lon: {geoLoc.lon.toFixed(4)}</span>
               </div>
             ) : (
               <div className="flex items-center gap-4">
                 <button onClick={requestLocation} className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-medium text-sm hover:bg-blue-600/30">
                   Request Location Permission
                 </button>
                 {geoError && <span className="text-sm text-rose-400">{geoError}</span>}
               </div>
             )}
          </div>
        </motion.div>
      )}

      {activeTab === 'devices' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
             <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-white">Active Sessions</h3>
                 {activeDevices.length > 1 && (
                     <button onClick={() => setShowRevokeAllModal(true)} className="px-4 py-2 text-sm bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-xl font-medium">
                         Sign Out Other Sessions
                     </button>
                 )}
             </div>
             <p className="text-sm text-neutral-400 mb-6">These sessions are currently signed in to your account. This data is recorded by our backend.</p>
             
             {loadingDevices ? (
               <div className="text-neutral-400 text-sm">Loading sessions...</div>
             ) : activeDevices.length === 0 ? (
               <div className="text-neutral-400 text-sm">No active sessions found.</div>
             ) : (
               <div className="space-y-4">
                 {activeDevices.map((device) => (
                   <div key={device.id} className={cn(
                     "p-5 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                     device.isCurrent ? "bg-blue-600/10 border-blue-500/30" : "bg-black/20 border-white/5"
                   )}>
                     <div className="flex items-center gap-4">
                        <div className="shrink-0 flex items-center justify-center w-16 h-16">
                          <AnimatedDeviceGraphic type={device.deviceType} isCurrent={device.isCurrent} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="text-white font-bold">{device.browser} on {device.os}</h4>
                            {device.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                                This Device
                              </span>
                            )}
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              device.status === 'Suspicious' ? "bg-amber-500/20 text-amber-400" :
                              device.status === 'Blocked' ? "bg-rose-500/20 text-rose-400" :
                              "bg-blue-500/20 text-blue-400"
                            )}>
                              {device.status || 'Active'}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-300 font-mono mb-1">
                            ID: {device.id}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-indigo-300 font-medium">
                            {device.location && device.location !== 'Unknown' && (
                              <div className="flex items-center gap-1.5">
                                <MapPin size={14} className="text-indigo-400" />
                                {device.location}
                              </div>
                            )}
                            {device.ip && device.ip !== 'Detecting...' && (
                              <div className="flex items-center gap-1.5">
                                <Globe size={14} className="text-indigo-400" />
                                {device.ip}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                            <span><strong className="text-neutral-300">Signed in:</strong> {format(new Date(device.createdAt), 'MMM d, yyyy h:mm:ss.SSS a')}</span>
                            <span><strong className="text-neutral-300">Last active:</strong> {format(new Date(device.lastActive), 'MMM d, yyyy h:mm:ss a')}</span>
                            <span><strong className="text-neutral-300">Device:</strong> <span className="capitalize">{device.model ? (device.manufacturer && !device.model.toLowerCase().includes(device.manufacturer.toLowerCase()) ? `${device.manufacturer} ${device.model}` : device.model) : (device.deviceType || 'Unknown')}</span></span>
                          </div>
                        </div>
                     </div>
                     <button 
                         onClick={() => setDeviceToRemove(device)}
                         className="px-4 py-2 text-sm text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors font-medium whitespace-nowrap"
                     >
                         Sign Out
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Login History</h3>
            <p className="text-sm text-neutral-400 mb-6">Recent authentication attempts recorded by our backend.</p>

            {loadingLogs ? (
               <div className="text-neutral-400 text-sm">Loading history...</div>
             ) : loginLogs.length === 0 ? (
               <div className="text-neutral-400 text-sm">No login history available.</div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-neutral-300">
                   <thead className="bg-black/20 text-neutral-500 text-xs uppercase">
                     <tr>
                       <th className="px-4 py-3 rounded-l-xl font-medium">Date & Time</th>
                       <th className="px-4 py-3 font-medium">Status</th>
                       <th className="px-4 py-3 font-medium">Method</th>
                       <th className="px-4 py-3 rounded-r-xl font-medium">Location & Device</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {loginLogs.map((log) => (
                       <tr key={log.id} className="hover:bg-white/5">
                         <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm">{format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}</td>
                         <td className="px-4 py-3 text-xs sm:text-sm">
                           {log.status === 'Success' ? (
                             <span className="text-emerald-400 font-medium">Success</span>
                           ) : (
                             <span className="text-rose-400 font-medium">Failed</span>
                           )}
                         </td>
                         <td className="px-4 py-3 text-xs sm:text-sm">{log.method || 'Unknown'}</td>
                         <td className="px-4 py-3">
                           <div className="font-medium text-white text-xs sm:text-sm">{log.browser} on {log.os}</div>
                           {log.location && log.location !== 'Unknown' && (
                             <div className="text-xs text-indigo-300/80 mt-0.5 flex items-center gap-1">
                               <MapPin size={10} /> {log.location}
                             </div>
                           )}
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

      {activeTab === 'autologout' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Auto Logout</h3>
            <p className="text-sm text-neutral-400 mb-6">Automatically sign out after a period of inactivity.</p>

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
                  <button
                    key={opt.minutes}
                    onClick={() => handleTimeoutChange(opt.minutes)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      isSelected 
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : "bg-black/20 border-white/5 hover:border-white/20 text-neutral-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{opt.label}</span>
                      {isSelected && <Check className="w-5 h-5 text-emerald-400" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'pin' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
             <h3 className="text-lg font-bold text-white mb-1">App Lock (PIN)</h3>
             <p className="text-sm text-neutral-400 mb-6">Require a PIN to unlock the app when it is opened or after auto-logout.</p>
             
             <div className="flex flex-col sm:flex-row gap-4">
               {securitySettings.pinEnabled ? (
                 <>
                   <button 
                     onClick={() => setShowPinModal(true)}
                     className="px-6 py-3 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 font-semibold border border-blue-500/30"
                   >
                     Change PIN
                   </button>
                   <button 
                     onClick={lockApp}
                     className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 font-semibold"
                   >
                     Lock App Now
                   </button>
                 </>
               ) : (
                 <button 
                   onClick={() => setShowPinModal(true)}
                   className="px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold border border-emerald-500/30"
                 >
                   Set Up PIN
                 </button>
               )}
             </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {deviceToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeviceToRemove(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative vision-glass rounded-[24px] p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-white mb-2">Sign Out Session?</h3>
              <p className="text-sm text-neutral-400 mb-6">
                Are you sure you want to sign out <strong>{deviceToRemove.deviceName || deviceToRemove.browser}</strong>? This session will be terminated immediately.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeviceToRemove(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium">Cancel</button>
                <button onClick={handleConfirmRevokeDevice} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium">Sign Out</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRevokeAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRevokeAllModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative vision-glass rounded-[24px] p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-white mb-2">Sign Out Other Sessions?</h3>
              <p className="text-sm text-neutral-400 mb-6">
                Are you sure you want to sign out all other active sessions? Your current session will remain active.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowRevokeAllModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium">Cancel</button>
                <button onClick={handleRevokeAllOther} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium">Sign Out All Others</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPinModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative vision-glass rounded-[24px] p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-white mb-2">{securitySettings.pinEnabled ? 'Change PIN' : 'Set Up PIN'}</h3>
              <p className="text-sm text-neutral-400 mb-6">Enter a secure PIN to protect your account.</p>
              
              <form onSubmit={handleSavePin} className="space-y-4">
                {securitySettings.pinEnabled && (
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Current PIN</label>
                    <input 
                      type="password" 
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                      maxLength={securitySettings.pinLength || 4}
                      required
                    />
                  </div>
                )}
                
                {!securitySettings.pinEnabled && (
                  <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => setPinLengthChoice(4)} className={cn("flex-1 py-2 rounded-lg text-sm font-medium", pinLengthChoice === 4 ? "bg-emerald-600 text-white" : "bg-white/5 text-neutral-400")}>4 Digits</button>
                    <button type="button" onClick={() => setPinLengthChoice(6)} className={cn("flex-1 py-2 rounded-lg text-sm font-medium", pinLengthChoice === 6 ? "bg-emerald-600 text-white" : "bg-white/5 text-neutral-400")}>6 Digits</button>
                  </div>
                )}

                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">New PIN</label>
                  <input 
                    type="password" 
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    maxLength={pinLengthChoice}
                    minLength={pinLengthChoice}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Confirm New PIN</label>
                  <input 
                    type="password" 
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    maxLength={pinLengthChoice}
                    minLength={pinLengthChoice}
                    required
                  />
                </div>

                {pinError && <p className="text-rose-400 text-sm">{pinError}</p>}
                {pinSuccess && <p className="text-emerald-400 text-sm">{pinSuccess}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium">Cancel</button>
                  {securitySettings.pinEnabled && (
                      <button type="button" onClick={handleRemovePin} className="flex-1 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-medium">Remove</button>
                  )}
                  <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
