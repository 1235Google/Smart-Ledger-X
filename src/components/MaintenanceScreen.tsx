import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Clock, 
  RotateCcw, 
  Lock, 
  Server, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';

export default function MaintenanceScreen() {
  const { systemConfig, refreshSystemMode } = useStore();
  const { showInfo } = useToast();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!systemConfig.expectedEndAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const diff = new Date(systemConfig.expectedEndAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining('Expiring shortly');
      } else {
        const mins = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        setTimeRemaining(`${hours > 0 ? `${hours}h ` : ''}${remMins}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 5000);
    return () => clearInterval(interval);
  }, [systemConfig.expectedEndAt]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const updated = await refreshSystemMode();
      if (updated.mode === 'normal') {
        window.location.reload();
      } else {
        showInfo('System Status', `SmartLedger remains in ${updated.mode.toUpperCase()} mode.`);
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsChecking(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0f] text-white">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full bg-[#13141f] border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner animate-pulse">
          <ShieldAlert size={36} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Server size={12} />
            <span>Maintenance Mode Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            SmartLedger Under Maintenance
          </h1>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Our systems are currently undergoing scheduled maintenance to safeguard your data integrity and perform essential upgrades.
          </p>
        </div>

        {systemConfig.reason && (
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 text-left">
            <div className="font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
              <Clock size={13} /> Maintenance Details
            </div>
            <p className="italic text-slate-200">&ldquo;{systemConfig.reason}&rdquo;</p>
            {timeRemaining && (
              <div className="mt-2 text-[11px] text-amber-300 font-medium">
                Estimated duration: ~{timeRemaining}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-white/10"
          >
            <RotateCcw size={14} className={isChecking ? 'animate-spin' : ''} />
            <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/30"
          >
            <Lock size={14} />
            <span>Admin Portal Login</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          SmartLedger Cloud Infrastructure &bull; Dual-Encrypted Vault
        </p>
      </div>
    </div>
  );
}
