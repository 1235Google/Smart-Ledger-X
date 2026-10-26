import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Smartphone, 
  Laptop, 
  Globe, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  KeyRound, 
  UserX, 
  Activity,
  Layers,
  ChevronRight,
  Loader2,
  Calendar,
  Zap,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { 
  fetchAdminSecurityOverview, 
  revokeAdminSession, 
  revokeAdminTrustedDevice, 
  triggerEmergencyLockdown, 
  liftEmergencyLockdown,
  getStoredAdminSessionToken
} from '../../lib/adminMfaClient';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';
import { cn } from '../../lib/utils';

export default function AdminSecurityDashboard() {
  const navigate = useNavigate();
  const { adminUser, isAdminLoading, isAdminAuthenticated } = useStore();
  const { showSuccess, showError, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [securityData, setSecurityData] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Lockdown modal state
  const [showLockdownModal, setShowLockdownModal] = useState(false);
  const [lockdownReason, setLockdownReason] = useState('Immediate administrative security containment');
  const [isLocking, setIsLocking] = useState(false);

  // Unlock modal state
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('Threat resolved. Normal administrative access restored.');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Revocation action states
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);

  const loadData = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetchAdminSecurityOverview();
      if (res.success && res.overview) {
        setSecurityData(res.overview);
        setFetchError(null);
      } else {
        const errMsg = res.error || 'Failed to retrieve security center state.';
        setFetchError(errMsg);
        if (!silent) showError('Data Error', errMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Could not communicate with security daemon.';
      setFetchError(errMsg);
      if (!silent) showError('Network Error', errMsg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // AVOID RACE CONDITION:
    // Only fire data-fetch AFTER the auth token/session has confirmed to initialize
    if (isAdminLoading) {
      return;
    }

    const hasLocalAuth = Boolean(getStoredAdminSessionToken()) || 
      (typeof window !== 'undefined' && sessionStorage.getItem('smartledger-admin-auth') === 'true');

    if (!isAdminAuthenticated && !adminUser && !hasLocalAuth) {
      setIsLoading(false);
      setFetchError('Administrator authentication required. Please sign in to access the Security Center.');
      return;
    }

    loadData();
    const interval = setInterval(() => loadData(true), 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [isAdminLoading, isAdminAuthenticated, adminUser]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      const ok = await revokeAdminSession(sessionId);
      if (ok) {
        showSuccess('Session Terminated', 'Administrative session revoked successfully.');
        await loadData(true);
      } else {
        showError('Revocation Failed', 'Could not revoke session.');
      }
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    setRevokingDeviceId(deviceId);
    try {
      const ok = await revokeAdminTrustedDevice(deviceId);
      if (ok) {
        showSuccess('Device Removed', 'Trusted device revoked. MFA will be required on next login.');
        await loadData(true);
      } else {
        showError('Revocation Failed', 'Could not revoke trusted device.');
      }
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const handleConfirmLockdown = async () => {
    setIsLocking(true);
    try {
      const res = await triggerEmergencyLockdown(lockdownReason);
      if (res.success) {
        showSuccess(
          'Emergency Lockdown Engaged', 
          `Portal locked. Revoked ${res.sessionsRevoked || 0} active session(s) and ${res.devicesRevoked || 0} trusted device(s).`
        );
        setShowLockdownModal(false);
        await loadData(true);
      } else {
        showError('Lockdown Error', res.error || 'Failed to initiate lockdown');
      }
    } finally {
      setIsLocking(false);
    }
  };

  const handleConfirmUnlock = async () => {
    setIsUnlocking(true);
    try {
      const res = await liftEmergencyLockdown(unlockReason);
      if (res.success) {
        showSuccess('Portal Unlocked', 'Emergency lockdown lifted. Standard MFA logins resumed.');
        setShowUnlockModal(false);
        await loadData(true);
      } else {
        showError('Unlock Error', res.error || 'Failed to lift lockdown');
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const isPortalLocked = Boolean(securityData?.securityState?.portalLocked);
  const isSuperAdmin = adminUser?.role === 'Super Admin' || adminUser?.role === 'Owner';
  const canLockdown = isSuperAdmin || adminUser?.role === 'Security Admin';

  if (isAdminLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={36} className="animate-spin text-blue-500" />
        <p className="text-sm font-medium text-slate-400">Verifying administrator authorization...</p>
      </div>
    );
  }

  if (fetchError && !securityData) {
    return (
      <div className="p-4 sm:p-8 max-w-xl mx-auto my-12">
        <div className="bg-slate-900/80 border border-rose-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Security Center Unavailable</h2>
            <p className="text-sm text-slate-300 mt-2">{fetchError}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <M3Button
              variant="filled"
              icon={RefreshCw}
              onClick={() => loadData()}
              disabled={isLoading}
            >
              {isLoading ? 'Retrying...' : 'Retry Connection'}
            </M3Button>
            <M3Button
              variant="outlined"
              onClick={() => navigate('/admin/login')}
            >
              Sign In to Admin Portal
            </M3Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={36} className="animate-spin text-blue-500" />
        <p className="text-sm font-medium text-slate-400">Loading Bank-Grade Security Center...</p>
      </div>
    );
  }

  const activeSessions = securityData?.activeSessions || [];
  const trustedDevices = securityData?.trustedDevices || [];
  const auditLogs = securityData?.auditLogs || [];

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Security Center & MFA
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Bank-Grade RBAC
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative session control, cryptographic multi-factor authentication, and emergency lockdown.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <M3Button
            variant="tonal"
            size="sm"
            icon={RefreshCw}
            onClick={() => loadData(true)}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Audits'}
          </M3Button>

          {isPortalLocked ? (
            isSuperAdmin ? (
              <M3Button
                variant="filled"
                size="sm"
                icon={Unlock}
                onClick={() => setShowUnlockModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Lift Lockdown
              </M3Button>
            ) : null
          ) : (
            canLockdown && (
              <M3Button
                variant="filled"
                size="sm"
                icon={ShieldAlert}
                onClick={() => setShowLockdownModal(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 shadow-lg"
              >
                Lock Admin Portal
              </M3Button>
            )
          )}
        </div>
      </div>

      {/* Emergency Lockdown Active Alert Banner */}
      <AnimatePresence>
        {isPortalLocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            className="p-5 rounded-3xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl shadow-rose-950/40"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                <AlertTriangle size={24} className="animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white tracking-tight">
                    EMERGENCY LOCKDOWN ENGAGED
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                    High Alert
                  </span>
                </div>
                <p className="text-xs text-rose-300 mt-1">
                  Reason: {securityData?.securityState?.reason || 'Threat mitigation initiated by administrator'}.
                  All non-Super Admin sessions are suspended.
                </p>
                <p className="text-[11px] text-rose-400 mt-0.5 font-mono">
                  Locked by {securityData?.securityState?.lockedBy || 'Super Admin'} at {new Date(securityData?.securityState?.lockedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <button
                onClick={() => setShowUnlockModal(true)}
                className="px-4 py-2 rounded-xl bg-white text-rose-900 font-bold text-xs hover:bg-rose-50 transition-colors shrink-0 flex items-center gap-1.5 shadow-md"
              >
                <Unlock size={14} />
                <span>Lift Lockdown</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: MFA Protocol */}
        <div className={cn(
          'p-5 rounded-3xl border transition-all',
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">MFA Protocol</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <KeyRound size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">Active</span>
            <span className="text-xs text-emerald-400 font-semibold">100% Enforced</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            6-digit SHA-256 code via Resend, 5-min expiry
          </p>
        </div>

        {/* Card 2: Active Sessions */}
        <div className={cn(
          'p-5 rounded-3xl border transition-all',
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Admin Sessions</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{activeSessions.length}</span>
            <span className="text-xs text-slate-400 font-medium">workstations</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            HttpOnly tokenized with IP binding
          </p>
        </div>

        {/* Card 3: Trusted Devices */}
        <div className={cn(
          'p-5 rounded-3xl border transition-all',
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">30-Day Trusted Devices</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Smartphone size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{trustedDevices.length}</span>
            <span className="text-xs text-purple-400 font-semibold">Remembered</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Hardware fingerprint + HMAC validation
          </p>
        </div>

        {/* Card 4: Portal Security Posture */}
        <div className={cn(
          'p-5 rounded-3xl border transition-all',
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Portal Lockdown State</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isPortalLocked ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {isPortalLocked ? <Lock size={16} /> : <ShieldCheck size={16} />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${isPortalLocked ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isPortalLocked ? 'LOCKED' : 'NOMINAL'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isPortalLocked ? 'All actions restricted' : 'Normal operational flow'}
          </p>
        </div>
      </div>

      {/* Section 1: Active Admin Sessions */}
      <div className={cn(
        'rounded-3xl border overflow-hidden',
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      )}>
        <div className="p-5 sm:p-6 border-b border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">Active Administrator Sessions</h2>
            <p className="text-xs text-slate-400">Authenticated administrator sessions currently active on SmartLedgerX.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 self-start sm:self-auto">
            {activeSessions.length} Active
          </span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No active sessions found.</div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {activeSessions.map((session: any) => (
              <div key={session.sessionId} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 mt-0.5">
                    <Laptop size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{session.email}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-blue-400 border border-blue-500/30">
                        {session.role}
                      </span>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                      <span>{session.device}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-slate-300">{session.ip}</span>
                      <span>&bull;</span>
                      <span>{session.location}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                      <Clock size={11} />
                      Created: {new Date(session.createdAt).toLocaleString()} (Expires in {Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 3600000))}h)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <M3Button
                    variant="outlined"
                    size="sm"
                    icon={UserX}
                    disabled={revokingSessionId === session.sessionId}
                    onClick={() => handleRevokeSession(session.sessionId)}
                    className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    {revokingSessionId === session.sessionId ? 'Revoking...' : 'Revoke Session'}
                  </M3Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: 30-Day Trusted Devices */}
      <div className={cn(
        'rounded-3xl border overflow-hidden',
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      )}>
        <div className="p-5 sm:p-6 border-b border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">Remembered Trusted Devices (30 Days)</h2>
            <p className="text-xs text-slate-400">Recognized workstations that bypass the 6-digit MFA prompt.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 self-start sm:self-auto">
            {trustedDevices.length} Devices
          </span>
        </div>

        {trustedDevices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No devices are currently remembered. MFA will be required on every sign-in.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {trustedDevices.map((device: any) => (
              <div key={device.deviceId} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 mt-0.5">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{device.deviceName}</span>
                      <span className="text-xs text-slate-400">({device.email})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="font-mono text-slate-300">{device.ip}</span>
                      <span>&bull;</span>
                      <span>{device.location}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      Last used: {new Date(device.lastUsed).toLocaleString()} &bull; Expires: {new Date(device.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <M3Button
                    variant="outlined"
                    size="sm"
                    icon={Trash2}
                    disabled={revokingDeviceId === device.deviceId}
                    onClick={() => handleRevokeDevice(device.deviceId)}
                    className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    {revokingDeviceId === device.deviceId ? 'Removing...' : 'Revoke Trust'}
                  </M3Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Immutable Security Audit Logs */}
      <div className={cn(
        'rounded-3xl border overflow-hidden',
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      )}>
        <div className="p-5 sm:p-6 border-b border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">Security Audit Logs & Telemetry</h2>
            <p className="text-xs text-slate-400">Bank-grade immutable audit records of all MFA verifications, attempts, and admin actions.</p>
          </div>
          <span className="text-xs font-mono text-slate-500">{auditLogs.length} events logged</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No security audit logs recorded yet.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/40">
            {auditLogs.map((log: any) => {
              const isError = log.event.includes('FAILED') || log.event.includes('UNAUTHORIZED') || log.event.includes('DENIED');
              const isLockdown = log.event.includes('LOCKDOWN');
              const isSuccess = log.event.includes('SUCCESS');

              return (
                <div key={log.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/20 text-xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      isLockdown ? 'bg-amber-400 animate-ping' : isError ? 'bg-rose-500' : isSuccess ? 'bg-emerald-400' : 'bg-blue-400'
                    }`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-200">{log.event}</span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-slate-300 font-medium truncate">{log.email}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                        IP: {log.ip} {log.metadata?.device ? `&bull; ${log.metadata.device}` : ''} {log.metadata?.reason ? `(${log.metadata.reason})` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Emergency Lockdown Confirmation Modal */}
      <M3Dialog
        isOpen={showLockdownModal}
        onClose={() => setShowLockdownModal(false)}
        title="Trigger Emergency Portal Lockdown?"
      >
        <div className="space-y-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
            <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
            <p>
              <strong>High Severity Action:</strong> Triggering an Emergency Lockdown will immediately revoke all active administrative sessions and all 30-day remembered devices. Only Super Admins with fresh 2FA will be allowed in.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Lockdown Rationale / Threat Description
            </label>
            <input
              type="text"
              value={lockdownReason}
              onChange={(e) => setLockdownReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-rose-500"
              placeholder="e.g., Suspicious activity detected on admin account"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <M3Button variant="text" size="sm" onClick={() => setShowLockdownModal(false)}>
              Cancel
            </M3Button>
            <M3Button
              variant="filled"
              size="sm"
              icon={ShieldAlert}
              disabled={isLocking || !lockdownReason.trim()}
              onClick={handleConfirmLockdown}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isLocking ? 'Engaging Lockdown...' : 'Engage Emergency Lockdown'}
            </M3Button>
          </div>
        </div>
      </M3Dialog>

      {/* Lift Lockdown Modal */}
      <M3Dialog
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        title="Lift Emergency Lockdown"
      >
        <div className="space-y-4 text-xs text-slate-300">
          <p>
            You are about to restore standard administrative operations. All authorized admins will be able to sign in using their normal Multi-Factor Authentication flow.
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Resolution Summary
            </label>
            <input
              type="text"
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
              placeholder="e.g., Threat mitigated and credentials audited"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <M3Button variant="text" size="sm" onClick={() => setShowUnlockModal(false)}>
              Cancel
            </M3Button>
            <M3Button
              variant="filled"
              size="sm"
              icon={Unlock}
              disabled={isUnlocking}
              onClick={handleConfirmUnlock}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isUnlocking ? 'Lifting Lockdown...' : 'Confirm & Restore Access'}
            </M3Button>
          </div>
        </div>
      </M3Dialog>
    </div>
  );
}
