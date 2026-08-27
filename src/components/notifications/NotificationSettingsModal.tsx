import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Bell, 
  Mail, 
  Shield, 
  Clock, 
  Receipt, 
  Cloud, 
  BarChart3, 
  Calendar, 
  Check, 
  Smartphone, 
  Save, 
  AlertTriangle 
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import { NotificationSettings } from '../../types';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
  const { settings, updateSettings, requestPushPermission } = useNotifications();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState<NotificationSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Sync state if modal opens with new settings
  React.useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPushStatus(Notification.permission);
      }
    }
  }, [isOpen, settings]);

  const handleToggle = (key: keyof Omit<NotificationSettings, 'emailToggles' | 'emailAddress' | 'updatedAt'>) => {
    setFormData(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleEmailToggle = (key: keyof NotificationSettings['emailToggles']) => {
    setFormData(prev => ({
      ...prev,
      emailToggles: {
        ...prev.emailToggles,
        [key]: !prev.emailToggles[key],
      },
    }));
  };

  const handleRequestPush = async () => {
    const granted = await requestPushPermission();
    if (granted) {
      setFormData(prev => ({ ...prev, pushEnabled: true }));
      setPushStatus('granted');
      showSuccess('Browser Push Notifications enabled!');
    } else {
      setPushStatus(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
      showError('Push notification permission was not granted.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      showSuccess('Notification preferences saved successfully');
      onClose();
    } catch (e: any) {
      showError('Failed to save settings: ' + (e?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Notification Preferences</h3>
                <p className="text-xs text-slate-400">Configure in-app, push, and email notification triggers</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Content Scroll Area */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-white/5">
            {/* Section 1: In-App Event Alerts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Event Alert Triggers</h4>
                  <p className="text-xs text-slate-400">Control which financial and security events generate notifications</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Due Payments */}
                <div 
                  onClick={() => handleToggle('duePayments')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    formData.duePayments 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-white/[0.02] border-white/5 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${formData.duePayments ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-slate-400'}`}>
                    <Clock size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Due Payments</span>
                      <input 
                        type="checkbox" 
                        checked={formData.duePayments} 
                        onChange={() => {}} 
                        className="rounded accent-amber-500" 
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Remind when customer payments are due today or overdue</p>
                  </div>
                </div>

                {/* Upcoming Bills */}
                <div 
                  onClick={() => handleToggle('upcomingBills')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    formData.upcomingBills 
                      ? 'bg-indigo-500/10 border-indigo-500/30' 
                      : 'bg-white/[0.02] border-white/5 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${formData.upcomingBills ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-400'}`}>
                    <Receipt size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Upcoming Bills</span>
                      <input 
                        type="checkbox" 
                        checked={formData.upcomingBills} 
                        onChange={() => {}} 
                        className="rounded accent-indigo-500" 
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Alerts at 7d, 3d, 1d before, and on bill due date</p>
                  </div>
                </div>

                {/* Cloud Backup */}
                <div 
                  onClick={() => handleToggle('backupAlerts')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    formData.backupAlerts 
                      ? 'bg-blue-500/10 border-blue-500/30' 
                      : 'bg-white/[0.02] border-white/5 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${formData.backupAlerts ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400'}`}>
                    <Cloud size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Backup Alerts</span>
                      <input 
                        type="checkbox" 
                        checked={formData.backupAlerts} 
                        onChange={() => {}} 
                        className="rounded accent-blue-500" 
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Instant notification on backup success or failure</p>
                  </div>
                </div>

                {/* Security Alerts */}
                <div 
                  onClick={() => handleToggle('securityAlerts')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    formData.securityAlerts 
                      ? 'bg-rose-500/10 border-rose-500/30' 
                      : 'bg-white/[0.02] border-white/5 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${formData.securityAlerts ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-slate-400'}`}>
                    <Shield size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Security Alerts</span>
                      <input 
                        type="checkbox" 
                        checked={formData.securityAlerts} 
                        onChange={() => {}} 
                        className="rounded accent-rose-500" 
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">New devices, PIN changes, restore, failed logins</p>
                  </div>
                </div>

                {/* Daily Summary */}
                <div 
                  onClick={() => handleToggle('dailySummary')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    formData.dailySummary 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-white/[0.02] border-white/5 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${formData.dailySummary ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>
                    <BarChart3 size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Daily Summary</span>
                      <input 
                        type="checkbox" 
                        checked={formData.dailySummary} 
                        onChange={() => {}} 
                        className="rounded accent-emerald-500" 
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">End-of-day summary only when transactions occur</p>
                  </div>
                </div>

                {/* Weekly Report */}
                <div 
                  onClick={() => handleToggle('weeklyReport')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    formData.weeklyReport 
                      ? 'bg-purple-500/10 border-purple-500/30' 
                      : 'bg-white/[0.02] border-white/5 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${formData.weeklyReport ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-slate-400'}`}>
                    <Calendar size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Weekly Report</span>
                      <input 
                        type="checkbox" 
                        checked={formData.weeklyReport} 
                        onChange={() => {}} 
                        className="rounded accent-purple-500" 
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">7-day financial analysis, top category & highest spend</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Push Notifications (Browser Web Notifications) */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Smartphone size={16} className="text-indigo-400" />
                    Push Notifications
                  </h4>
                  <p className="text-xs text-slate-400">Receive real-time desktop & mobile browser push banners</p>
                </div>
                {pushStatus === 'granted' ? (
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <Check size={12} /> Active
                  </span>
                ) : (
                  <button
                    onClick={handleRequestPush}
                    type="button"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
                  >
                    Enable Browser Push
                  </button>
                )}
              </div>
            </div>

            {/* Section 3: Optional Email Notifications */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Mail size={16} className="text-indigo-400" />
                    Email Notifications
                  </h4>
                  <p className="text-xs text-slate-400">Optional transactional email dispatches for important events</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.emailNotifications}
                    onChange={() => handleToggle('emailNotifications')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {formData.emailNotifications && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-2"
                >
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={formData.emailAddress || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <p className="text-xs font-semibold text-slate-300">Select which events trigger email delivery:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.emailToggles.duePayments}
                          onChange={() => handleEmailToggle('duePayments')}
                          className="rounded accent-indigo-500"
                        />
                        Due Payments
                      </label>
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.emailToggles.upcomingBills}
                          onChange={() => handleEmailToggle('upcomingBills')}
                          className="rounded accent-indigo-500"
                        />
                        Upcoming Bills
                      </label>
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.emailToggles.backupAlerts}
                          onChange={() => handleEmailToggle('backupAlerts')}
                          className="rounded accent-indigo-500"
                        />
                        Cloud Backup Status
                      </label>
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.emailToggles.securityAlerts}
                          onChange={() => handleEmailToggle('securityAlerts')}
                          className="rounded accent-indigo-500"
                        />
                        Security Alerts
                      </label>
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.emailToggles.weeklyReport}
                          onChange={() => handleEmailToggle('weeklyReport')}
                          className="rounded accent-indigo-500"
                        />
                        Weekly Financial Digest
                      </label>
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.emailToggles.dailySummary}
                          onChange={() => handleEmailToggle('dailySummary')}
                          className="rounded accent-indigo-500"
                        />
                        Daily Summary
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-white/[0.02]">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Preferences
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
