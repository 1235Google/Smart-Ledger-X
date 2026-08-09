import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Lock, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'confirm' | 'auth' | 'type-delete' | 'deleting' | 'success' | 'error';

const LOADING_MESSAGES = [
  'Deleting transactions...',
  'Deleting reminders...',
  'Deleting reports...',
  'Deleting analytics...',
  'Clearing local storage...',
  'Almost done...'
];

export default function ResetDataModal({ isOpen, onClose }: ResetDataModalProps) {
  const { securitySettings, resetData } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('confirm');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setPinInput('');
      setPinError(false);
      setDeleteInput('');
      setLoadingMessageIndex(0);
      setIsDeleting(false);
      setErrorMessage(null);
      setToastMessage(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isDeleting) return; // Prevent closing while delete in progress
    onClose();
  };

  const handleContinueFromConfirm = () => {
    if (isDeleting) return;
    if (securitySettings?.pinEnabled && securitySettings?.pin) {
      setStep('auth');
    } else {
      setStep('type-delete');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDeleting) return;
    if (pinInput === securitySettings.pin) {
      setPinError(false);
      setStep('type-delete');
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // Helper function to clear Firestore collections safely with batching and permission handling
  const clearFirestoreCollections = async () => {
    try {
      const win = window as any;
      let db = win.db || win.firestore;
      if (!db && win.firebase && typeof win.firebase.firestore === 'function') {
        try {
          db = win.firebase.firestore();
        } catch (e) {
          console.log("[DeleteAllData] Firebase instance fetch log:", e);
        }
      }

      if (!db) {
        console.log("[DeleteAllData] No active Firestore database found on window context.");
        return;
      }

      const collections = [
        'customers',
        'pending_payments',
        'received_payments',
        'sent_payments',
        'transactions',
        'analytics',
        'monthly_reports',
        'goals',
        'savings',
        'timeline_replay',
        'notifications',
        'reminder_history',
        'ai_insight_cache',
        'user_preferences',
        'poster_templates',
        'gullak_entries',
        'email_history',
        'user_profile'
      ];

      for (const colName of collections) {
        try {
          let snapshot: any = null;
          if (typeof db.collection === 'function') {
            snapshot = await db.collection(colName).get();
          } else if (win.getDocs && win.collection) {
            snapshot = await win.getDocs(win.collection(db, colName));
          }

          if (!snapshot || snapshot.empty) continue;

          const docs = snapshot.docs || snapshot.documents || [];
          let batch = typeof db.batch === 'function' ? db.batch() : null;
          let count = 0;

          for (const doc of docs) {
            if (batch) {
              batch.delete(doc.ref);
              count++;
              if (count >= 450) { // Firestore 500 limit batch
                await batch.commit();
                batch = db.batch();
                count = 0;
              }
            } else if (doc.ref && typeof doc.ref.delete === 'function') {
              await doc.ref.delete();
            } else if (win.deleteDoc) {
              await win.deleteDoc(doc.ref);
            }
          }

          if (batch && count > 0) {
            await batch.commit();
          }
        } catch (colErr: any) {
          console.error(`[DeleteAllData] Error deleting collection ${colName}:`, colErr);
          if (colErr?.code === 'permission-denied' || colErr?.message?.toLowerCase().includes('permission')) {
            throw new Error(`Firestore permissions blocked deletion on collection '${colName}'. Cause: ${colErr.message}`);
          } else {
            throw new Error(`Failed to delete collection '${colName}': ${colErr?.message || colErr}`);
          }
        }
      }
    } catch (err: any) {
      console.error("[DeleteAllData] Firestore deletion error:", err);
      throw err;
    }
  };

  // Helper function to delete IndexedDB
  const clearIndexedDB = async () => {
    try {
      if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            await new Promise<void>((resolve) => {
              const req = window.indexedDB.deleteDatabase(db.name!);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            });
          }
        }
      }
    } catch (e) {
      console.error("[DeleteAllData] IndexedDB error:", e);
    }
  };

  // Helper function to clear Cache API
  const clearCacheStorage = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    } catch (e) {
      console.error("[DeleteAllData] Cache Storage error:", e);
    }
  };

  // Helper function to clear Local and Session storage
  const clearLocalAndSessionStorage = async () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error("[DeleteAllData] LocalStorage error:", e);
    }

    try {
      const adminAuth = sessionStorage.getItem('smartledger-admin-auth');
      sessionStorage.clear();
      if (adminAuth) {
        sessionStorage.setItem('smartledger-admin-auth', adminAuth);
      }
    } catch (e) {
      console.error("[DeleteAllData] SessionStorage error:", e);
    }
  };

  const handleStartDelete = async () => {
    if (isDeleting) return; // Prevent double clicks
    setIsDeleting(true);
    setErrorMessage(null);
    setStep('deleting');

    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessageIndex(msgIndex);
    }, 600);

    try {
      // 1. Delete Firestore collections if active
      await clearFirestoreCollections();

      // 2. Clear IndexedDB cache
      await clearIndexedDB();

      // 3. Clear Cache API (AI insight cache)
      await clearCacheStorage();

      // 4. Clear Local & Session Storage
      await clearLocalAndSessionStorage();

      // 5. Reset StoreContext state (resets transactions, customers, balance, analytics, reminders)
      await resetData();

      clearInterval(interval);
      setIsDeleting(false);
      setStep('success');
      setToastMessage("All Smart Ledger data has been deleted successfully.");
    } catch (err: any) {
      clearInterval(interval);
      setIsDeleting(false);
      console.error("[DeleteAllData] Delete operation failed:", err);
      const msg = err?.message || "An error occurred while deleting application records.";
      setErrorMessage(msg);
      setStep('error');
    }
  };

  if (!isOpen) return null;

  const isDeleteEnabled = deleteInput.trim().toUpperCase() === 'DELETE';

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500/90 text-white px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 font-semibold text-sm border border-emerald-400/30"
          >
            <CheckCircle className="w-5 h-5 text-white" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isDeleting && (step === 'confirm' || step === 'auth' || step === 'type-delete') ? handleClose : undefined}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Confirm */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
                  <motion.div animate={{ scale: [1, 1.2, 1], color: ["#ef4444", "#dc2626", "#ef4444"] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </motion.div>
                </div>
                <h2 className="text-2xl font-bold text-white text-center mb-4">
                  Reset All SmartLedger Data
                </h2>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  This action will permanently delete all your financial records including:
                </p>
                <ul className="text-slate-400 text-sm mb-8 space-y-2 pl-4 list-disc marker:text-red-500">
                  <li>Current Balance</li>
                  <li>Transactions</li>
                  <li>Income Records</li>
                  <li>Expense Records</li>
                  <li>Pending Payments</li>
                  <li>Analytics</li>
                  <li>AI Chat History</li>
                  <li>Reminder History</li>
                  <li>Monthly Reports</li>
                  <li>Vault Data</li>
                  <li>Imported Files</li>
                  <li>Local Cache</li>
                  <li>User Settings</li>
                </ul>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
                  <p className="text-red-400 text-sm font-medium text-center flex items-center justify-center gap-2">
                    <AlertTriangle size={16} />
                    This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleClose}
                    disabled={isDeleting}
                    className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContinueFromConfirm}
                    disabled={isDeleting}
                    className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Auth */}
            {step === 'auth' && (
              <motion.div
                key="auth"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 mx-auto">
                  <Lock className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Authentication Required
                </h2>
                <p className="text-slate-400 text-sm mb-8">
                  Please verify your identity using your App PIN to continue with the deletion.
                </p>
                
                <form onSubmit={handlePinSubmit}>
                  <input
                    type="password"
                    maxLength={6}
                    value={pinInput}
                    disabled={isDeleting}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError(false);
                    }}
                    className="w-full text-center text-3xl tracking-[0.5em] font-mono bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500/50 mb-4 disabled:opacity-50"
                    placeholder="••••••"
                    autoFocus
                  />
                  <AnimatePresence>
                    {pinError && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-red-400 text-sm mb-4"
                      >
                        Authentication failed. Please verify your identity and try again.
                      </motion.p>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isDeleting}
                      className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={pinInput.length < 4 || isDeleting}
                      className="flex-1 py-3 px-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3: Type DELETE */}
            {step === 'type-delete' && (
              <motion.div
                key="type-delete"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white text-center mb-4">
                  Final Confirmation
                </h2>
                <p className="text-slate-400 text-sm mb-6 text-center">
                  To confirm deletion, please type <strong className="text-white">DELETE</strong> below.
                </p>
                
                <input
                  type="text"
                  value={deleteInput}
                  disabled={isDeleting}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  className="w-full text-center text-xl tracking-widest font-bold bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-red-500/50 mb-8 uppercase placeholder:text-white/20 disabled:opacity-50"
                  placeholder="DELETE"
                  autoFocus
                />

                <div className="flex gap-4">
                  <button
                    onClick={handleClose}
                    disabled={isDeleting}
                    className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartDelete}
                    disabled={!isDeleteEnabled || isDeleting}
                    className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Delete All Data'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Deleting Loading Screen */}
            {step === 'deleting' && (
              <motion.div
                key="deleting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-12 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-8 relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full rounded-full border-4 border-white/10 border-t-red-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Trash2 className="w-8 h-8 text-red-400 opacity-50" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Resetting Account</h2>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingMessageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-slate-400 text-sm"
                  >
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
            )}

            {/* STEP 5: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-white mb-4">
                  Reset Complete
                </h2>
                <p className="text-slate-400 text-sm mb-8">
                  All Smart Ledger data has been deleted successfully.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleClose();
                      navigate('/');
                    }}
                    className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = '/'; 
                    }}
                    className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: Error Screen */}
            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-8 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Deletion Failed
                </h2>
                <p className="text-red-400 text-xs mb-6 leading-relaxed bg-red-500/10 border border-red-500/20 rounded-xl p-4 font-mono text-left overflow-auto max-h-36">
                  {errorMessage || "An unknown error occurred while deleting data."}
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleStartDelete}
                    className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
