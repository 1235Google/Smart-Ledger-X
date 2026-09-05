import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Monitor, ShieldCheck, ShieldAlert, XCircle, LogOut, CheckCircle2, History, AlertCircle, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { UserDevice } from '../../types';
import { subscribeToUserDevices, updateUserDevice, removeUserDevice } from '../../lib/securityService';

export default function AdminTrustedDevices() {
  const { currentUser, adminUser } = useStore();
  const { showSuccess, showError } = useToast();
  
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToUserDevices(currentUser?.uid || 'local_user', (updatedDevices) => {
      setDevices(updatedDevices);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleUpdateTrust = async (deviceId: string, status: 'trusted' | 'unrecognized' | 'blocked') => {
    try {
      await updateUserDevice(currentUser?.uid || 'local_user', deviceId, {
        trustStatus: status,
        [status === 'trusted' ? 'trustedAt' : status === 'blocked' ? 'blockedAt' : 'trustedAt']: new Date().toISOString(),
        [status === 'trusted' ? 'trustedBy' : status === 'blocked' ? 'blockedBy' : 'trustedBy']: adminUser?.email || 'admin'
      });
      showSuccess('Device Updated', `Device marked as ${status}.`);
    } catch (e) {
      showError('Update Failed', 'Could not update device trust status.');
    }
  };

  const handleRevokeSession = async (deviceId: string) => {
    try {
      await updateUserDevice(currentUser?.uid || 'local_user', deviceId, {
        status: 'revoked'
      });
      showSuccess('Session Revoked', 'The device session has been revoked.');
    } catch (e) {
      showError('Action Failed', 'Could not revoke device session.');
    }
  };

  const handleSignOutAll = async () => {
    try {
      const activeDevices = devices.filter(d => !d.isCurrent && d.status !== 'revoked');
      for (const d of activeDevices) {
        await updateUserDevice(currentUser?.uid || 'local_user', d.id, {
          status: 'revoked'
        });
      }
      showSuccess('Signed Out', `Successfully signed out of ${activeDevices.length} devices.`);
    } catch (e) {
      showError('Sign Out Failed', 'Failed to sign out of all devices.');
    }
  };

  const getDeviceIcon = (type?: string) => {
    if (type === 'mobile') return <Smartphone size={24} />;
    return <Monitor size={24} />;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0b57d0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeDevices = devices.filter(d => d.status === 'active');
  const revokedDevices = devices.filter(d => d.status === 'revoked');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Smartphone className="text-[#a8c7fa]" size={28} />
            Trusted Devices Manager
          </h1>
          <p className="text-slate-400 mt-1">Monitor, verify, and block devices accessing the ledger. Protect your financial data.</p>
        </div>
        <button
          onClick={handleSignOutAll}
          className="px-5 py-2.5 bg-[#282a2d] hover:bg-white/10 text-white rounded-xl font-medium flex items-center gap-2 border border-white/10 transition-all"
        >
          <LogOut size={18} />
          Sign Out All Other Devices
        </button>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" size={24} />
          Active Sessions ({activeDevices.length})
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {activeDevices.map(device => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={device.id}
                className={`bg-[#1e1e1e] border rounded-2xl p-5 relative overflow-hidden transition-all ${
                  device.isCurrent ? 'border-[#0b57d0]/50 shadow-[0_0_15px_rgba(11,87,208,0.15)]' : 
                  device.trustStatus === 'blocked' ? 'border-red-500/30 bg-red-500/5' :
                  device.trustStatus === 'trusted' ? 'border-emerald-500/20 bg-emerald-500/5' :
                  'border-white/5'
                }`}
              >
                {device.isCurrent && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#0b57d0]" />
                )}
                
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      device.isCurrent ? 'bg-[#0b57d0]/20 text-[#a8c7fa]' : 'bg-[#282a2d] text-slate-400'
                    }`}>
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {device.deviceName}
                        {device.isCurrent && (
                          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#0b57d0] text-white px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                        {!device.isCurrent && device.trustStatus === 'trusted' && (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        )}
                      </h3>
                      <p className="text-sm font-medium text-slate-400">{device.browser} on {device.os}</p>
                    </div>
                  </div>
                  
                  {/* Trust Status Badge */}
                  <div className="shrink-0">
                    {device.trustStatus === 'trusted' ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={14} /> Trusted
                      </span>
                    ) : device.trustStatus === 'blocked' ? (
                      <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <XCircle size={14} /> Blocked
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle size={14} /> Unrecognized
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[#131314] rounded-xl p-3 text-xs text-slate-400 mb-4">
                  <div>
                    <strong className="text-slate-300 block mb-0.5">IP Address</strong>
                    {device.ip}
                  </div>
                  <div>
                    <strong className="text-slate-300 block mb-0.5">Location</strong>
                    {device.location} {device.flagEmoji}
                  </div>
                  <div>
                    <strong className="text-slate-300 block mb-0.5">Last Active</strong>
                    {new Date(device.lastActive).toLocaleString()}
                  </div>
                  <div>
                    <strong className="text-slate-300 block mb-0.5">First Seen</strong>
                    {new Date(device.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!device.isCurrent && (
                    <>
                      {device.trustStatus !== 'trusted' && (
                        <button
                          onClick={() => handleUpdateTrust(device.id, 'trusted')}
                          className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold uppercase transition-colors"
                        >
                          Mark Trusted
                        </button>
                      )}
                      {device.trustStatus !== 'blocked' && (
                        <button
                          onClick={() => handleUpdateTrust(device.id, 'blocked')}
                          className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold uppercase transition-colors"
                        >
                          Block Device
                        </button>
                      )}
                      <button
                        onClick={() => handleRevokeSession(device.id)}
                        className="flex-1 py-2 rounded-lg bg-[#282a2d] text-white hover:bg-white/10 text-xs font-bold uppercase transition-colors"
                      >
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {revokedDevices.length > 0 && (
        <div className="space-y-6 pt-8 border-t border-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="text-slate-400" size={24} />
            Revoked Sessions ({revokedDevices.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revokedDevices.map(device => (
              <div key={device.id} className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-4 opacity-75">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#282a2d] text-slate-500 flex items-center justify-center">
                    {getDeviceIcon(device.deviceType)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">{device.deviceName}</h3>
                    <p className="text-xs text-slate-400">{device.browser}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Last seen: {new Date(device.lastActive).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
