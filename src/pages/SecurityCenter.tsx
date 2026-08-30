import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Smartphone, 
  Lock, 
  KeyRound, 
  Fingerprint, 
  ScanFace, 
  Clock, 
  LogOut, 
  History, 
  Laptop, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  ChevronRight,
  Sparkles,
  Server,
  Zap,
  Info
} from 'lucide-react';
import { 
  subscribeToLoginHistory, 
  subscribeToUserDevices, 
  revokeUserDevice, 
  getOrCreateDeviceId,
  detectDeviceInfo,
  hashPin
} from '../lib/securityService';
import { LoginHistoryEntry, UserDevice } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'inactivity' | 'pin' | 'devices' | 'history' | 'appcheck';

export default function SecurityCenter() {
  const { 
    securitySettings, 
    updateSecuritySettings, 
    lockApp, 
    currentUser, 
    logout 
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('inactivity');

  // Real-time Firestore state
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginHistoryEntry[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinLengthChoice, setPinLengthChoice] = useState<4 | 6>(securitySettings.pinLength || 4);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Device revoking state
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deviceToRemove, setDeviceToRemove] = useState<UserDevice | null>(null);

  // History search/filter
  const [logFilter, setLogFilter] = useState<'ALL' | 'Success' | 'Failed'>('ALL');

  // Inactivity timeout state
  const currentTimeout = securitySettings.inactivityTimeout ?? 30;
  const isAutoLogout = securitySettings.autoLogoutEnabled !== false;

  const currentDeviceId = getOrCreateDeviceId();
  const currentClient = detectDeviceInfo();

  // Subscriptions to Firestore collections
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingDevices(false);
      setLoadingLogs(false);
      return;
    }

    setLoadingDevices(true);
    setLoadingLogs(true);

    const unsubDevices = subscribeToUserDevices(currentUser.uid, (data) => {
      setDevices(data);
      setLoadingDevices(false);
    });

    const unsubHistory = subscribeToLoginHistory(currentUser.uid, (data) => {
      setLoginLogs(data);
      setLoadingLogs(false);
    });

    return () => {
      unsubDevices();
      unsubHistory();
    };
  }, [currentUser?.uid]);

  // Handle Timeout Change
  const handleTimeoutChange = (minutes: number) => {
    updateSecuritySettings({
      inactivityTimeout: minutes,
      autoLogoutEnabled: true
    });
  };

  // Handle PIN Setup/Change Form
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    // If changing existing PIN, verify current PIN
    if (securitySettings.pin) {
      const currentHashed = hashPin(currentPinInput);
      const isMatch = securitySettings.pin === currentHashed || securitySettings.pin === currentPinInput;
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

    // Save hashed PIN
    updateSecuritySettings({
      pin: newPinInput,
      pinLength: pinLengthChoice,
      pinEnabled: true
    });

    setPinSuccess('PIN updated and encrypted successfully!');
    setTimeout(() => {
      setShowPinModal(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinSuccess('');
      setPinError('');
    }, 1200);
  };

  // Handle Revoke Device
  const handleConfirmRevokeDevice = async () => {
    if (!deviceToRemove || !currentUser?.uid) return;
    setRevokingId(deviceToRemove.id);
    
    const isCurrent = deviceToRemove.deviceId === currentDeviceId;
    const success = await revokeUserDevice(currentUser.uid, deviceToRemove.id);
    
    setRevokingId(null);
    setDeviceToRemove(null);

    if (success && isCurrent) {
      // If current device was revoked, logout
      logout();
    }
  };

  const filteredLogs = loginLogs.filter((log) => {
    if (logFilter === 'ALL') return true;
    return log.status === logFilter;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-[#0c1017] to-[#121824] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Security Center</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Zero-Trust Shield Active
                </span>
              </div>
              <p className="text-neutral-400 text-sm mt-1">
                Advanced device isolation, activity monitoring, inactivity session guard, and SHA-256 PIN authentication.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={lockApp}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
              title="Lock application screen immediately"
            >
              <Lock className="w-4 h-4 text-blue-400" />
              Lock Screen Now
            </button>
          </div>
        </div>

        {/* Security Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
          <div className="bg-black/25 border border-white/5 rounded-2xl p-3.5">
            <span className="text-xs text-neutral-400">Inactivity Timeout</span>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" />
              {isAutoLogout ? `${currentTimeout} min` : 'Disabled'}
            </div>
          </div>

          <div className="bg-black/25 border border-white/5 rounded-2xl p-3.5">
            <span className="text-xs text-neutral-400">PIN Protection</span>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              {securitySettings.pinEnabled ? `${securitySettings.pinLength || 4}-Digit Hashed` : 'Disabled'}
            </div>
          </div>

          <div className="bg-black/25 border border-white/5 rounded-2xl p-3.5">
            <span className="text-xs text-neutral-400">Active Devices</span>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              {devices.length || 1} Registered
            </div>
          </div>

          <div className="bg-black/25 border border-white/5 rounded-2xl p-3.5">
            <span className="text-xs text-neutral-400">Session Guard</span>
            <div className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Live Active
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-white/10">
        {[
          { id: 'inactivity', label: 'Inactivity Logout', icon: Clock },
          { id: 'pin', label: 'PIN & App Lock', icon: Lock },
          { id: 'devices', label: 'Active Devices', icon: Smartphone, count: devices.length },
          { id: 'history', label: 'Login History', icon: History, count: loginLogs.length },
          { id: 'appcheck', label: 'Shield & App Check', icon: ShieldCheck },
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
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10" 
                  : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-neutral-400")} />
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.2 text-[11px] rounded-full",
                  isActive ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-neutral-400"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Automatic Logout After Inactivity */}
      {activeTab === 'inactivity' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Automatic Logout After Inactivity
                </h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Protects your financial ledger by automatically terminating the Firebase session when no mouse, keyboard, or touch input is detected.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoLogout}
                  onChange={(e) => updateSecuritySettings({ autoLogoutEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Inactivity Duration Preset Buttons */}
            <div>
              <label className="block text-sm font-semibold text-neutral-300 mb-3">
                Inactivity Timeout Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { value: 5, label: '5 Minutes', sub: 'High Security' },
                  { value: 15, label: '15 Minutes', sub: 'Standard' },
                  { value: 30, label: '30 Minutes', sub: 'Recommended (Default)' },
                  { value: 60, label: '1 Hour', sub: 'Extended' },
                  { value: 120, label: '2 Hours', sub: 'Long Session' },
                ].map((item) => {
                  const isSelected = isAutoLogout && currentTimeout === item.value;
                  return (
                    <button
                      key={item.value}
                      disabled={!isAutoLogout}
                      onClick={() => handleTimeoutChange(item.value)}
                      className={cn(
                        "flex flex-col p-4 rounded-2xl text-left border transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                        isSelected 
                          ? "bg-blue-600/20 border-blue-500/50 text-white ring-2 ring-blue-500/30" 
                          : "bg-black/30 border-white/5 text-neutral-300 hover:bg-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-sm">{item.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                      </div>
                      <span className="text-[11px] text-neutral-400">{item.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-time Activity Guard Explanation */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4.5 flex items-start gap-3.5">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-300 space-y-1">
                <p className="font-semibold text-white">How the Inactivity Guard Works</p>
                <p className="text-neutral-400 leading-relaxed">
                  The background timer continuously listens to user interactions (clicks, mouse movements, scrolling, touch gestures, and keyboard typing). When inactivity exceeds <span className="text-blue-300 font-semibold">{currentTimeout} minutes</span>, the user is signed out from Firebase Auth and redirected to the login screen with a session expiry notice.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 2: PIN & App Lock */}
      {activeTab === 'pin' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  App PIN Lock
                </h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Require a 4 or 6 digit PIN to open and use Smart Ledger. PINs are salted and encrypted with SHA-256 before storage.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {securitySettings.pinEnabled && (
                  <button
                    onClick={() => {
                      setPinLengthChoice(securitySettings.pinLength || 4);
                      setShowPinModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
                  >
                    Change PIN
                  </button>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securitySettings.pinEnabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (!securitySettings.pin) {
                          setShowPinModal(true);
                        } else {
                          updateSecuritySettings({ pinEnabled: true });
                        }
                      } else {
                        updateSecuritySettings({ pinEnabled: false });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* PIN Configuration Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    PIN Encryption Standard
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    SHA-256 Salted
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Your raw PIN is never stored or transmitted. The client computes a SHA-256 digest with secure application salting.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setPinLengthChoice(securitySettings.pinLength || 4);
                      setShowPinModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-xs font-semibold transition-all"
                  >
                    {securitySettings.pin ? 'Update Configured PIN' : 'Set Up New PIN'}
                  </button>
                </div>
              </div>

              {/* Auto-Lock Timer for Background/Screen */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Screen Auto-Lock Duration
                  </span>
                  <span className="text-xs text-blue-400 font-semibold">
                    {securitySettings.autoLockTime} min
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Locks the screen overlay after short inactivity without signing out your account.
                </p>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[1, 2, 5, 10].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => updateSecuritySettings({ autoLockTime: mins })}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        securitySettings.autoLockTime === mins
                          ? "bg-blue-600/20 border-blue-500 text-white"
                          : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                      )}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Biometric & Face Unlock */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-blue-400" />
                Biometric & Passkey Unlock
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Touch ID / Fingerprint</p>
                      <p className="text-xs text-neutral-400">WebAuthn hardware key</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.biometricEnabled}
                      onChange={(e) => updateSecuritySettings({ biometricEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <ScanFace className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Face Unlock</p>
                      <p className="text-xs text-neutral-400">Platform biometric</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.faceUnlockEnabled}
                      onChange={(e) => updateSecuritySettings({ faceUnlockEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 3: Active Registered Devices */}
      {activeTab === 'devices' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-400" />
                  Active Devices ({devices.length})
                </h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Manage all browsers and mobile devices currently logged into your Smart Ledger account.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Current Device ID:</span>
                <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-blue-300">
                  {currentDeviceId}
                </code>
              </div>
            </div>

            {loadingDevices ? (
              <div className="py-12 text-center text-neutral-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
                <p className="text-sm">Loading registered devices...</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5">
                <Smartphone className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-300 font-semibold">Current Session Active</p>
                <p className="text-xs text-neutral-500 mt-1">{currentClient.deviceName} ({currentClient.browser})</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devices.map((device) => {
                  const isCurrent = device.isCurrent || device.deviceId === currentDeviceId;
                  return (
                    <div
                      key={device.id}
                      className={cn(
                        "p-5 rounded-2xl border transition-all flex flex-col justify-between",
                        isCurrent 
                          ? "bg-blue-600/10 border-blue-500/30 shadow-lg shadow-blue-500/5" 
                          : "bg-black/30 border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            isCurrent ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-neutral-400"
                          )}>
                            {device.os?.includes('iOS') || device.os?.includes('Android') ? (
                              <Smartphone className="w-5 h-5" />
                            ) : (
                              <Laptop className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{device.deviceName || 'Web Device'}</h4>
                              {isCurrent && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5">{device.browser} • {device.os}</p>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            onClick={() => setDeviceToRemove(device)}
                            className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Revoke session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{device.location || 'Online'}</span>
                          {device.ip && <span className="text-neutral-500">({device.ip})</span>}
                        </div>
                        <div>
                          {device.lastActive ? (
                            <span>Active {formatDistanceToNow(new Date(device.lastActive), { addSuffix: true })}</span>
                          ) : (
                            <span>Active</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Tab 4: Login Activity History */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  Login Activity History ({filteredLogs.length})
                </h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Immutable audit records for all authentication events on your ledger account.
                </p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                {(['ALL', 'Success', 'Failed'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLogFilter(filter)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      logFilter === filter 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "text-neutral-400 hover:text-white"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {loadingLogs ? (
              <div className="py-12 text-center text-neutral-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
                <p className="text-sm">Fetching login activity records...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5">
                <History className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-300">No login records found</p>
                <p className="text-xs text-neutral-500 mt-1">New login events will be logged here automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400">
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Method</th>
                      <th className="pb-3 font-semibold">Device & Browser</th>
                      <th className="pb-3 font-semibold">IP & Location</th>
                      <th className="pb-3 font-semibold text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pr-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[11px]",
                            log.status === 'Success' 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          )}>
                            {log.status === 'Success' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 pr-3 font-semibold text-neutral-200">
                          {log.method || 'Google'}
                        </td>
                        <td className="py-3.5 pr-3 text-neutral-300">
                          <div className="font-medium text-white">{log.deviceName || 'Client Device'}</div>
                          <div className="text-neutral-500 text-[11px]">{log.browser} • {log.os}</div>
                        </td>
                        <td className="py-3.5 pr-3 text-neutral-300">
                          <div>{log.location || 'Local Session'}</div>
                          <div className="text-neutral-500 font-mono text-[11px]">{log.ip}</div>
                        </td>
                        <td className="py-3.5 text-right text-neutral-400">
                          {log.timestamp ? (
                            <div>
                              <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                              <div className="text-[11px] text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                            </div>
                          ) : 'Recent'}
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

      {/* Tab 5: Shield & App Check */}
      {activeTab === 'appcheck' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex items-start gap-4 pb-6 border-b border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Zero-Trust Cloud Shield Architecture</h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Comprehensive audit of cloud Firestore rules, client-side encryption, and Firebase App Check integration.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    Firestore ABAC Isolation
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Enforced
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  All ledger entries, user profiles, login history, and device records strictly require <code className="text-blue-300 font-mono">request.auth.uid == userId</code>. Cross-account queries are rejected at the database level.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    Client-Side Cryptography
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Backup files and confidential storage use client-side AES-256 encryption. PIN verification is executed with salted SHA-256 cryptographic digests.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Firebase App Check
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  The client integrates Firebase App Check with reCAPTCHA v3 / Play Integrity attestation to protect backend API endpoints from bot scraping and unauthorized client requests.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Automatic Inactivity Guard
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {currentTimeout}m Timer
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Debounced activity listeners monitor mouse, touch, keyboard, and scroll vectors, safely terminating inactive sessions to safeguard sensitive finances.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Set / Change PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#121620] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {securitySettings.pin ? 'Change Security PIN' : 'Configure Security PIN'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* PIN Length Selector (4 vs 6 digits) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Choose PIN Length
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[4, 6].map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setPinLengthChoice(len as 4 | 6)}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-bold border transition-all",
                        pinLengthChoice === len 
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20" 
                          : "bg-black/30 text-neutral-400 border-white/10 hover:text-white"
                      )}
                    >
                      {len}-Digit PIN
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSavePin} className="space-y-4">
                {/* Current PIN (if already set) */}
                {securitySettings.pin && (
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Current PIN</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter current PIN"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono tracking-widest text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* New PIN */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    New {pinLengthChoice}-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={pinLengthChoice}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder={`${pinLengthChoice} numeric digits`}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Confirm PIN */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Confirm New PIN</label>
                  <input
                    type="password"
                    maxLength={pinLengthChoice}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder={`Re-enter ${pinLengthChoice} digits`}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                {pinError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {pinSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pinSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/25"
                  >
                    Save & Encrypt PIN
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revoke Device Confirmation Modal */}
      <AnimatePresence>
        {deviceToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#121620] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Revoke Device Session?</h3>
                <p className="text-neutral-400 text-sm mt-1">
                  Are you sure you want to revoke access for <span className="text-white font-semibold">{deviceToRemove.deviceName}</span>? This device will be signed out immediately.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeviceToRemove(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-sm font-semibold transition-colors"
                >
                  Keep Device
                </button>
                <button
                  type="button"
                  disabled={revokingId !== null}
                  onClick={handleConfirmRevokeDevice}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all shadow-lg shadow-red-600/25 disabled:opacity-50"
                >
                  {revokingId ? 'Revoking...' : 'Revoke Access'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
