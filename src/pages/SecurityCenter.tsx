import React, { useState, useEffect, useMemo } from 'react';
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
  Info,
  MapPin,
  Cpu,
  Monitor,
  Wifi,
  Radio,
  ExternalLink,
  Download,
  Search,
  Copy,
  UserCheck,
  ShieldQuestion
} from 'lucide-react';
import { 
  subscribeToLoginHistory, 
  subscribeToUserDevices, 
  revokeUserDevice, 
  revokeAllOtherDevices,
  getOrCreateDeviceId,
  detectDeviceInfo,
  getClientNetworkInfo,
  registerOrUpdateDevice,
  calculateSecurityScore,
  checkBiometricAvailability,
  hashPin,
  verifyPin,
  NetworkGeoInfo,
  DeviceInfo
} from '../lib/securityService';
import { LoginHistoryEntry, UserDevice } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

type TabType = 'telemetry' | 'devices' | 'history' | 'inactivity' | 'pin' | 'audit';

export default function SecurityCenter() {
  const { 
    securitySettings, 
    updateSecuritySettings, 
    lockApp, 
    currentUser, 
    userProfile,
    logout 
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('telemetry');

  // Real-time telemetry state
  const [networkInfo, setNetworkInfo] = useState<NetworkGeoInfo | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => detectDeviceInfo());
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

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
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deviceToRemove, setDeviceToRemove] = useState<UserDevice | null>(null);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // History search and filter
  const [logFilter, setLogFilter] = useState<'ALL' | 'Success' | 'Failed'>('ALL');
  const [logSearch, setLogSearch] = useState('');

  const currentDeviceId = getOrCreateDeviceId();
  const currentTimeout = securitySettings.inactivityTimeout ?? 30;
  const isAutoLogout = securitySettings.autoLogoutEnabled !== false;

  // Active user identity details
  const activeUserEmail = currentUser?.email || userProfile?.email || 'Authorized Local User';
  const activeUserName = currentUser?.displayName || userProfile?.fullName || 'Smart Ledger User';
  const activeUserPhoto = currentUser?.photoURL || userProfile?.profilePhoto || '';
  const activeUserUid = currentUser?.uid || 'local_session_user';
  const authProvider = currentUser?.providerData?.[0]?.providerId === 'google.com' 
    ? 'Google Sign-In' 
    : currentUser?.email 
      ? 'Email & Password' 
      : 'Secured Local Session';

  // Load telemetry and biometrics on mount
  useEffect(() => {
    let isMounted = true;
    
    getClientNetworkInfo().then((net) => {
      if (isMounted) setNetworkInfo(net);
    });

    checkBiometricAvailability().then((avail) => {
      if (isMounted) setBiometricsAvailable(avail);
    });

    setDeviceInfo(detectDeviceInfo());

    return () => { isMounted = false; };
  }, []);

  // Subscriptions to Firestore and local telemetry
  useEffect(() => {
    setLoadingDevices(true);
    setLoadingLogs(true);

    const unsubDevices = subscribeToUserDevices(activeUserUid, (data) => {
      setDevices(data);
      setLoadingDevices(false);
    });

    const unsubHistory = subscribeToLoginHistory(activeUserUid, (data) => {
      setLoginLogs(data);
      setLoadingLogs(false);
    });

    return () => {
      unsubDevices();
      unsubHistory();
    };
  }, [activeUserUid]);

  // Force refresh telemetry
  const handleRefreshTelemetry = async () => {
    setIsRefreshingTelemetry(true);
    try {
      localStorage.removeItem('smartledger_client_geo_full');
      const net = await getClientNetworkInfo();
      setNetworkInfo(net);
      setDeviceInfo(detectDeviceInfo());
      await registerOrUpdateDevice(activeUserUid, {
        email: activeUserEmail,
        userName: activeUserName,
        userAvatar: activeUserPhoto
      });
    } catch (e) {
      console.warn('Telemetry refresh failed', e);
    } finally {
      setTimeout(() => setIsRefreshingTelemetry(false), 600);
    }
  };

  // Copy text to clipboard helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

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

    if (securitySettings.pin) {
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

    setPinSuccess('PIN encrypted with SHA-256 and updated successfully!');
    setTimeout(() => {
      setShowPinModal(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinSuccess('');
      setPinError('');
    }, 1200);
  };

  // Handle Revoke Single Device
  const handleConfirmRevokeDevice = async () => {
    if (!deviceToRemove) return;
    setRevokingId(deviceToRemove.id);
    
    const isCurrent = deviceToRemove.deviceId === currentDeviceId;
    const success = await revokeUserDevice(activeUserUid, deviceToRemove.id);
    
    setRevokingId(null);
    setDeviceToRemove(null);

    if (success && isCurrent) {
      logout();
    }
  };

  // Handle Revoke All Other Devices
  const handleConfirmRevokeAll = async () => {
    setIsRevokingAll(true);
    await revokeAllOtherDevices(activeUserUid);
    setIsRevokingAll(false);
    setShowRevokeAllModal(false);
  };

  // Export audit log to CSV or JSON
  const handleExportAuditLog = (exportFormat: 'csv' | 'json') => {
    if (loginLogs.length === 0) return;

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(loginLogs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartledger-security-audit-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Timestamp', 'Status', 'User', 'Email', 'Method', 'Device', 'OS', 'Browser', 'IP', 'Location', 'ISP'];
      const rows = loginLogs.map(l => [
        `"${l.timestamp}"`,
        `"${l.status}"`,
        `"${l.userName || ''}"`,
        `"${l.userEmail || ''}"`,
        `"${l.method || ''}"`,
        `"${l.deviceName || ''}"`,
        `"${l.os || ''}"`,
        `"${l.browser || ''}"`,
        `"${l.ip || ''}"`,
        `"${l.location || ''}"`,
        `"${l.isp || ''}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartledger-security-audit-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return loginLogs.filter((log) => {
      const matchesStatus = logFilter === 'ALL' || log.status === logFilter;
      const searchTarget = `${log.ip || ''} ${log.location || ''} ${log.deviceName || ''} ${log.userEmail || ''} ${log.userName || ''} ${log.browser || ''} ${log.method || ''}`.toLowerCase();
      const matchesSearch = !logSearch || searchTarget.includes(logSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [loginLogs, logFilter, logSearch]);

  // Security score calculation
  const securityScoreResult = useMemo(() => {
    return calculateSecurityScore({
      pinEnabled: !!securitySettings.pinEnabled,
      autoLogoutEnabled: !!securitySettings.autoLogoutEnabled,
      inactivityTimeout: securitySettings.inactivityTimeout ?? 30,
      biometricEnabled: !!securitySettings.biometricEnabled,
      hasActiveSession: devices.length > 0,
      isHttps: typeof window !== 'undefined' ? window.location.protocol === 'https:' : true
    });
  }, [securitySettings, devices.length]);

  // Suspicious activity detection check
  const suspiciousAttempts = useMemo(() => {
    return loginLogs.filter(l => l.status === 'Failed' || l.status === 'Blocked').slice(0, 5);
  }, [loginLogs]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      {/* Top Header Card: Who is Logged In */}
      <div className="bg-gradient-to-br from-[#0c1017] via-[#0e1420] to-[#121826] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* User Identity Preview */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {activeUserPhoto ? (
                <img 
                  src={activeUserPhoto} 
                  alt={activeUserName}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25 ring-2 ring-white/10">
                  <ShieldCheck className="w-9 h-9 text-white" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0c1017] flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {activeUserName}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Session Active
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  {authProvider}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500">Email:</span>
                  <span className="text-neutral-200 font-medium">{activeUserEmail}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500">UID:</span>
                  <button 
                    onClick={() => handleCopy(activeUserUid, 'uid')}
                    className="font-mono text-[11px] text-blue-400 hover:text-blue-300 bg-white/5 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                    title="Click to copy UID"
                  >
                    {activeUserUid.slice(0, 12)}...
                    {copiedField === 'uid' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
                {networkInfo?.location && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-500">Location:</span>
                    <span className="text-neutral-200 font-medium flex items-center gap-1">
                      <span>{networkInfo.flagEmoji || '📍'}</span>
                      <span>{networkInfo.location}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRefreshTelemetry}
              disabled={isRefreshingTelemetry}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Re-probe IP, Location & Device fingerprint"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-blue-400", isRefreshingTelemetry && "animate-spin")} />
              <span>Refresh Telemetry</span>
            </button>

            <button
              onClick={lockApp}
              className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Lock screen immediately"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Screen Now</span>
            </button>
          </div>
        </div>

        {/* 4-Card Live Telemetry Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
          {/* 1. Live IP Address */}
          <div className="bg-black/35 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Live IP Address
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-base font-bold text-white font-mono truncate mr-2" title={networkInfo?.ip || 'Detecting...'}>
                {networkInfo?.ip || 'Detecting...'}
              </div>
              {networkInfo?.ip && (
                <button
                  onClick={() => handleCopy(networkInfo.ip, 'ip')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                  title="Copy IP address"
                >
                  {copiedField === 'ip' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              )}
            </div>
            <div className="text-[11px] text-neutral-400 truncate mt-1">
              {networkInfo?.isp || 'Broadband Network'}
            </div>
          </div>

          {/* 2. Live Location */}
          <div className="bg-black/35 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Current Location
              </span>
              <span className="text-sm">{networkInfo?.flagEmoji || '📍'}</span>
            </div>
            <div className="mt-2 text-base font-bold text-white truncate" title={networkInfo?.location || 'Detecting...'}>
              {networkInfo?.city || networkInfo?.location || 'Detecting...'}
            </div>
            <div className="text-[11px] text-neutral-400 truncate mt-1 flex items-center justify-between">
              <span>{networkInfo?.country || 'Earth'}</span>
              {networkInfo?.latitude && networkInfo?.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${networkInfo.latitude},${networkInfo.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-0.5"
                  title="Open in Maps"
                >
                  Map <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>

          {/* 3. Device & Browser */}
          <div className="bg-black/35 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                This Device
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                {deviceInfo.deviceType}
              </span>
            </div>
            <div className="mt-2 text-base font-bold text-white truncate" title={deviceInfo.deviceName}>
              {deviceInfo.deviceName}
            </div>
            <div className="text-[11px] text-neutral-400 truncate mt-1">
              {deviceInfo.browser} • {deviceInfo.os}
            </div>
          </div>

          {/* 4. Security Score */}
          <div className="bg-black/35 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Security Rating
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Grade {securityScoreResult.grade}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{securityScoreResult.score}</span>
              <span className="text-xs text-neutral-400 font-semibold">/ 100</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-medium truncate mt-1">
              {securityScoreResult.status}
            </div>
          </div>
        </div>
      </div>

      {/* Suspicious Activity Anomaly Alert (if any failed attempts) */}
      {suspiciousAttempts.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Security Notice: {suspiciousAttempts.length} Failed Sign-In Attempts Logged</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">Requires Review</span>
              </h4>
              <p className="text-xs text-neutral-300 mt-0.5">
                Recent authentication failures were recorded. Review the Login Activity tab to inspect unauthorized IPs, devices, or failed credentials.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('history');
              setLogFilter('Failed');
            }}
            className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Review Failed Logs
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-white/10">
        {[
          { id: 'telemetry', label: 'Live Activity & Details', icon: Radio },
          { id: 'devices', label: 'Active Devices', icon: Smartphone, count: devices.length },
          { id: 'history', label: 'Login Activity History', icon: History, count: loginLogs.length },
          { id: 'inactivity', label: 'Inactivity Logout', icon: Clock },
          { id: 'pin', label: 'PIN & Biometrics', icon: Lock },
          { id: 'audit', label: 'Defense Shield & Audit', icon: ShieldCheck },
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
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10" 
                  : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn(
                  "px-2 py-0.5 text-[11px] rounded-full font-bold tabular-nums",
                  isActive ? "bg-blue-500/30 text-blue-200" : "bg-white/5 text-neutral-400"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE TELEMETRY & IDENTITY                                          */}
      {/* ========================================================================= */}
      {activeTab === 'telemetry' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Identity & Account Integrity Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  Who Signed In
                </h3>
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Verified Session
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs text-neutral-400">Account Holder</div>
                  <div className="text-base font-bold text-white mt-0.5">{activeUserName}</div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400">Email Address</div>
                  <div className="text-sm font-medium text-neutral-200 mt-0.5 flex items-center justify-between">
                    <span className="truncate">{activeUserEmail}</span>
                    <button
                      onClick={() => handleCopy(activeUserEmail, 'email')}
                      className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/5"
                    >
                      {copiedField === 'email' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400">Unique Identity UID</div>
                  <div className="text-xs font-mono text-blue-300 mt-0.5 bg-black/40 p-2 rounded-xl border border-white/5 break-all flex items-center justify-between">
                    <span>{activeUserUid}</span>
                    <button
                      onClick={() => handleCopy(activeUserUid, 'full_uid')}
                      className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/5 shrink-0 ml-2"
                    >
                      {copiedField === 'full_uid' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400">Authentication Mechanism</div>
                  <div className="text-sm font-semibold text-white mt-0.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    {authProvider}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400">Current Session Device UUID</div>
                  <div className="text-xs font-mono text-neutral-300 mt-0.5 bg-black/40 p-2 rounded-xl border border-white/5 truncate">
                    {currentDeviceId}
                  </div>
                </div>
              </div>
            </div>

            {/* Geolocation & ISP Network Radar */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  Live Location & Network
                </h3>
                <span className="text-[11px] font-mono text-neutral-400">
                  {networkInfo?.ip}
                </span>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{networkInfo?.flagEmoji || '🌐'}</span>
                    <div>
                      <div className="text-sm font-bold text-white">{networkInfo?.city || 'Local Location'}</div>
                      <div className="text-xs text-neutral-400">{networkInfo?.region ? `${networkInfo.region}, ` : ''}{networkInfo?.country || 'Online'}</div>
                    </div>
                  </div>
                  {networkInfo?.latitude && networkInfo?.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${networkInfo.latitude},${networkInfo.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>Maps</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-neutral-400">Latitude</span>
                    <div className="font-mono font-bold text-white mt-0.5">
                      {networkInfo?.latitude !== null && networkInfo?.latitude !== undefined 
                        ? `${networkInfo.latitude.toFixed(4)}°` 
                        : 'Unavailable'}
                    </div>
                  </div>
                  <div className="bg-black/25 p-3 rounded-xl border border-white/5">
                    <span className="text-neutral-400">Longitude</span>
                    <div className="font-mono font-bold text-white mt-0.5">
                      {networkInfo?.longitude !== null && networkInfo?.longitude !== undefined 
                        ? `${networkInfo.longitude.toFixed(4)}°` 
                        : 'Unavailable'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400">Internet Service Provider (ISP)</div>
                  <div className="text-sm font-bold text-neutral-200 mt-0.5">{networkInfo?.isp || 'Standard Telecom'}</div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400">Timezone & Regional Clock</div>
                  <div className="text-xs font-mono text-neutral-300 mt-0.5 bg-black/40 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                    <span>{networkInfo?.timezone || 'UTC'}</span>
                    <span className="text-neutral-400">{format(new Date(), 'HH:mm:ss')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hardware & Browser Telemetry Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  Hardware & Browser
                </h3>
                <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {deviceInfo.platform}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400">Device Hardware</span>
                  <span className="font-bold text-white text-right">{deviceInfo.deviceName}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400">Operating System</span>
                  <span className="font-semibold text-neutral-200 text-right">{deviceInfo.os}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400">Browser & Engine</span>
                  <span className="font-semibold text-neutral-200 text-right">{deviceInfo.browser}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400">Display Resolution</span>
                  <span className="font-mono text-neutral-200 text-right">{deviceInfo.screenResolution}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400">CPU Concurrency</span>
                  <span className="font-semibold text-neutral-200 text-right">{deviceInfo.cores} Logical Cores</span>
                </div>

                {deviceInfo.memory && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-neutral-400">Device Memory</span>
                    <span className="font-semibold text-neutral-200 text-right">{deviceInfo.memory}</span>
                  </div>
                )}

                {deviceInfo.gpu && (
                  <div className="flex items-start justify-between py-2 border-b border-white/5 gap-2">
                    <span className="text-neutral-400 shrink-0">GPU / Graphics</span>
                    <span className="font-semibold text-neutral-200 text-right text-[11px] truncate max-w-[200px]" title={deviceInfo.gpu}>
                      {deviceInfo.gpu}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400">Touch Interface</span>
                  <span className="font-semibold text-neutral-200 text-right">
                    {deviceInfo.touchPoints ? `${deviceInfo.touchPoints} Touch Points` : 'No Touch (Mouse/Trackpad)'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400">Connection Latency</span>
                  <span className="font-semibold text-neutral-200 text-right">{deviceInfo.connectionType}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-400">Biometric Support</span>
                  <span className={cn(
                    "font-bold px-2 py-0.5 rounded-full text-[10px]",
                    biometricsAvailable 
                      ? "bg-emerald-500/20 text-emerald-300" 
                      : "bg-neutral-800 text-neutral-400"
                  )}>
                    {biometricsAvailable ? 'Supported (Touch ID/Face ID)' : 'Not Detected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Score Diagnostic Checklist */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Live Defense Audit Matrix
                </h3>
                <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
                  Continuous real-time verification of encryption, device isolation, and session policies.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-neutral-400">Overall Rating</div>
                  <div className="text-sm font-bold text-emerald-400">{securityScoreResult.status}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-lg">
                  {securityScoreResult.grade}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {securityScoreResult.items.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex items-start justify-between gap-3",
                    item.achieved 
                      ? "bg-emerald-500/5 border-emerald-500/20" 
                      : "bg-amber-500/5 border-amber-500/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded-xl shrink-0 mt-0.5",
                      item.achieved ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      {item.achieved ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{item.title}</div>
                      <p className="text-xs text-neutral-400 mt-0.5">{item.advice}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 shrink-0">
                    +{item.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACTIVE DEVICES ("IN WHICH DEVICE IT SIGNED IN")                     */}
      {/* ========================================================================= */}
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
                  Active Signed-In Devices ({devices.length})
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                  Track every workstation, laptop, tablet, and mobile device authorized on your account.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {devices.length > 1 && (
                  <button
                    onClick={() => setShowRevokeAllModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sign Out All Other Devices</span>
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                  <span className="text-xs text-neutral-400">Current ID:</span>
                  <code className="text-xs font-mono text-blue-300">{currentDeviceId}</code>
                </div>
              </div>
            </div>

            {loadingDevices ? (
              <div className="py-16 text-center text-neutral-400">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-400 mb-2" />
                <p className="text-sm">Fetching active signed-in device details...</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5">
                <Smartphone className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-300 font-semibold">Current Session Active</p>
                <p className="text-xs text-neutral-500 mt-1">{deviceInfo.deviceName} ({deviceInfo.browser})</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devices.map((device) => {
                  const isCurrent = device.isCurrent || device.deviceId === currentDeviceId;
                  const isPhone = device.deviceType === 'mobile' || /iPhone|Android|Mobile/i.test(device.deviceName || device.os || '');
                  const isTablet = device.deviceType === 'tablet' || /iPad|Tablet/i.test(device.deviceName || '');

                  return (
                    <div
                      key={device.id}
                      className={cn(
                        "p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden",
                        isCurrent 
                          ? "bg-gradient-to-br from-blue-600/15 to-indigo-600/10 border-blue-500/40 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/20" 
                          : "bg-black/35 border-white/5 hover:border-white/15"
                      )}
                    >
                      {isCurrent && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                      )}

                      <div className="space-y-4 relative z-10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                              isCurrent ? "bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/30" : "bg-white/5 text-neutral-400 ring-1 ring-white/10"
                            )}>
                              {isPhone ? (
                                <Smartphone className="w-6 h-6" />
                              ) : isTablet ? (
                                <TabletIcon className="w-6 h-6" />
                              ) : (
                                <Laptop className="w-6 h-6" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-bold text-white tracking-tight">
                                  {device.deviceName || 'Authorized Workstation'}
                                </h4>
                                {isCurrent && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    Active Now
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-300 mt-0.5">
                                {device.browser} • {device.os}
                              </p>
                            </div>
                          </div>

                          {!isCurrent && (
                            <button
                              onClick={() => setDeviceToRemove(device)}
                              disabled={revokingId === device.id}
                              className="p-2.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/20 transition-all"
                              title="Revoke session and sign out this device"
                            >
                              {revokingId === device.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Device Telemetry Specs */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 p-3 rounded-xl border border-white/5">
                          <div>
                            <span className="text-neutral-500">Location:</span>
                            <div className="font-semibold text-neutral-200 truncate flex items-center gap-1 mt-0.5">
                              <span>{device.flagEmoji || '📍'}</span>
                              <span>{device.location || 'Online'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-neutral-500">IP Address:</span>
                            <div className="font-mono font-semibold text-blue-300 truncate mt-0.5">
                              {device.ip || '127.0.0.1'}
                            </div>
                          </div>
                          {device.isp && (
                            <div className="col-span-2">
                              <span className="text-neutral-500">Network / ISP:</span>
                              <div className="font-medium text-neutral-300 truncate mt-0.5">
                                {device.isp}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Who signed in badge */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1.5 truncate mr-2">
                            <span className="text-neutral-500">User:</span>
                            <span className="text-neutral-200 font-medium truncate">{device.userEmail || activeUserEmail}</span>
                          </div>
                          <div className="shrink-0 text-right">
                            {device.lastActive ? (
                              <span>Active {formatDistanceToNow(new Date(device.lastActive), { addSuffix: true })}</span>
                            ) : (
                              <span>Recently Active</span>
                            )}
                          </div>
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

      {/* ========================================================================= */}
      {/* TAB 3: LOGIN ACTIVITY HISTORY                                              */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  Live Login Activity History ({filteredLogs.length})
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                  Complete secure history tracking who signed in, from which device, IP address, and location.
                </p>
              </div>

              {/* Controls: Search, Filter, Export */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search IP, device, user..."
                    className="pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 w-44 sm:w-56"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                  {(['ALL', 'Success', 'Failed'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLogFilter(filter)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                        logFilter === filter 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "text-neutral-400 hover:text-white"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Export Dropdown */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExportAuditLog('json')}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Export Audit Log as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={() => handleExportAuditLog('csv')}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Export Audit Log as CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {loadingLogs ? (
              <div className="py-16 text-center text-neutral-400">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-400 mb-2" />
                <p className="text-sm">Streaming real-time login audit events...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5">
                <History className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-300">No login events matching filter</p>
                <p className="text-xs text-neutral-500 mt-1">Authentication attempts will appear here automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400">
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Who Signed In</th>
                      <th className="pb-3 font-semibold">Method</th>
                      <th className="pb-3 font-semibold">Device & Specs</th>
                      <th className="pb-3 font-semibold">IP & Location</th>
                      <th className="pb-3 font-semibold text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Status */}
                        <td className="py-3.5 pr-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px]",
                            log.status === 'Success' 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          )}>
                            {log.status === 'Success' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {log.status}
                          </span>
                          {log.failureReason && (
                            <div className="text-[10px] text-red-400/80 mt-1 max-w-[140px] truncate" title={log.failureReason}>
                              {log.failureReason}
                            </div>
                          )}
                        </td>

                        {/* Who Signed In */}
                        <td className="py-3.5 pr-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="truncate max-w-[150px]">{log.userName || activeUserName}</span>
                          </div>
                          <div className="text-neutral-400 text-[11px] truncate max-w-[170px]">
                            {log.userEmail || activeUserEmail}
                          </div>
                        </td>

                        {/* Method */}
                        <td className="py-3.5 pr-3">
                          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-semibold text-neutral-200">
                            {log.method || 'Google'}
                          </span>
                        </td>

                        {/* Device */}
                        <td className="py-3.5 pr-3 text-neutral-300">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{log.deviceName || 'Client Workstation'}</span>
                          </div>
                          <div className="text-neutral-400 text-[11px]">
                            {log.browser} • {log.os}
                          </div>
                        </td>

                        {/* IP & Location */}
                        <td className="py-3.5 pr-3 text-neutral-300">
                          <div className="font-medium text-white flex items-center gap-1">
                            <span>{log.flagEmoji || '📍'}</span>
                            <span className="truncate max-w-[180px]">{log.location || 'Local Session'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-blue-400 font-mono font-medium text-[11px]">{log.ip}</span>
                            {log.isp && <span className="text-neutral-500 text-[10px]">({log.isp})</span>}
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 text-right text-neutral-400">
                          <div className="text-neutral-200 font-medium">
                            {log.timestamp ? format(new Date(log.timestamp), 'MMM dd, yyyy') : 'Recently'}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : ''}
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

      {/* ========================================================================= */}
      {/* TAB 4: INACTIVITY TIMEOUT                                                 */}
      {/* ========================================================================= */}
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
                  Inactivity Auto-Logout Duration
                </h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Automatically sign out your account after a period of idle inactivity to protect against unattended device exposure.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">Current Policy:</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs border border-blue-500/30">
                  {isAutoLogout ? `${currentTimeout} Minutes` : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Timeout Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { minutes: 5, label: '5 Minutes', desc: 'Maximum Security (Recommended for shared computers)' },
                { minutes: 15, label: '15 Minutes', desc: 'High Security (Balances safety and ease of use)' },
                { minutes: 30, label: '30 Minutes', desc: 'Standard Default (Industry banking benchmark)' },
                { minutes: 60, label: '60 Minutes', desc: 'Extended Workday (Best for private secure offices)' },
              ].map((opt) => {
                const isSelected = isAutoLogout && currentTimeout === opt.minutes;
                return (
                  <button
                    key={opt.minutes}
                    onClick={() => handleTimeoutChange(opt.minutes)}
                    className={cn(
                      "p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between",
                      isSelected 
                        ? "bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30" 
                        : "bg-black/30 border-white/5 hover:border-white/20 text-neutral-300 hover:text-white"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">{opt.label}</span>
                        {isSelected && (
                          <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PIN & BIOMETRICS                                                    */}
      {/* ========================================================================= */}
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
                  PIN & Hardware Biometric Lock
                </h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Require a secure 4 or 6-digit PIN or Touch ID/Face ID whenever opening or unlocking your account.
                </p>
              </div>

              <div>
                <button
                  onClick={() => setShowPinModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
                >
                  {securitySettings.pin ? 'Change Security PIN' : 'Set Up New PIN'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PIN Status */}
              <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    Security PIN Lock
                  </span>
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-semibold",
                    securitySettings.pinEnabled 
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                      : "bg-neutral-800 text-neutral-400"
                  )}>
                    {securitySettings.pinEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  {securitySettings.pin 
                    ? `Encrypted ${securitySettings.pinLength || 4}-digit PIN configured with SHA-256 salted hashing.` 
                    : 'No PIN configured yet. Configure a PIN to lock the screen on demand.'}
                </p>
              </div>

              {/* Biometrics Status */}
              <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-indigo-400" />
                    Biometrics / WebAuthn
                  </span>
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-semibold",
                    biometricsAvailable 
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
                      : "bg-neutral-800 text-neutral-400"
                  )}>
                    {biometricsAvailable ? 'Supported' : 'Hardware Not Present'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  {biometricsAvailable 
                    ? 'Apple Touch ID / Face ID or Windows Hello hardware authenticator detected.' 
                    : 'Platform authenticator is not detected on this browser session.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: DEFENSE SHIELD & AUDIT                                             */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              SmartLedger Zero-Trust Architecture
            </h2>
            <p className="text-neutral-400 text-sm">
              SmartLedger adheres to strict client-side encryption and zero-knowledge storage standards. All ledger records are encrypted at rest with AES-256 and transmitted over TLS 1.3.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> AES-256 Vault Encryption
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Financial calculations, savings entries, and secret vaults are highly secured.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                <div className="text-blue-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Device Isolation
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Each session is uniquely fingerprinted. Stale or compromised sessions can be revoked instantly.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                <div className="text-indigo-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Real-Time Cloud Sync
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Data synchronizes across all your devices in real-time through Google Firebase infrastructure.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* PIN SETUP MODAL                                                           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e131d] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-400" />
                  {securitySettings.pin ? 'Update Security PIN' : 'Set Up Security PIN'}
                </h3>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePin} className="space-y-4">
                {/* Length choice */}
                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setPinLengthChoice(4)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      pinLengthChoice === 4 ? "bg-blue-600 text-white" : "text-neutral-400"
                    )}
                  >
                    4 Digits
                  </button>
                  <button
                    type="button"
                    onClick={() => setPinLengthChoice(6)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      pinLengthChoice === 6 ? "bg-blue-600 text-white" : "text-neutral-400"
                    )}
                  >
                    6 Digits (High Security)
                  </button>
                </div>

                {securitySettings.pin && (
                  <div>
                    <label className="text-xs text-neutral-400">Current PIN</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full mt-1 px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-blue-500"
                      placeholder="••••"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-neutral-400">New {pinLengthChoice}-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={pinLengthChoice}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-1 px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-blue-500"
                    placeholder={'•'.repeat(pinLengthChoice)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400">Confirm New PIN</label>
                  <input
                    type="password"
                    maxLength={pinLengthChoice}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-1 px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-blue-500"
                    placeholder={'•'.repeat(pinLengthChoice)}
                    required
                  />
                </div>

                {pinError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
                    {pinError}
                  </div>
                )}

                {pinSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                    {pinSuccess}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                  >
                    Save Encrypted PIN
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* REVOKE SINGLE DEVICE MODAL                                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deviceToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e131d] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Trash2 size={24} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Revoke Device Access?</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Are you sure you want to sign out and revoke access for <strong className="text-white">{deviceToRemove.deviceName}</strong>?
                </p>
                <div className="mt-3 p-3 rounded-xl bg-black/40 text-xs text-neutral-300 space-y-1">
                  <div><strong>IP:</strong> {deviceToRemove.ip}</div>
                  <div><strong>Location:</strong> {deviceToRemove.location}</div>
                  <div><strong>User:</strong> {deviceToRemove.userEmail || activeUserEmail}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeviceToRemove(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevokeDevice}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20"
                >
                  Revoke & Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SIGN OUT ALL OTHER DEVICES MODAL                                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showRevokeAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e131d] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Sign Out All Other Devices?</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  This will immediately terminate all active sessions across other laptops, phones, or browsers. Only this current device will remain logged in.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevokeAllModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRevokingAll}
                  onClick={handleConfirmRevokeAll}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-1.5"
                >
                  {isRevokingAll && <RefreshCw size={14} className="animate-spin" />}
                  <span>Sign Out All Others</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
      <line x1="12" x2="12.01" y1="18" y2="18"/>
    </svg>
  );
}
