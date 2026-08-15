import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, PendingMoney, ReceivedMoney, SentMoney, Transaction, SecuritySettings, EmailSettings, EmailHistoryLog, GeneralSettings, GullakEntry, GullakSettings, UnlockedAchievement, AiRecognitionSettings, AiRecognitionHistory, PosterTemplate, Customer, ReportSettings, GeneratedReport, UserProfile, ReminderHistoryLog, SavingsGoal, SecurityLog, AutomationRule, Investment, FinanceHabit } from '../types';
import CryptoJS from 'crypto-js';
import { calculateProgress, ACHIEVEMENTS } from '../lib/achievements';
import { DEFAULT_REMINDER_TEMPLATE } from '../lib/utils';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { subscribeToState, queueStateSync, migrateLocalDataToCloud, syncUserProfile } from "../lib/cloudSync";
import { createNotification } from '../lib/notificationService';

const SECRET_KEY = 'smart-ledger-secure-key-2026';

export function calculateNextDate(dateStr: string, frequency: string): string {
  if (frequency === 'once') return dateStr;
  const d = new Date(dateStr || new Date().toISOString().split('T')[0]);
  if (frequency === '3days') d.setDate(d.getDate() + 3);
  else if (frequency === '7days') d.setDate(d.getDate() + 7);
  else if (frequency === '15days') d.setDate(d.getDate() + 15);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

interface StoreContextType extends AppState {
  setStartingBalance: (amount: number) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Omit<Customer, 'id' | 'createdAt'>>) => void;
  deleteCustomer: (id: string) => void;
  addReceivedMoney: (entry: Omit<ReceivedMoney, 'id' | 'type'>) => void;
  addSentMoney: (entry: Omit<SentMoney, 'id' | 'type'>) => void;
  addPendingMoney: (entry: Omit<PendingMoney, 'id' | 'type' | 'status' | 'nextReminderDate' | 'reminderStatus'>) => void;
  markAsReceived: (id: string) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, updated: Partial<Transaction>) => void;
  toggleReminderStatus: (id: string) => void;
  updateReminderFrequency: (id: string, frequency: PendingMoney['reminderFrequency']) => void;
  advanceReminderDate: (id: string) => void;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  updateEmailSettings: (settings: Partial<EmailSettings>) => void;
  updateReportSettings: (settings: Partial<ReportSettings>) => void;
  updateGeneralSettings: (settings: Partial<GeneralSettings>) => void;
  updateAiRecognitionSettings: (settings: Partial<AiRecognitionSettings>) => void;
  addAiRecognitionHistory: (history: Omit<AiRecognitionHistory, 'id'>) => void;
  addPosterTemplate: (template: Omit<PosterTemplate, 'id'>) => void;
  updatePosterTemplate: (id: string, template: Partial<Omit<PosterTemplate, 'id'>>) => void;
  deletePosterTemplate: (id: string) => void;
  setDefaultPosterTemplate: (id: string) => void;
  addEmailHistoryLog: (log: Omit<EmailHistoryLog, 'id'>) => void;
  deleteEmailHistoryLog: (id: string) => void;
  addReminderHistoryLog: (log: Omit<ReminderHistoryLog, 'id'>) => void;
  updateCustomReminderTemplate: (template: string) => void;
  addGeneratedReport: (report: Omit<GeneratedReport, 'id'>) => void;
  deleteGeneratedReport: (id: string) => void;
  addGullakEntry: (entry: Omit<GullakEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGullakEntry: (id: string, entry: Partial<Omit<GullakEntry, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteGullakEntry: (id: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  updateSavingsGoal: (id: string, goal: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>) => void;
  deleteSavingsGoal: (id: string) => void;
  addSecurityLog: (log: Omit<SecurityLog, 'id'>) => void;
  addAutomationRule: (rule: Omit<AutomationRule, 'id'>) => void;
  updateAutomationRule: (id: string, rule: Partial<Omit<AutomationRule, 'id'>>) => void;
  deleteAutomationRule: (id: string) => void;
  addInvestment: (investment: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, investment: Partial<Omit<Investment, 'id'>>) => void;
  deleteInvestment: (id: string) => void;
  updateFinanceHabit: (habit: FinanceHabit) => void;
  updateGullakSettings: (settings: Partial<GullakSettings>) => void;
  resetData: () => void;
  importData: (data: AppState) => void;
  currentBalance: number;
  totalReceived: number;
  totalSent: number;
  totalPending: number;
  isLoading: boolean;
  newlyUnlocked: UnlockedAchievement | null;
  clearNewlyUnlocked: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  isAdminAuthenticated: boolean;
  adminLogin: (pass: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => void;
  updateAdminPassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  isLocked: boolean;
  unlockApp: (pin: string) => boolean;
  lockApp: () => void;
  loginWithPin: (pin: string) => boolean;
  currentUser: User | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

export const defaultState: AppState = {
  isSetupComplete: true,
  startingBalance: 0,
  customers: [],
  transactions: [],
  gullakEntries: [],
  savingsGoals: [],
  securityLogs: [],
  automationRules: [],
  investments: [],
  financeHabits: [],
  gullakSettings: {
    monthlyGoal: 0,
  },
  securitySettings: {
    pinEnabled: false,
    pin: null,
    biometricEnabled: false,
    faceUnlockEnabled: false,
    autoLockTime: 2,
    registeredDevices: [],
  },
  emailSettings: {
    enabled: false,
    emailAddress: '',
    lastReportSent: null,
    nextScheduledReport: null,
  },
  emailHistory: [],
  generalSettings: {
    timezone: 'Asia/Kolkata',
  },
  aiRecognitionSettings: {
    enabled: false,
    frequency: 'manual',
    enablePhoto: true,
    enableAiMessage: true,
    whatsappDelivery: 'download_only',
    theme: 'luxury_gold',
    orientation: 'portrait'
  },
  aiRecognitionHistory: [],
  posterTemplates: [],
  unlockedAchievements: [],
  generatedReports: [],
  userProfile: {
    fullName: '',
    username: '',
    email: '',
    mobile: '',
    dob: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    language: 'English (IN)',
    memberSince: new Date().toISOString().split('T')[0],
    profilePhoto: '',
    businessName: '',
    businessCategory: '',
    gstNumber: '',
    upiId: '',
    businessAddress: '',
    website: '',
    businessLogo: '',
    verifiedEmail: false,
    verifiedPhone: false,
    lastLogin: '',
    activeDevice: ''
  },
  reminderHistory: [],
  customReminderTemplate: DEFAULT_REMINDER_TEMPLATE
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);


export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<UnlockedAchievement | null>(null);
  const [isLocked, setIsLocked] = useState(false); // Initialized later based on settings
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('smartledger_authenticated') === 'true';
    } catch {
      return false;
    }
  });
  const prevStateRef = React.useRef<AppState>(defaultState);
  const isRemoteUpdateRef = React.useRef<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 10-second timeout safeguard to ensure loading screen never hangs indefinitely
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) {
          console.warn('[StoreContext] 10s timeout safeguard triggered: Clearing loading screen to prevent hang.');
          setIsDataLoaded(true);
          return false;
        }
        return false;
      });
    }, 10000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    console.log('[Auth] Attaching onAuthStateChanged listener');
    let unsubscribeFirestore: (() => void) | undefined;
    let isSubscribed = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[Auth State Changed] Current user:', user ? `${user.uid} (${user.email})` : 'None (Signed Out)');
      if (!isSubscribed) return;

      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = undefined;
      }
      
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        try {
          localStorage.setItem('smartledger_authenticated', 'true');
        } catch (e) {}
        setIsLoading(true);

        try {
          // Non-blocking background migration & profile sync with timeout safety
          Promise.allSettled([
            migrateLocalDataToCloud(user.uid, defaultState),
            syncUserProfile(user, {
              fullName: user.displayName || undefined,
              email: user.email || undefined,
              profilePhoto: user.photoURL || undefined,
            })
          ]).then(() => {
            console.log('[Auth] User profile and initial migration sync completed');
          }).catch((err) => {
            console.warn('[Auth] Background sync warning:', err);
          });
        } catch (e) {
          console.warn('[Auth] Sync initiation exception:', e);
        }

        try {
          unsubscribeFirestore = subscribeToState(
            user.uid, 
            (newState) => {
              console.log('[StoreContext] Firestore state dispatched to StoreContext');
              if (!isSubscribed) return;
              isRemoteUpdateRef.current = true;
              setState((prev) => {
                const base = { ...defaultState, ...prev, ...newState };
                const updatedProfile = {
                  ...base.userProfile,
                  email: user.email || newState.userProfile?.email || prev.userProfile?.email || '',
                  fullName: newState.userProfile?.fullName || user.displayName || prev.userProfile?.fullName || '',
                  profilePhoto: newState.userProfile?.profilePhoto || user.photoURL || prev.userProfile?.profilePhoto || '',
                };
                const merged: AppState = { ...base, userProfile: updatedProfile };
                prevStateRef.current = merged;
                return merged;
              });
              setIsDataLoaded(true);
              setIsLoading(false);
            },
            (err) => {
              console.error('[StoreContext] Firestore error callback received:', err);
              if (!isSubscribed) return;
              setIsDataLoaded(true);
              setIsLoading(false);
            }
          );
        } catch (err) {
          console.error('[StoreContext] Failed to subscribe to Firestore:', err);
          if (isSubscribed) {
            setIsDataLoaded(true);
            setIsLoading(false);
          }
        }
      } else {
        setCurrentUser(null);
        const isLocallyAuth = localStorage.getItem('smartledger_authenticated') === 'true';
        setIsAuthenticated(isLocallyAuth);
        
        // Load from local if not authenticated
        try {
          const saved = localStorage.getItem('smart-ledger-data');
          if (saved) {
            const parsed = JSON.parse(saved);
            setState(parsed);
            prevStateRef.current = parsed;
          }
        } catch (e) {}

        setIsDataLoaded(true);
        setIsLoading(false);
      }
    }, (authError) => {
      console.error('[Auth State Error]', authError);
      if (isSubscribed) {
        setIsLoading(false);
        setIsDataLoaded(true);
      }
    });

    return () => {
      console.log('[Auth] Cleaning up onAuthStateChanged and Firestore subscriptions');
      isSubscribed = false;
      unsubscribe();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      if (isRemoteUpdateRef.current) {
        // Prevent echo cycle from remote Firestore update
        isRemoteUpdateRef.current = false;
      } else if (isAuthenticated && currentUser) {
        queueStateSync(currentUser.uid, state);
      } else {
        try {
          localStorage.setItem('smart-ledger-data', JSON.stringify(state));
        } catch (e) {}
      }
      prevStateRef.current = state;
    }
  }, [state, isAuthenticated, currentUser, isDataLoaded]);

  const loginWithPin = (pin: string): boolean => {
    if (!pin || pin.length !== 4) return false;
    const hashedPin = CryptoJS.SHA256(pin).toString();
    const configuredPin = state.securitySettings.pin;
    
    const isCorrect = configuredPin ? (configuredPin === hashedPin || configuredPin === pin) : true;
    if (isCorrect) {
      setIsAuthenticated(true);
      setIsLocked(false);
      try {
        localStorage.setItem('smartledger_authenticated', 'true');
      } catch (e) {}
      createNotification({
        title: 'Account Unlocked',
        message: 'Successfully authenticated session with SmartLedger',
        type: 'auth_google_login'
      });
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed", err);
    }
    createNotification({
      title: 'Google Account Logged Out',
      message: 'Logged out of SmartLedger',
      type: 'auth_google_logout'
    });
    try {
      localStorage.removeItem('smartledger_authenticated');
      localStorage.removeItem('smart-ledger-data');
    } catch (e) {}
    setState(defaultState);
    prevStateRef.current = defaultState;
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('smartledger-admin-auth') === 'true';
  });

  useEffect(() => {
    if (isInitialized && state.securitySettings.pinEnabled) {
      setIsLocked(true);
    }
  }, [isInitialized, state.securitySettings.pinEnabled]);

  const unlockApp = (pin: string) => {
    if (!pin || pin.length !== 4) return false;
    const hashedPin = CryptoJS.SHA256(pin).toString();
    const configuredPin = state.securitySettings.pin;
    
    if (configuredPin) {
      if (configuredPin === hashedPin || configuredPin === pin) {
        setIsLocked(false);
        return true;
      }
      return false;
    } else {
      setIsLocked(false);
      return true;
    }
  };

  const lockApp = () => {
    if (state.securitySettings.pinEnabled) {
      setIsLocked(true);
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem('smartledger-admin-session');
    if (token) {
      fetch('/api/admin/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.valid) {
          setIsAdminAuthenticated(false);
          sessionStorage.removeItem('smartledger-admin-auth');
          sessionStorage.removeItem('smartledger-admin-session');
        }
      })
      .catch(() => {});
    }
  }, []);

  const adminLogin = async (pass: string, email?: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass, email })
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setIsAdminAuthenticated(true);
          if (data.token) {
            sessionStorage.setItem('smartledger-admin-session', data.token);
          }
          sessionStorage.setItem('smartledger-admin-auth', 'true');
          return { success: true };
        } else {
          return { success: false, error: data.error || 'Invalid Admin Password' };
        }
      }
    } catch (err: any) {
      console.warn("[AdminAuth] Server API login unhandled/offline, falling back to client verification:", err);
    }

    // Client-side local authentication fallback if server API is unreachable
    const storedPass = localStorage.getItem('smartledger_admin_password') || 'admin123';
    if (pass === storedPass) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('smartledger-admin-auth', 'true');
      return { success: true };
    } else {
      return { success: false, error: 'Invalid Admin Password' };
    }
  };

  const updateAdminPassword = async (currentPass: string, newPass: string) => {
    let apiSuccess = false;
    let apiError = '';

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          apiSuccess = true;
        } else {
          apiError = data.error || 'Failed to update password.';
          return { success: false, error: apiError };
        }
      }
    } catch (err: any) {
      console.warn("[AdminAuth] Server password change offline/unhandled:", err);
    }

    // Keep local fallback storage synchronized
    const storedPass = localStorage.getItem('smartledger_admin_password') || 'admin123';
    if (currentPass !== storedPass && !apiSuccess) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    localStorage.setItem('smartledger_admin_password', newPass);
    return { success: true };
  };

  const adminLogout = () => {
    const token = sessionStorage.getItem('smartledger-admin-session');
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }).catch(() => {});
    }
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('smartledger-admin-auth');
    sessionStorage.removeItem('smartledger-admin-session');
  };

  const clearNewlyUnlocked = () => setNewlyUnlocked(null);


  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    const progress = calculateProgress(state.gullakEntries || [], state.gullakSettings);
    let newlyUnlockedLocal: UnlockedAchievement | null = null;
    const currentUnlocked = state.unlockedAchievements || [];
    let hasNew = false;
    const newUnlocked = [...currentUnlocked];

    for (const achievement of ACHIEVEMENTS) {
      if (progress[achievement.id] >= achievement.target && !currentUnlocked.some(u => u.id === achievement.id)) {
        const un: UnlockedAchievement = {
          id: achievement.id,
          unlockedAt: new Date().toISOString(),
          xpEarned: achievement.xpReward
        };
        newUnlocked.push(un);
        newlyUnlockedLocal = un; // Capture the last unlocked if multiple
        hasNew = true;
      }
    }

    if (hasNew) {
      setState(prev => ({ ...prev, unlockedAchievements: newUnlocked }));
      setNewlyUnlocked(newlyUnlockedLocal);
    }
  }, [state.gullakEntries, state.gullakSettings, isInitialized]);

  const updateSecuritySettings = (settings: Partial<SecuritySettings>) => {
    setState(prev => ({
      ...prev,
      securitySettings: { ...prev.securitySettings, ...settings }
    }));
    if (settings.pin !== undefined) {
      createNotification({
        title: 'PIN Changed Successfully',
        message: 'Security PIN has been updated',
        type: 'auth_pin_changed'
      });
    } else {
      createNotification({
        title: 'Security Settings Updated',
        message: 'Security settings updated',
        type: 'security_settings_updated'
      });
    }
  };

  const updateEmailSettings = (settings: Partial<EmailSettings>) => {
    setState(prev => ({
      ...prev,
      emailSettings: { ...prev.emailSettings, ...settings }
    }));
  };

  const updateReportSettings = (settings: Partial<ReportSettings>) => {
    setState(prev => ({
      ...prev,
      reportSettings: { ...prev.reportSettings, ...settings } as ReportSettings
    }));
  };

  const updateGeneralSettings = (settings: Partial<GeneralSettings>) => {
    setState(prev => ({
      ...prev,
      generalSettings: { ...prev.generalSettings, ...settings }
    }));
  };

  const updateAiRecognitionSettings = (settings: Partial<AiRecognitionSettings>) => {
    setState(prev => ({
      ...prev,
      aiRecognitionSettings: prev.aiRecognitionSettings 
        ? { ...prev.aiRecognitionSettings, ...settings }
        : { ...defaultState.aiRecognitionSettings!, ...settings }
    }));
  };

  const addAiRecognitionHistory = (history: Omit<AiRecognitionHistory, 'id'>) => {
    const newHistory: AiRecognitionHistory = {
      ...history,
      id: crypto.randomUUID(),
    };
    setState(prev => ({ 
      ...prev, 
      aiRecognitionHistory: [newHistory, ...(prev.aiRecognitionHistory || [])] 
    }));
  };

  const addPosterTemplate = (template: Omit<PosterTemplate, 'id'>) => {
    const newTemplate: PosterTemplate = {
      ...template,
      id: crypto.randomUUID(),
    };
    setState(prev => ({
      ...prev,
      posterTemplates: [...(prev.posterTemplates || []), newTemplate]
    }));
  };

  const updatePosterTemplate = (id: string, template: Partial<Omit<PosterTemplate, 'id'>>) => {
    setState(prev => ({
      ...prev,
      posterTemplates: (prev.posterTemplates || []).map(t => t.id === id ? { ...t, ...template } : t)
    }));
  };

  const deletePosterTemplate = (id: string) => {
    setState(prev => ({
      ...prev,
      posterTemplates: (prev.posterTemplates || []).filter(t => t.id !== id)
    }));
  };

  const setDefaultPosterTemplate = (id: string) => {
    setState(prev => ({
      ...prev,
      posterTemplates: (prev.posterTemplates || []).map(t => ({
        ...t,
        isDefault: t.id === id
      }))
    }));
  };

  const addEmailHistoryLog = (log: Omit<EmailHistoryLog, 'id'>) => {
    const newLog: EmailHistoryLog = {
      ...log,
      id: crypto.randomUUID(),
    };
    setState(prev => ({ ...prev, emailHistory: [newLog, ...(prev.emailHistory || [])] }));
  };

  const deleteEmailHistoryLog = (id: string) => {
    setState(prev => ({
      ...prev,
      emailHistory: (prev.emailHistory || []).filter(log => log.id !== id)
    }));
  };

  const addGeneratedReport = (report: Omit<GeneratedReport, 'id'>) => {
    const newReport = { ...report, id: Date.now().toString() } as GeneratedReport;
    setState(prev => ({
      ...prev,
      generatedReports: [newReport, ...(prev.generatedReports || [])]
    }));
    createNotification({
      title: 'Monthly Report Generated',
      message: `Generated report for ${report.month || 'selected period'}`,
      type: 'report_generated',
      referenceId: newReport.id
    });
  };

  const deleteGeneratedReport = (id: string) => {
    setState(prev => ({
      ...prev,
      generatedReports: (prev.generatedReports || []).filter(report => report.id !== id)
    }));
  };

  const setStartingBalance = (amount: number) => {
    setState(prev => ({ ...prev, startingBalance: amount, isSetupComplete: true }));
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setState(prev => ({ ...prev, customers: [...(prev.customers || []), newCustomer] }));
  };

  const updateCustomer = (id: string, customer: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    setState(prev => ({
      ...prev,
      customers: (prev.customers || []).map(c => c.id === id ? { ...c, ...customer } : c)
    }));
  };

  const deleteCustomer = (id: string) => {
    setState(prev => ({
      ...prev,
      customers: (prev.customers || []).filter(c => c.id !== id)
    }));
  };

  const addReceivedMoney = (entry: Omit<ReceivedMoney, 'id' | 'type'>) => {
    const newTx: ReceivedMoney = {
      ...entry,
      id: crypto.randomUUID(),
      type: 'received',
    };
    setState(prev => ({ ...prev, transactions: [newTx, ...prev.transactions] }));
    createNotification({
      title: 'Income Added',
      message: `Received ₹${Number(entry.amount).toLocaleString()} from ${entry.personName}`,
      type: 'ledger_income_added',
      referenceId: newTx.id
    });
    createNotification({
      title: 'New Transaction Added',
      message: `Added income entry of ₹${Number(entry.amount).toLocaleString()}`,
      type: 'ledger_transaction_added',
      referenceId: newTx.id
    });
  };

  const addSentMoney = (entry: Omit<SentMoney, 'id' | 'type'>) => {
    const newTx: SentMoney = {
      ...entry,
      id: crypto.randomUUID(),
      type: 'sent',
    };
    setState(prev => ({ ...prev, transactions: [newTx, ...prev.transactions] }));
    createNotification({
      title: 'Expense Added',
      message: `Sent ₹${Number(entry.amount).toLocaleString()} to ${entry.personName}`,
      type: 'ledger_expense_added',
      referenceId: newTx.id
    });
    createNotification({
      title: 'New Transaction Added',
      message: `Added expense entry of ₹${Number(entry.amount).toLocaleString()}`,
      type: 'ledger_transaction_added',
      referenceId: newTx.id
    });
  };

  const addPendingMoney = (entry: Omit<PendingMoney, 'id' | 'type' | 'status' | 'nextReminderDate' | 'reminderStatus'>) => {
    const newTx: PendingMoney = {
      ...entry,
      id: crypto.randomUUID(),
      type: 'pending',
      status: 'pending',
      reminderStatus: 'active',
      nextReminderDate: entry.dueDate || new Date().toISOString().split('T')[0],
    };
    setState(prev => ({ ...prev, transactions: [newTx, ...prev.transactions] }));
    createNotification({
      title: 'Pending Payment Created',
      message: `Pending payment of ₹${Number(entry.amount).toLocaleString()} created for ${entry.personName}`,
      type: 'pending_created',
      referenceId: newTx.id
    });
  };

  const toggleReminderStatus = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => {
        if (t.id === id && t.type === 'pending') {
          return { ...t, reminderStatus: t.reminderStatus === 'active' ? 'paused' : 'active' };
        }
        return t;
      })
    }));
  };

  const updateReminderFrequency = (id: string, frequency: PendingMoney['reminderFrequency']) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => {
        if (t.id === id && t.type === 'pending') {
          return { ...t, reminderFrequency: frequency };
        }
        return t;
      })
    }));
  };

  const advanceReminderDate = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => {
        if (t.id === id && t.type === 'pending') {
          return { ...t, nextReminderDate: calculateNextDate(t.nextReminderDate, t.reminderFrequency) };
        }
        return t;
      })
    }));
  };

  const markAsReceived = (id: string) => {
    let targetTx: PendingMoney | undefined;
    setState(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx || tx.type !== 'pending') return prev;
      targetTx = tx;

      const updatedTx: PendingMoney = { ...tx, status: 'completed' };
      
      const newReceived: ReceivedMoney = {
        id: crypto.randomUUID(),
        type: 'received',
        personName: tx.personName,
        amount: tx.amount,
        date: new Date().toISOString().split('T')[0],
        purpose: `Settled: ${tx.reason}`,
      };

      return {
        ...prev,
        transactions: [
          newReceived,
          ...prev.transactions.map(t => t.id === id ? updatedTx : t)
        ]
      };
    });
    if (targetTx) {
      createNotification({
        title: 'Pending Payment Marked as Paid',
        message: `Payment of ₹${Number(targetTx.amount).toLocaleString()} from ${targetTx.personName} marked as paid`,
        type: 'pending_paid',
        referenceId: id
      });
    }
  };

  const deleteTransaction = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
    createNotification({
      title: 'Transaction Deleted',
      message: 'Transaction removed from ledger',
      type: 'ledger_transaction_deleted',
      referenceId: id
    });
  };

  const updateTransaction = (id: string, updated: Partial<Transaction>) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, ...updated } as Transaction : t)
    }));
    createNotification({
      title: 'Transaction Edited',
      message: 'Transaction details updated in ledger',
      type: 'ledger_transaction_edited',
      referenceId: id
    });
  };

  const addGullakEntry = (entry: Omit<GullakEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry: GullakEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, gullakEntries: [newEntry, ...(prev.gullakEntries || [])] }));
  };

  const updateGullakEntry = (id: string, entry: Partial<Omit<GullakEntry, 'id' | 'createdAt' | 'updatedAt'>>) => {
    setState(prev => ({
      ...prev,
      gullakEntries: (prev.gullakEntries || []).map(e => e.id === id ? { ...e, ...entry, updatedAt: new Date().toISOString() } : e)
    }));
  };

  const deleteGullakEntry = (id: string) => {
    setState(prev => ({
      ...prev,
      gullakEntries: (prev.gullakEntries || []).filter(e => e.id !== id)
    }));
  };

  const addSavingsGoal = (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, savingsGoals: [...(prev.savingsGoals || []), newGoal] }));
  };

  const updateSavingsGoal = (id: string, goal: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>) => {
    setState(prev => ({
      ...prev,
      savingsGoals: (prev.savingsGoals || []).map(g => g.id === id ? { ...g, ...goal } : g)
    }));
  };

  const deleteSavingsGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      savingsGoals: (prev.savingsGoals || []).filter(g => g.id !== id)
    }));
  };

  const addSecurityLog = (log: Omit<SecurityLog, 'id'>) => {
    const newLog: SecurityLog = { ...log, id: crypto.randomUUID() };
    setState(prev => ({ ...prev, securityLogs: [newLog, ...(prev.securityLogs || [])] }));
  };

  const addAutomationRule = (rule: Omit<AutomationRule, 'id'>) => {
    const newRule: AutomationRule = { ...rule, id: crypto.randomUUID() };
    setState(prev => ({ ...prev, automationRules: [...(prev.automationRules || []), newRule] }));
  };

  const updateAutomationRule = (id: string, rule: Partial<Omit<AutomationRule, 'id'>>) => {
    setState(prev => ({
        ...prev,
        automationRules: (prev.automationRules || []).map(r => r.id === id ? { ...r, ...rule } : r)
    }));
  };

  const deleteAutomationRule = (id: string) => {
    setState(prev => ({ ...prev, automationRules: (prev.automationRules || []).filter(r => r.id !== id) }));
  };

  const addInvestment = (investment: Omit<Investment, 'id'>) => {
    const newInv: Investment = { ...investment, id: crypto.randomUUID() };
    setState(prev => ({ ...prev, investments: [...(prev.investments || []), newInv] }));
  };

  const updateInvestment = (id: string, investment: Partial<Omit<Investment, 'id'>>) => {
      setState(prev => ({
          ...prev,
          investments: (prev.investments || []).map(i => i.id === id ? { ...i, ...investment } : i)
      }));
  };

  const deleteInvestment = (id: string) => {
      setState(prev => ({ ...prev, investments: (prev.investments || []).filter(i => i.id !== id) }));
  };

  const updateFinanceHabit = (habit: FinanceHabit) => {
      setState(prev => ({
          ...prev,
          financeHabits: (prev.financeHabits || []).map(h => h.id === habit.id ? habit : h)
      }));
  };

  const updateGullakSettings = (settings: Partial<GullakSettings>) => {
    setState(prev => ({
      ...prev,
      gullakSettings: { ...(prev.gullakSettings || defaultState.gullakSettings), ...settings }
    }));
  };

  const addReminderHistoryLog = (log: Omit<ReminderHistoryLog, 'id'>) => {
    const newLog: ReminderHistoryLog = {
      ...log,
      id: crypto.randomUUID()
    };
    setState(prev => ({
      ...prev,
      reminderHistory: [newLog, ...(prev.reminderHistory || [])]
    }));
    createNotification({
      title: 'Reminder Sent Successfully',
      message: `Payment reminder sent to ${log.customerName || 'recipient'}`,
      type: 'pending_reminder_sent',
      referenceId: newLog.id
    });
  };

  const updateCustomReminderTemplate = (template: string) => {
    setState(prev => ({
      ...prev,
      customReminderTemplate: template
    }));
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setState(prev => ({
      ...prev,
      userProfile: { ...(prev.userProfile || defaultState.userProfile!), ...profile }
    }));
    createNotification({
      title: 'Profile Updated Successfully',
      message: 'Your profile information has been updated',
      type: 'auth_profile_updated'
    });
  };

  const resetData = () => {
    setState(defaultState);
    try {
      localStorage.removeItem('smart-ledger-data');
    } catch (e) {
      console.error("[StoreContext] Error clearing storage key:", e);
    }
  };

  const importData = (data: AppState) => {
    setState(data);
    createNotification({
      title: 'Import Completed',
      message: 'Ledger data imported successfully',
      type: 'report_import_completed'
    });
  };

  const receivedTransactions = state.transactions.filter((t): t is ReceivedMoney => t.type === 'received');
  const sentTransactions = state.transactions.filter((t): t is SentMoney => t.type === 'sent');
  const activePendingTransactions = state.transactions.filter((t): t is PendingMoney => t.type === 'pending' && t.status === 'pending');

  const totalReceived = receivedTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalSent = sentTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalPending = activePendingTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const currentBalance = Number(state.startingBalance) + totalReceived - totalSent;

  return (
    <StoreContext.Provider value={{
      ...state,
      setStartingBalance,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addReceivedMoney,
      addSentMoney,
      addPendingMoney,
      markAsReceived,
      deleteTransaction,
      updateTransaction,
      toggleReminderStatus,
      updateReminderFrequency,
      advanceReminderDate,
      updateSecuritySettings,
      updateEmailSettings,
      updateReportSettings,
      updateGeneralSettings,
      updateAiRecognitionSettings,
      addAiRecognitionHistory,
      addPosterTemplate,
      updatePosterTemplate,
      deletePosterTemplate,
      setDefaultPosterTemplate,
      addEmailHistoryLog,
      deleteEmailHistoryLog,
      addReminderHistoryLog,
      updateCustomReminderTemplate,
      addGeneratedReport,
      deleteGeneratedReport,
      addGullakEntry,
      updateGullakEntry,
      deleteGullakEntry,
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      updateGullakSettings,
      addSecurityLog,
      addAutomationRule,
      updateAutomationRule,
      deleteAutomationRule,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      updateFinanceHabit,
      updateUserProfile,
      resetData,
      importData,
      currentBalance,
      totalReceived,
      totalSent,
      totalPending,
      isLoading,
      newlyUnlocked,
      clearNewlyUnlocked,
      isAdminAuthenticated,
      adminLogin,
      adminLogout,
      updateAdminPassword,
      isLocked,
      unlockApp,
      lockApp,
      loginWithPin,
      currentUser,
      isAuthenticated,
      logout,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
