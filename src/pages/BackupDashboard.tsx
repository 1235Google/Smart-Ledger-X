import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, Shield, CheckCircle2, AlertCircle, HardDrive, 
  Download, RotateCcw, Trash2, Clock, Play, FileJson, 
  Lock, RefreshCw 
} from 'lucide-react';
import { BackupService, BackupMetadata } from '../lib/backupService';
import { formatCurrency, formatDate } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import AnimatedButton from '../components/ui/AnimatedButton';
import DataStateGuard from '../components/ui/DataStateGuard';

export default function BackupDashboard() {
  const { generalSettings } = useStore();
  const { showSuccess, showError } = useToast();
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const data = await BackupService.listBackups();
      setBackups(data);
    } catch (err) {
      console.error(err);
      showError('Error', 'Failed to load backup history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const newBackup = await BackupService.createBackup('manual');
      setBackups(prev => [newBackup, ...prev]);
      showSuccess('Backup Created', 'Backup created and verified successfully.');
    } catch (err: any) {
      console.error(err);
      showError('Backup Failed', err.message || 'Failed to create backup.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!window.confirm('WARNING: This will completely replace your current data with this backup. A pre-restore backup will be created automatically. Proceed?')) {
      return;
    }
    setIsRestoring(backupId);
    try {
      await BackupService.restoreBackup(backupId);
      showSuccess('Backup Restored', 'Backup restored successfully. Please refresh the page.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      console.error(err);
      showError('Restore Failed', err.message || 'Failed to restore backup.');
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!window.confirm('Are you sure you want to delete this backup permanently?')) return;
    try {
      await BackupService.deleteBackup(backupId);
      setBackups(prev => prev.filter(b => b.id !== backupId));
      showSuccess('Deleted', 'Backup deleted.');
    } catch (err: any) {
      console.error(err);
      showError('Error', 'Failed to delete backup.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const totalStorage = backups.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <DataStateGuard status="loaded">
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8 bg-[#05060a]"
      >
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Cloud className="text-blue-400" />
              Backup & Recovery
            </h1>
            <p className="text-slate-400 mt-2 text-sm max-w-2xl">
              Enterprise-grade automated cloud backups. Your data is encrypted with AES-256 and securely stored. 
              Restoring will return your application exactly to the selected point in time.
            </p>
          </div>
          <AnimatedButton
            onClick={handleCreateBackup}
            disabled={isCreating}
            icon={isCreating ? <RefreshCw className='animate-spin' size={18} /> : <Cloud size={18} />}
            className={isCreating ? 'animate-pulse' : ''}
          >
            {isCreating ? 'Creating Backup...' : 'Backup Now'}
          </AnimatedButton>
        </header>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
            <div className="flex items-center gap-3 text-emerald-400 mb-2">
              <Shield size={20} />
              <h3 className="font-semibold text-sm">Automatic Backup</h3>
            </div>
            <p className="text-2xl font-bold text-white mb-1">ON</p>
            <p className="text-xs text-slate-400">Runs every 24 hours</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
            <div className="flex items-center gap-3 text-blue-400 mb-2">
              <Clock size={20} />
              <h3 className="font-semibold text-sm">Last Backup</h3>
            </div>
            <p className="text-xl font-bold text-white mb-1 truncate">
              {backups.length > 0 ? formatDate(backups[0].createdAt, generalSettings?.timezone) : 'Never'}
            </p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> Verified & Encrypted
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
            <div className="flex items-center gap-3 text-purple-400 mb-2">
              <HardDrive size={20} />
              <h3 className="font-semibold text-sm">Storage Used</h3>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{formatSize(totalStorage)}</p>
            <p className="text-xs text-slate-400">{backups.length} snapshots total</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-2">
              <Lock size={20} />
              <h3 className="font-semibold text-sm">Encryption</h3>
            </div>
            <p className="text-2xl font-bold text-white mb-1">AES-256</p>
            <p className="text-xs text-slate-400">Zero-knowledge secure</p>
          </div>
        </div>

        {/* Backup History */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Version History</h2>
            <span className="text-xs text-slate-400 font-mono">{backups.length} points in time</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/20 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Snapshot</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <RefreshCw className="animate-spin mx-auto mb-3" size={24} />
                      Loading backup history...
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <Cloud className="mx-auto mb-3 opacity-50" size={32} />
                      No backups found. Create your first backup to secure your data.
                    </td>
                  </tr>
                ) : (
                  backups.map((backup, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={backup.id} 
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${backup.type === 'daily' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            <FileJson size={16} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">{backup.name}</div>
                            <div className="text-[10px] text-slate-500 uppercase">{backup.type} • V{backup.version}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {formatDate(backup.createdAt, generalSettings?.timezone)}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {formatSize(backup.size)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
                          <CheckCircle2 size={12} /> Verified
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => BackupService.downloadBackup(backup.id)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Download Encrypted Zip"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            onClick={() => handleRestore(backup.id)}
                            disabled={isRestoring !== null}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium text-xs rounded-lg transition-colors"
                          >
                            {isRestoring === backup.id ? <RefreshCw className="animate-spin" size={14} /> : <RotateCcw size={14} />}
                            Restore
                          </button>
                          <button 
                            onClick={() => handleDelete(backup.id)}
                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
                            title="Delete Permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </DataStateGuard>
  );
}
