import sys

code = """
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { io } from 'socket.io-client';
import { 
  Shield, Smartphone, Lock, KeyRound, Clock, LogOut, History, 
  Laptop, Globe, CheckCircle2, XCircle, Trash2, ShieldAlert,
  AlertTriangle, Fingerprint, Activity, Terminal
} from 'lucide-react';
import { 
  subscribeToLoginHistory, subscribeToUserDevices, revokeUserDevice, revokeAllOtherDevices,
  emergencyLockdown, fetchAuditLogs, revokeAllSessionsBackend, revokeDeviceBackend,
  calculateSecurityScore
} from '../lib/securityService';
import { LoginHistoryEntry, UserDevice } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { startRegistration } from '@simplewebauthn/browser';

type TabType = 'overview' | 'session' | 'devices' | 'history' | 'audit' | 'passkeys';

export default function SecurityCenter() {
  const { currentUser, securitySettings, updateSecuritySettings, createNotification, logout } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Real-time Firestore & local state
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginHistoryEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  
  // Modals state
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
  const [showLockdownModal, setShowLockdownModal] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);

  const activeUserEmail = currentUser?.email || 'Authorized Local User';
  const activeUserUid = currentUser?.uid || 'local_session_user';

  // Subscriptions
  useEffect(() => {
    setLoadingDevices(true);

    const unsubDevices = subscribeToUserDevices(activeUserUid, (data) => {
      setDevices(prev => {
        const merged = [...prev];
        data.forEach(d => { 
           if (!merged.find(m => m.id === d.id)) merged.push(d); 
        });
        return merged.sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime());
      });
      setLoadingDevices(false);
    });

    const unsubHistory = subscribeToLoginHistory(activeUserUid, (data) => {
      setLoginLogs(data);
    });

    const loadAudit = async () => {
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
    };
    loadAudit();

    // Socket.io real-time
    const socket = io();
    socket.emit('join_user_room', activeUserUid);
    
    socket.on('new_session', (sessionData) => {
       setDevices(prev => {
          const exists = prev.find(d => d.id === sessionData.sessionId);
          if (exists) return prev;
          const newDevice: UserDevice = {
             id: sessionData.sessionId, userId: sessionData.userId, deviceId: sessionData.sessionId,
             deviceName: sessionData.browser + ' on ' + sessionData.os, deviceType: sessionData.device,
             browser: sessionData.browser, os: sessionData.os, ip: sessionData.ip, location: sessionData.location,
             lastActive: new Date(sessionData.lastActive).toISOString(), createdAt: new Date(sessionData.loginTime).toISOString(),
             isCurrent: false, status: sessionData.status
          };
          return [newDevice, ...prev];
       });
    });

    socket.on('force_logout', () => {
       logout();
    });
    
    socket.on('revoke_device', ({ sessionId }) => {
       const localSessionId = localStorage.getItem('smartledger_session_id');
       if (localSessionId === sessionId) {
          logout();
       }
    });

    return () => {
      unsubDevices();
      unsubHistory();
      socket.disconnect();
    };
  }, [activeUserUid, logout]);

  // Actions
  const handleRevokeAll = async () => {
    setIsProcessing(true);
    await revokeAllSessionsBackend(); // Real backend token revocation
    await revokeAllOtherDevices(activeUserUid); // Cleans up firestore
    setIsProcessing(false);
    setShowRevokeAllModal(false);
    createNotification({
      title: 'Sessions Revoked',
      message: 'All other devices have been signed out securely.',
      type: 'success'
    });
  };

  const handleRevokeDevice = async (deviceId: string) => {
    await revokeDeviceBackend(deviceId); // Backend socket kick
    await revokeUserDevice(activeUserUid, deviceId); // Firestore cleanup
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    createNotification({
      title: 'Device Removed',
      message: 'The device has been successfully signed out.',
      type: 'success'
    });
  };

  const handleEmergencyLockdown = async () => {
    setIsProcessing(true);
    const success = await emergencyLockdown();
    if (success) {
      logout();
    } else {
      setIsProcessing(false);
      createNotification({
        title: 'Lockdown Failed',
        message: 'Could not communicate with the server.',
        type: 'error'
      });
    }
  };

  const handleRegisterPasskey = async () => {
    setIsProcessing(true);
    try {
      const resp = await fetch('/api/webauthn/generate-registration-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserUid, userName: activeUserEmail })
      });
      const options = await resp.json();
      
      const attResp = await startRegistration({ optionsJSON: options });
      
      const verifyResp = await fetch('/api/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserUid, response: attResp })
      });
      const verification = await verifyResp.json();
      
      if (verification.verified) {
        updateSecuritySettings({ hasPasskey: true });
        createNotification({
          title: 'Passkey Registered',
          message: 'Your account is now secured with a passkey.',
          type: 'success'
        });
      }
    } catch (e: any) {
      console.error(e);
      createNotification({
        title: 'Passkey Failed',
        message: e.message || 'Could not register passkey.',
        type: 'error'
      });
    }
    setIsProcessing(false);
  };

  const scoreParams = {
    hasPin: securitySettings.pinEnabled || false,
    hasBiometrics: securitySettings.biometricEnabled || false,
    activeDevicesCount: devices.filter(d => d.status === 'active').length,
    lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isEmailVerified: true,
    hasPasskey: securitySettings.hasPasskey || false
  };
  
  const scoreResult = calculateSecurityScore(scoreParams);

  // Helper to render icon for device
  const getDeviceIcon = (type: string) => {
    if (type?.toLowerCase().includes('mobile')) return <Smartphone size={20} className="text-blue-400" />;
    return <Laptop size={20} className="text-emerald-400" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="text-emerald-400" size={32} />
            Security Center
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Production security telemetry and real-time session management.</p>
        </div>
        <button 
          onClick={() => setShowLockdownModal(true)}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold px-4 py-2 rounded-xl border border-red-500/20 transition-all flex items-center gap-2"
        >
          <AlertTriangle size={18} />
          Emergency Lockdown
        </button>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
        {[
          { id: 'overview', icon: Shield, label: 'Overview' },
          { id: 'devices', icon: Smartphone, label: 'Active Devices' },
          { id: 'passkeys', icon: Fingerprint, label: 'Passkeys & 2FA' },
          { id: 'audit', icon: Terminal, label: 'Audit Log' },
          { id: 'history', icon: History, label: 'Sign-in History' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-white text-black shadow-lg" 
                : "bg-[#1a1b23] text-slate-400 hover:text-white hover:bg-[#23242d] border border-white/5"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-[#1a1b23] border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Shield size={120} />
                </div>
                <div className="relative z-10">
                  <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center mb-4 mx-auto"
                       style={{ borderColor: scoreResult.color }}>
                    <span className="text-3xl font-black text-white">{scoreResult.score}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{scoreResult.level} Security</h3>
                  <p className="text-slate-400 text-sm mt-2">{scoreResult.score}/100 Score</p>
                </div>
              </div>

              <div className="md:col-span-2 bg-[#1a1b23] border border-white/10 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Security Recommendations</h3>
                <div className="space-y-3">
                  {scoreResult.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-black/20 rounded-xl">
                      <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                        <AlertTriangle size={16} />
                      </div>
                      <span className="text-slate-300 font-medium text-sm leading-relaxed">{rec}</span>
                    </div>
                  ))}
                  {scoreResult.recommendations.length === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="text-emerald-400" size={24} />
                      <span className="text-emerald-100 font-medium">Your account is fully secured. Great job!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-[#1a1b23] border border-white/10 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Account Connection</h3>
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white font-bold">
                         {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'G'}
                      </div>
                      <div>
                         <p className="font-bold text-white">{currentUser?.email || 'Connected'}</p>
                         <p className="text-sm text-slate-400">Authenticated via {currentUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google OAuth' : 'Identity Provider'}</p>
                      </div>
                   </div>
                   <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg uppercase tracking-wider">
                      Verified
                   </div>
                </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'devices' && (
          <motion.div key="devices" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-xl font-bold text-white">Active Sessions</h3>
              <button 
                onClick={() => setShowRevokeAllModal(true)}
                disabled={devices.length <= 1}
                className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                Sign out all other devices
              </button>
            </div>
            {devices.map(device => (
              <div key={device.id} className="bg-[#1a1b23] border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-xl text-white">
                    {getDeviceIcon(device.deviceType || '')}
                  </div>
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                      {device.deviceName}
                      {device.isCurrent && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full uppercase font-bold tracking-wider">This Device</span>}
                    </h4>
                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1"><MapPin size={14}/> {device.location?.city || 'Unknown Location'}</span>
                      <span className="flex items-center gap-1"><Globe size={14}/> IP: {device.ip || 'Unknown'}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Last active: {device.lastActive ? format(new Date(device.lastActive), 'MMM d, h:mm a') : 'Recently'}
                    </p>
                  </div>
                </div>
                {!device.isCurrent && (
                  <button 
                    onClick={() => handleRevokeDevice(device.id)}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'passkeys' && (
          <motion.div key="passkeys" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="bg-[#1a1b23] border border-white/10 rounded-3xl p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Fingerprint size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Passkeys (WebAuthn)</h3>
                  <p className="text-slate-400 text-sm mt-1">Sign in safely without a password using your device's biometrics or security key.</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                <div>
                  <p className="font-bold text-white">Device Passkey</p>
                  <p className="text-sm text-slate-400">{securitySettings.hasPasskey ? 'Configured and active' : 'Not configured'}</p>
                </div>
                {!securitySettings.hasPasskey ? (
                  <button 
                    onClick={handleRegisterPasskey}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
                  >
                    {isProcessing ? 'Registering...' : 'Add Passkey'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 size={18} /> Active
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-[#1a1b23] border border-white/10 rounded-3xl p-6 opacity-60">
               <h3 className="text-lg font-bold text-white mb-2">Two-Factor Authentication (TOTP)</h3>
               <p className="text-slate-400 text-sm mb-4">Use an authenticator app like Google Authenticator.</p>
               <button disabled className="px-4 py-2 bg-white/5 text-slate-500 font-bold rounded-xl cursor-not-allowed">
                  Setup 2FA (Requires Identity Platform)
               </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
             <h3 className="text-lg font-bold text-white mb-4">Immutable Audit Log</h3>
             <div className="bg-[#1a1b23] border border-white/10 rounded-3xl overflow-hidden">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    No security events recorded yet.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-black/40 text-slate-400">
                      <tr>
                        <th className="p-4 font-semibold">Time</th>
                        <th className="p-4 font-semibold">Event</th>
                        <th className="p-4 font-semibold">IP Address</th>
                        <th className="p-4 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {auditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-white/5">
                          <td className="p-4 text-slate-300 whitespace-nowrap">
                            {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-bold",
                              log.eventType.includes('SUCCESS') ? "bg-emerald-500/20 text-emerald-400" :
                              log.eventType.includes('FAILED') ? "bg-red-500/20 text-red-400" :
                              log.eventType.includes('LEDGER') ? "bg-blue-500/20 text-blue-400" :
                              "bg-white/10 text-slate-300"
                            )}>
                              {log.eventType}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 font-mono text-xs">{log.ip}</td>
                          <td className="p-4 text-slate-400 text-xs truncate max-w-[200px]" title={log.details}>
                            {log.details || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
             </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            {loginLogs.length === 0 ? (
              <div className="text-center p-8 text-slate-400 bg-[#1a1b23] rounded-3xl border border-white/5">
                No sign-in history available.
              </div>
            ) : (
              loginLogs.map(log => (
                <div key={log.id} className="bg-[#1a1b23] border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-bold">{log.device} • {log.browser}</h4>
                    <p className="text-sm text-slate-400">{log.location?.city}, {log.location?.country} • {log.ip}</p>
                    <p className="text-xs text-slate-500 mt-1">{format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold uppercase",
                    log.status === 'success' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {log.status}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke All Modal */}
      <AnimatePresence>
        {showRevokeAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRevokeAllModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-neutral-900 border border-white/10 p-6 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">Sign out all other devices?</h3>
              <p className="text-slate-400 text-sm mb-6">This will securely invalidate all session tokens across every other device logged into this account. You will remain signed in here.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowRevokeAllModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-all">Cancel</button>
                <button onClick={handleRevokeAll} disabled={isProcessing} className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50">
                  {isProcessing ? 'Processing...' : 'Confirm Sign Out'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lockdown Modal */}
      <AnimatePresence>
        {showLockdownModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLockdownModal(false)} className="absolute inset-0 bg-red-950/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-neutral-900 border border-red-500/30 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center mb-6 border border-red-500/30">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Emergency Lockdown</h3>
              <p className="text-red-300 text-sm mb-6 font-medium leading-relaxed">
                WARNING: This will instantly revoke ALL sessions, block sensitive operations, and lock out your account. 
                You will need to reauthenticate to regain access. Use only if you suspect a breach.
              </p>
              <div className="space-y-3">
                <button onClick={handleEmergencyLockdown} disabled={isProcessing} className="w-full py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50">
                  {isProcessing ? 'LOCKING DOWN...' : 'YES, LOCKDOWN ACCOUNT'}
                </button>
                <button onClick={() => setShowLockdownModal(false)} className="w-full py-4 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 transition-all">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
"""

with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

print("done")
