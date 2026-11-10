import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Laptop, 
  Monitor, 
  Tablet, 
  ShieldCheck, 
  LogOut, 
  CheckCircle2, 
  MapPin, 
  Globe, 
  Clock, 
  RefreshCw, 
  X, 
  AlertTriangle,
  Radio,
  ExternalLink,
  Shield,
  Trash2
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { UserDevice } from '../types';
import { subscribeToUserDevices, updateUserDevice } from '../lib/securityService';
import { cn, formatDateTime } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface LinkedDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminView?: boolean;
}

export default function LinkedDevicesModal({ isOpen, onClose, isAdminView = false }: LinkedDevicesModalProps) {
  const { currentUser, generalSettings } = useStore();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const targetUid = currentUser?.uid || 'local_user';

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribe = subscribeToUserDevices(targetUid, (updatedDevices) => {
      setDevices(updatedDevices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, targetUid]);

  const handleRevokeDevice = async (deviceId: string) => {
    setRevokingId(deviceId);
    try {
      await updateUserDevice(targetUid, deviceId, {
        status: 'revoked'
      });
      showSuccess('Device Signed Out', 'The remote device session has been terminated.');
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Could not sign out device.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleSignOutAllOther = async () => {
    const otherActive = devices.filter(d => !d.isCurrent && d.status !== 'revoked');
    if (otherActive.length === 0) return;

    setIsSigningOutAll(true);
    try {
      for (const dev of otherActive) {
        await updateUserDevice(targetUid, dev.id, {
          status: 'revoked'
        });
      }
      showSuccess('Signed Out', `Terminated ${otherActive.length} remote linked session(s).`);
    } catch (err: any) {
      showError('Action Failed', 'Could not sign out all other devices.');
    } finally {
      setIsSigningOutAll(false);
    }
  };

  if (!isOpen) return null;

  const activeDevices = devices.filter(d => d.status === 'active' || d.isCurrent);
  const currentDevice = activeDevices.find(d => d.isCurrent) || activeDevices[0];
  const otherDevices = activeDevices.filter(d => d !== currentDevice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl max-h-[92vh] bg-[#111318] border border-white/10 rounded-[28px] p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden text-white"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0 gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Linked Devices & Sessions
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeDevices.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Review and manage authenticated browser and mobile sessions for your ledger.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Device Content */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 py-4 pr-1 space-y-5">
          {/* Section 1: Current Device Banner */}
          {currentDevice && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Radio size={13} className="text-emerald-400 animate-pulse" />
                <span>Current Device (This Session)</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-slate-900 border border-blue-500/30 shadow-[0_4px_20px_rgba(59,130,246,0.08)] flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                    {currentDevice.deviceType === 'mobile' ? (
                      <Smartphone size={22} />
                    ) : currentDevice.deviceType === 'tablet' ? (
                      <Tablet size={22} />
                    ) : (
                      <Laptop size={22} />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {currentDevice.deviceName || 'Local Workstation'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500 text-white shadow-xs">
                        This Device
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      {currentDevice.browser || 'Web Browser'} on {currentDevice.os || 'Operating System'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-blue-400" />
                        <span>{currentDevice.location || 'Current Location'}</span>
                      </span>

                      {currentDevice.ip && currentDevice.ip !== 'Detecting...' && (
                        <span className="flex items-center gap-1 font-mono text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5 text-slate-300">
                          <Globe size={11} className="text-slate-400" />
                          <span>{currentDevice.ip}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-emerald-400">
                        <Clock size={12} />
                        <span>Active now</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <ShieldCheck size={14} />
                  <span>Secured</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Other Linked Devices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Other Linked Devices ({otherDevices.length})
              </span>

              {otherDevices.length > 0 && (
                <button
                  type="button"
                  onClick={handleSignOutAllOther}
                  disabled={isSigningOutAll}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <LogOut size={13} />
                  <span>{isSigningOutAll ? 'Signing out...' : 'Sign out of all other devices'}</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <RefreshCw size={20} className="animate-spin text-blue-400" />
                <span>Checking linked device sessions...</span>
              </div>
            ) : otherDevices.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400 space-y-1">
                <p className="font-medium text-slate-300">No other linked devices</p>
                <p className="text-[11px] text-slate-500">
                  Your SmartLedger account is currently only active on this device. When you log in from a tablet, phone, or another laptop, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {otherDevices.map((device) => {
                  const isRevoking = revokingId === device.id;
                  return (
                    <div
                      key={device.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                          {device.deviceType === 'mobile' ? (
                            <Smartphone size={18} />
                          ) : device.deviceType === 'tablet' ? (
                            <Tablet size={18} />
                          ) : (
                            <Laptop size={18} />
                          )}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">
                            {device.deviceName}
                          </h4>
                          <p className="text-xs text-slate-400 truncate">
                            {device.browser} on {device.os}
                          </p>

                          <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-[11px] text-slate-500">
                            {device.location && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin size={11} className="text-slate-500" />
                                <span>{device.location}</span>
                              </span>
                            )}
                            {device.ip && (
                              <span className="font-mono text-[10px] text-slate-400">
                                {device.ip}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock size={11} />
                              <span>Last active: {formatDateTime(device.lastActive || device.createdAt, generalSettings?.timezone)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeDevice(device.id)}
                        disabled={isRevoking}
                        className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                      >
                        <Trash2 size={13} />
                        <span>{isRevoking ? 'Signing out...' : 'Sign out'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick link to Security Center */}
          <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-blue-400 shrink-0" />
              <span>Need biometric lock or login audit logs?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/security');
              }}
              className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-semibold text-xs transition-colors flex items-center gap-1"
            >
              <span>Security Center</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Encrypted Ledger Device Management</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
