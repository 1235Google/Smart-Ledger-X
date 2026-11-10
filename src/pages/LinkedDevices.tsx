import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  Laptop, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  Edit3, 
  LogOut, 
  ShieldAlert, 
  MapPin, 
  Globe, 
  ArrowLeft, 
  Camera, 
  Battery, 
  Loader2, 
  Plus, 
  FileText,
  Filter,
  Sparkles,
  Info
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import MobileQrScannerModal from '../components/auth/MobileQrScannerModal';

interface DeviceItem {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  firstLogin: string;
  lastActive: string;
  status: 'active' | 'revoked';
  isTrusted: boolean;
  trustScore: number;
  batteryLevel?: number;
}

interface AuditLogItem {
  id: string;
  sessionId: string;
  timestamp: string;
  status: 'SUCCESS' | 'REJECTED' | 'EXPIRED' | 'UNAUTHORIZED' | 'PENDING';
  desktopName: string;
  desktopOs: string;
  desktopBrowser: string;
  ip: string;
  country: string;
  location: string;
  userEmail?: string;
  biometricUsed?: boolean;
  reason?: string;
}

export default function LinkedDevices() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<'devices' | 'history'>('devices');
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [newDeviceName, setNewDeviceName] = useState<string>('');

  const uid = user?.uid || 'usr_enterprise_001';

  // Fetch linked devices
  const fetchDevices = async () => {
    try {
      const res = await fetch(`/api/auth/qr-pair/devices?uid=${encodeURIComponent(uid)}`);
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (e) {}
  };

  // Fetch pairing audit logs
  const fetchLogs = async () => {
    try {
      const query = filterStatus !== 'ALL' ? `?status=${filterStatus}` : '';
      const res = await fetch(`/api/auth/qr-pair/logs${query}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDevices(), fetchLogs()]).finally(() => setLoading(false));
  }, [uid, filterStatus]);

  // Manage Device Action (Rename, Revoke, Trust, Untrust)
  const handleDeviceAction = async (deviceId: string, action: 'rename' | 'revoke' | 'trust' | 'untrust', value?: string) => {
    try {
      const res = await fetch('/api/auth/qr-pair/devices/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, deviceId, action, value })
      });
      const data = await res.json();
      if (data.success) {
        fetchDevices();
        setEditingDeviceId(null);
      }
    } catch (err) {}
  };

  // Export CSV
  const handleExportCsv = () => {
    window.open('/api/auth/qr-pair/logs/export', '_blank');
  };

  return (
    <div className="min-h-screen pb-16 pt-4 px-4 sm:px-6 max-w-5xl mx-auto text-slate-100 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-2 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Settings</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <span>Linked Devices & Security</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase tracking-wider">
              Enterprise
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your authorized desktop sessions and cryptographically verify login requests.
          </p>
        </div>

        {/* Action: Open Scanner */}
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_8px_24px_rgba(0,240,255,0.3)] transition-transform active:scale-95"
        >
          <Camera size={18} />
          <span>Scan Desktop QR</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-6 max-w-sm">
        <button
          onClick={() => setActiveTab('devices')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'devices'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Linked Devices ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Pairing History ({logs.length})
        </button>
      </div>

      {/* TAB 1: LINKED DEVICES LIST */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 size={24} className="animate-spin text-cyan-400" />
              <span>Loading linked devices...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-[28px] border border-white/10 bg-slate-900/40 backdrop-blur-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto flex items-center justify-center">
                <Laptop size={32} className="text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white">No Linked Devices Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Log in to SmartLedgerX on your desktop by choosing <strong>"Continue using Mobile Device"</strong> on the login screen, then scan the QR code using your phone.
              </p>
              <button
                onClick={() => setShowScanner(true)}
                className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95"
              >
                <Camera size={15} />
                <span>Scan Desktop QR Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.map((device) => {
                const isRevoked = device.status === 'revoked';
                const isEditing = editingDeviceId === device.deviceId;

                return (
                  <motion.div
                    key={device.deviceId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-[24px] border p-5 backdrop-blur-2xl transition-all ${
                      isRevoked
                        ? 'border-white/5 bg-slate-900/30 opacity-60'
                        : 'border-white/15 bg-slate-900/70 hover:border-cyan-500/40 shadow-lg'
                    }`}
                  >
                    {/* Top Device Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                          {device.deviceType === 'mobile' ? (
                            <Smartphone size={20} className="text-cyan-400" />
                          ) : (
                            <Laptop size={20} className="text-cyan-400" />
                          )}
                        </div>

                        <div>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={newDeviceName}
                                onChange={(e) => setNewDeviceName(e.target.value)}
                                className="px-2 py-1 rounded bg-black/50 border border-cyan-400 text-xs font-bold text-white focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleDeviceAction(device.deviceId, 'rename', newDeviceName)}
                                className="px-2 py-1 rounded bg-cyan-500 text-slate-950 text-xs font-bold"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-white">{device.deviceName}</h4>
                              <button
                                onClick={() => {
                                  setEditingDeviceId(device.deviceId);
                                  setNewDeviceName(device.deviceName);
                                }}
                                className="text-slate-500 hover:text-white"
                                title="Rename device"
                              >
                                <Edit3 size={12} />
                              </button>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400">{device.browser} &bull; {device.os}</p>
                        </div>
                      </div>

                      {/* Trust & Status Badge */}
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isRevoked 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : device.isTrusted 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {isRevoked ? 'Revoked' : device.isTrusted ? '30-Day Trusted' : 'Active Session'}
                        </span>

                        <span className="text-[10px] text-cyan-300 font-semibold">
                          Trust Score: {device.trustScore}%
                        </span>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="space-y-1.5 py-3 border-y border-white/5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <MapPin size={11} />
                          <span>Location:</span>
                        </span>
                        <span className="font-medium text-slate-200">{device.location}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">IP Address:</span>
                        <span className="font-mono text-slate-300">{device.ip}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Last Active:</span>
                        <span className="text-slate-300">{new Date(device.lastActive).toLocaleDateString()} at {new Date(device.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {device.batteryLevel !== undefined && (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Battery size={12} className="text-cyan-400" />
                            <span>Phone Battery:</span>
                          </span>
                          <span className="font-mono text-cyan-300">{device.batteryLevel}%</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-3">
                      {!isRevoked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDeviceAction(device.deviceId, device.isTrusted ? 'untrust' : 'trust')}
                            className="text-xs font-semibold text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1"
                          >
                            <ShieldCheck size={14} className={device.isTrusted ? 'text-emerald-400' : 'text-slate-400'} />
                            <span>{device.isTrusted ? 'Revoke 30-Day Trust' : 'Trust Device (30 Days)'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeviceAction(device.deviceId, 'revoke')}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <LogOut size={12} />
                            <span>Sign Out Device</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-rose-400 font-medium italic">
                          Authorization revoked. New QR scan required to reconnect.
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAIRING AUDIT & LOGIN HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter Bar & Export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-cyan-400" />
              <span className="text-xs font-semibold text-slate-300">Filter Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Pairing Requests</option>
                <option value="SUCCESS">Successful Logins</option>
                <option value="REJECTED">Rejected Requests</option>
                <option value="EXPIRED">Expired Sessions</option>
              </select>
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-colors border border-white/10"
            >
              <Download size={13} />
              <span>Export Audit CSV</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="rounded-[24px] border border-white/10 bg-slate-900/60 backdrop-blur-2xl overflow-hidden shadow-xl">
            {logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No pairing events recorded matching this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Desktop Device</th>
                      <th className="py-3 px-4">OS & Browser</th>
                      <th className="py-3 px-4">Location & IP</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Security / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log) => {
                      const isSuccess = log.status === 'SUCCESS';
                      const isRejected = log.status === 'REJECTED';
                      const isExpired = log.status === 'EXPIRED';

                      return (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-0.5 rounded-full ${
                              isSuccess
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isRejected
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {isSuccess && <CheckCircle2 size={11} />}
                              {isRejected && <XCircle size={11} />}
                              {isExpired && <Clock size={11} />}
                              <span>{log.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {log.desktopName}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {log.desktopOs} &bull; {log.desktopBrowser}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div>{log.location}</div>
                            <div className="font-mono text-[10px] text-slate-500">{log.ip}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {isSuccess ? (
                              <span className="text-emerald-300 font-medium">Biometric Verified</span>
                            ) : (
                              <span className="text-slate-400">{log.reason || 'None'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <MobileQrScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onLoginApproved={() => {
          fetchDevices();
          fetchLogs();
        }}
      />
    </div>
  );
}
