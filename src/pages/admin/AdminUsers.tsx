import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Trash2, 
  UserCheck, 
  UserX, 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Crown, 
  Key, 
  Sparkles,
  Info,
  Check,
  Activity,
  FileText,
  Smartphone,
  Calendar,
  Cloud,
  Database,
  AlertTriangle,
  Send,
  ChevronRight,
  Download,
  CreditCard,
  History,
  Lock,
  SmartphoneIcon,
  Bell,
  PlusCircle,
  FileCheck,
  Ban,
  Receipt
} from 'lucide-react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { 
  subscribeToAllAdmins, 
  addAdminUser, 
  updateAdminUserRole, 
  toggleAdminUserStatus, 
  removeAdminUser 
} from '../../lib/adminAuthService';
import { UserService, EnterpriseUser } from '../../lib/userService';
import { PaymentService, PaymentRecord } from '../../lib/paymentService';
import { AlertService } from '../../lib/alertService';
import { AdminUser, AdminRole, AdminStatus } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { M3DataTable, Column } from '../../components/admin/material3/M3DataTable';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3TextField } from '../../components/admin/material3/M3TextField';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';

export default function AdminUsers() {
  const navigate = useNavigate();
  const { adminUser: currentAdmin } = useStore();
  const { showSuccess, showError, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'users' | 'admins'>('users');

  // Enterprise Users State
  const [enterpriseUsers, setEnterpriseUsers] = useState<EnterpriseUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Real-time payments index
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  
  // Enterprise Filters
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [userVerifiedFilter, setUserVerifiedFilter] = useState<string>('all');
  const [userActivityFilter, setUserActivityFilter] = useState<string>('all');
  const [userPaymentFilter, setUserPaymentFilter] = useState<string>('all');

  // Selected User for Profile Side Panel Drawer
  const [selectedUser, setSelectedUser] = useState<EnterpriseUser | null>(null);
  const [drawerData, setDrawerData] = useState<{
    transactions: any[];
    loginHistory: any[];
    devices: any[];
    notifications: any[];
    backupConfig: any;
    payments: PaymentRecord[];
    isLoading: boolean;
  }>({
    transactions: [],
    loginHistory: [],
    devices: [],
    notifications: [],
    backupConfig: null,
    payments: [],
    isLoading: false
  });

  // Action states for drawer user
  const [isActionPending, setIsActionPending] = useState(false);
  const [showSendNotificationModal, setShowSendNotificationModal] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Payment Actions Modals State
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // default 14 days

  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [recordAmount, setRecordAmount] = useState('');
  const [recordMethod, setRecordMethod] = useState('UPI');
  const [recordNotes, setRecordNotes] = useState('');

  const [showUpdateDueDateModal, setShowUpdateDueDateModal] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');

  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);

  // Admins (Console RBAC) State
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isAdminsLoading, setIsAdminsLoading] = useState(true);
  const [adminRoleFilter, setAdminRoleFilter] = useState<string>('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('all');

  // Add Admin Modal State
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>('Admin');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');

  // Delete Admin State
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);

  // Subscribe to Enterprise Users
  useEffect(() => {
    setIsUsersLoading(true);
    const unsubscribe = UserService.subscribeToUsers((liveUsers) => {
      setEnterpriseUsers(liveUsers);
      setIsUsersLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to all payments index
  useEffect(() => {
    const unsubscribe = PaymentService.subscribeToPayments((paymentsList) => {
      setAllPayments(paymentsList);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Admins (RBAC list)
  useEffect(() => {
    setIsAdminsLoading(true);
    const unsubscribe = subscribeToAllAdmins((adminList) => {
      setAdmins(adminList);
      setIsAdminsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load selected user subcollections inside side-drawer
  useEffect(() => {
    if (!selectedUser) return;
    
    let isMounted = true;
    const loadDrawerDetails = async () => {
      setDrawerData(prev => ({ ...prev, isLoading: true }));
      try {
        const userId = selectedUser.uid;
        
        // Fetch real-time transactions
        const txSnap = await getDocs(collection(db, 'users', userId, 'transactions')).catch(() => null);
        const txList = txSnap ? txSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) : [];
        
        // Fetch real-time login history
        const logSnap = await getDocs(collection(db, 'users', userId, 'loginHistory')).catch(() => null);
        const logList = logSnap ? logSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) : [];
        logList.sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        
        // Fetch real-time devices
        const devSnap = await getDocs(collection(db, 'users', userId, 'devices')).catch(() => null);
        const devList = devSnap ? devSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) : [];
        
        // Fetch notifications
        const notifSnap = await getDocs(collection(db, 'users', userId, 'notifications')).catch(() => null);
        const notifList = notifSnap ? notifSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) : [];
        notifList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        // Fetch backups config
        const backupRef = doc(db, 'users', userId, 'backups_schedule', 'config');
        const backupSnap = await getDoc(backupRef).catch(() => null);
        const backupConfig = backupSnap && backupSnap.exists() ? backupSnap.data() : null;

        // Fetch payments for this user live
        const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', userId))).catch(() => null);
        const paymentsList = paymentsSnap ? paymentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PaymentRecord)) : [];
        paymentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (isMounted) {
          setDrawerData({
            transactions: txList,
            loginHistory: logList,
            devices: devList,
            notifications: notifList,
            backupConfig,
            payments: paymentsList,
            isLoading: false
          });
        }
      } catch (err) {
        console.error('[DrawerDetails] Error fetching nested subcollections:', err);
        if (isMounted) {
          setDrawerData(prev => ({ ...prev, isLoading: false }));
        }
      }
    };
    
    loadDrawerDetails();
    return () => { isMounted = false; };
  }, [selectedUser]);

  // Helper to trigger drawer payments refresh
  const reloadDrawerPayments = async (userId: string) => {
    try {
      const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', userId))).catch(() => null);
      const paymentsList = paymentsSnap ? paymentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PaymentRecord)) : [];
      paymentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDrawerData(prev => ({
        ...prev,
        payments: paymentsList
      }));
    } catch (e) {
      console.warn('[PaymentsReload] Error reloading drawer payments:', e);
    }
  };

  // Handle Enterprise user actions
  const handleToggleUserSuspension = async (user: EnterpriseUser) => {
    setIsActionPending(true);
    const nextStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
    try {
      // Dual-write status on profile subdoc and root doc for maximum compatibility
      const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
      await updateDoc(profileRef, { status: nextStatus });
      const rootRef = doc(db, 'users', user.uid);
      await updateDoc(rootRef, { status: nextStatus }).catch(() => {});

      // Auto Alert Generation
      await AlertService.createAlert({
        type: nextStatus === 'Suspended' ? 'User Suspended' : 'New User Registered',
        title: nextStatus === 'Suspended' ? 'User Suspended by Admin' : 'User Re-Activated',
        description: `User ${user.fullName} (${user.email}) status changed to ${nextStatus}.`,
        severity: nextStatus === 'Suspended' ? 'Warning' : 'Success',
        userId: user.uid,
        source: 'Admin Console'
      });

      showSuccess('Status Updated', `User ${user.fullName} has been set to ${nextStatus}.`);
      setSelectedUser(prev => prev ? { ...prev, status: nextStatus } : null);
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Failed to update user status.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleToggleUserDisable = async (user: EnterpriseUser) => {
    setIsActionPending(true);
    const nextStatus = user.status === 'Disabled' ? 'Active' : 'Disabled';
    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
      await updateDoc(profileRef, { status: nextStatus });
      const rootRef = doc(db, 'users', user.uid);
      await updateDoc(rootRef, { status: nextStatus }).catch(() => {});

      await AlertService.createAlert({
        type: nextStatus === 'Disabled' ? 'User Suspended' : 'New User Registered',
        title: nextStatus === 'Disabled' ? 'User Account Disabled' : 'User Account Enabled',
        description: `User ${user.fullName} account was toggled to ${nextStatus} by console admin.`,
        severity: nextStatus === 'Disabled' ? 'Warning' : 'Success',
        userId: user.uid,
        source: 'Admin Console'
      });

      showSuccess('Status Updated', `User account status updated to ${nextStatus}.`);
      setSelectedUser(prev => prev ? { ...prev, status: nextStatus } : null);
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Failed to toggle status.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleVerifyEmail = async (user: EnterpriseUser) => {
    setIsActionPending(true);
    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
      await updateDoc(profileRef, { emailVerified: true });
      const rootRef = doc(db, 'users', user.uid);
      await updateDoc(rootRef, { emailVerified: true }).catch(() => {});

      showSuccess('Email Verified', `Verification credentials updated for ${user.fullName}.`);
      setSelectedUser(prev => prev ? { ...prev, emailVerified: true } : null);
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Failed to verify email.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleChangeUserRole = async (user: EnterpriseUser, nextRole: 'User' | 'Admin' | 'Manager' | 'Owner') => {
    setIsActionPending(true);
    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
      await updateDoc(profileRef, { role: nextRole });
      const rootRef = doc(db, 'users', user.uid);
      await updateDoc(rootRef, { role: nextRole }).catch(() => {});

      showSuccess('Role Changed', `User assigned role ${nextRole}.`);
      setSelectedUser(prev => prev ? { ...prev, role: nextRole } : null);
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Failed to update role.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleForceLogout = async (user: EnterpriseUser) => {
    setIsActionPending(true);
    try {
      const devCol = collection(db, 'users', user.uid, 'devices');
      const devSnap = await getDocs(devCol);
      let deletedCount = 0;
      for (const d of devSnap.docs) {
        await deleteDoc(doc(db, 'users', user.uid, 'devices', d.id));
        deletedCount++;
      }

      await AlertService.createAlert({
        type: 'Authentication Error',
        title: 'Force Session Revocation',
        description: `Admin terminated ${deletedCount} active device sessions for ${user.fullName}.`,
        severity: 'Warning',
        userId: user.uid,
        source: 'Admin Console'
      });

      showSuccess('Sessions Revoked', `Successfully terminated ${deletedCount} active device logins.`);
      setDrawerData(prev => ({ ...prev, devices: [] }));
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Failed to terminate user sessions.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleResetUserBackup = async (user: EnterpriseUser) => {
    setIsActionPending(true);
    try {
      const backupRef = doc(db, 'users', user.uid, 'backups_schedule', 'config');
      await deleteDoc(backupRef);
      
      showSuccess('Backup Configuration Reset', 'Automatic backup parameters restored to default.');
      setDrawerData(prev => ({ ...prev, backupConfig: null }));
    } catch (err: any) {
      showError('Reset Failed', err?.message || 'Failed to reset backup settings.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !notifTitle.trim() || !notifMessage.trim()) return;
    setIsActionPending(true);
    try {
      const notifRef = doc(collection(db, 'users', selectedUser.uid, 'notifications'));
      const notifPayload = {
        id: notifRef.id,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: 'admin_alert',
        read: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(notifRef, notifPayload);

      showSuccess('Notification Dispatched', `In-app message delivered to ${selectedUser.fullName}.`);
      setDrawerData(prev => ({
        ...prev,
        notifications: [notifPayload, ...prev.notifications]
      }));
      setNotifTitle('');
      setNotifMessage('');
      setShowSendNotificationModal(false);
    } catch (err: any) {
      showError('Dispatch Failed', err?.message || 'Failed to create notification.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSendCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !emailSubject.trim() || !emailBody.trim()) return;
    setIsActionPending(true);
    try {
      const res = await fetch('/api/send-monthly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          currentBalance: drawerData.transactions.reduce((sum, t) => sum + (t.type === 'received' ? Number(t.amount) : -Number(t.amount)), 0),
          incomeThisMonth: drawerData.transactions.filter(t => t.type === 'received').reduce((sum, t) => sum + Number(t.amount), 0),
          highestPaymentReceived: drawerData.transactions.filter(t => t.type === 'received').reduce((mx, t) => Math.max(mx, Number(t.amount)), 0),
          numberOfIncomeTransactions: drawerData.transactions.filter(t => t.type === 'received').length,
          aiSummary: emailBody.trim()
        })
      });

      if (!res.ok) throw new Error('API server reported error during mail dispatch.');

      await AlertService.createAlert({
        type: 'Email Sent',
        title: 'Security Email Sent',
        description: `Custom report update email successfully dispatched to ${selectedUser.email}.`,
        severity: 'Success',
        userId: selectedUser.uid,
        source: 'Admin Console'
      });

      showSuccess('Email Sent', `Financial update successfully queued and delivered to ${selectedUser.email}.`);
      setEmailSubject('');
      setEmailBody('');
      setShowSendEmailModal(false);
    } catch (err: any) {
      await AlertService.createAlert({
        type: 'Email Failed',
        title: 'Admin Email Failed',
        description: `Failed to dispatch email to ${selectedUser.email}: ${err.message}`,
        severity: 'Critical',
        userId: selectedUser.uid,
        source: 'Admin Console'
      });
      showError('Email Failed', err?.message || 'Failed to deliver email through Resend API.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleGenerateReport = (user: EnterpriseUser) => {
    const ledger = drawerData.transactions;
    const balance = ledger.reduce((sum, t) => sum + (t.type === 'received' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)), 0);
    const received = ledger.filter(t => t.type === 'received').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const sent = ledger.filter(t => t.type === 'sent').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const reportText = `SMARTLEDGERX ENTERPRISE USER PROFILE REPORT
--------------------------------------------------
USER UID: ${user.uid}
FULL NAME: ${user.fullName}
EMAIL: ${user.email}
ROLE: ${user.role}
STATUS: ${user.status}
EMAIL VERIFIED: ${user.emailVerified ? 'Yes' : 'No'}
MEMBER SINCE: ${new Date(user.createdAt).toLocaleString()}

FINANCIAL SUMMARY
--------------------------------------------------
Net Account Balance: ₹${balance.toLocaleString('en-IN')}
Total Funds Received: ₹${received.toLocaleString('en-IN')}
Total Funds Transferred: ₹${sent.toLocaleString('en-IN')}
Transaction Record Count: ${ledger.length}

DEVICES & SESSIONS
--------------------------------------------------
Active Devices Enrolled: ${drawerData.devices.length}
${drawerData.devices.map((d, i) => `[Device #${i+1}] ${d.deviceName} (${d.os}) - IP: ${d.ip} - Last active: ${new Date(d.lastActive).toLocaleString()}`).join('\n')}

LOGIN HISTORY & TELEMETRY
--------------------------------------------------
${drawerData.loginHistory.slice(0, 5).map((h, i) => `[Session #${i+1}] ${new Date(h.timestamp).toLocaleString()} - Browser: ${h.browser} - Status: ${h.status || 'Success'}`).join('\n')}

--------------------------------------------------
Generated on: ${new Date().toLocaleString()} by authorized administrator: ${currentAdmin?.email}
`;

    const element = document.createElement("a");
    const file = new Blob([reportText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `user_profile_report_${user.uid}_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showSuccess('Report Exported', `Account log report compiled for user: ${user.fullName}.`);
  };

  const handleDeleteUser = async (user: EnterpriseUser) => {
    setIsActionPending(true);
    try {
      const res = await UserService.deleteUser(user.uid);
      if (res.success) {
        await AlertService.createAlert({
          type: 'User Deleted',
          title: 'User Profile Deleted',
          description: `User ${user.fullName} (${user.email}) cleanly purged from Firestore databases.`,
          severity: 'Critical',
          userId: user.uid,
          source: 'Admin Console'
        });

        showSuccess('User Purged', `Successfully deleted user ${user.fullName} and cleared all subcollections.`);
        setSelectedUser(null);
      } else {
        showError('Purge Failed', 'An error occurred during transaction removals.');
      }
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Purge process failed.');
    } finally {
      setIsActionPending(false);
    }
  };

  // Payment Actions submits
  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showError('Validation Error', 'Please enter a valid positive numerical amount.');
      return;
    }
    if (!paymentDueDate) {
      showError('Validation Error', 'Please specify a payment due date.');
      return;
    }

    setIsActionPending(true);
    try {
      const result = await PaymentService.createPayment({
        userId: selectedUser.uid,
        userName: selectedUser.fullName,
        userEmail: selectedUser.email,
        amount,
        dueDate: paymentDueDate,
        operator: currentAdmin?.email || 'admin@smartledgerx.io'
      });

      if (result.success) {
        showSuccess('Invoice Created', `Successfully generated payment ID ${result.paymentId} for ₹${amount.toLocaleString()}.`);
        setShowAddPaymentModal(false);
        setPaymentAmount('');
        reloadDrawerPayments(selectedUser.uid);
      }
    } catch (err: any) {
      showError('Creation Failed', err?.message || 'Failed to create payment.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    const paid = parseFloat(recordAmount);
    if (isNaN(paid) || paid <= 0) {
      showError('Validation Error', 'Please enter a valid amount.');
      return;
    }
    if (paid > selectedPayment.pendingAmount) {
      showError('Validation Error', `Amount paid (₹${paid}) cannot exceed pending outstanding amount (₹${selectedPayment.pendingAmount}).`);
      return;
    }

    setIsActionPending(true);
    try {
      await PaymentService.recordPayment(
        selectedPayment.paymentId,
        paid,
        recordMethod,
        recordNotes.trim(),
        currentAdmin?.email || 'admin@smartledgerx.io'
      );

      showSuccess('Payment Recorded', `Successfully recorded payment installment of ₹${paid.toLocaleString()}.`);
      setShowRecordPaymentModal(false);
      setRecordAmount('');
      setRecordNotes('');
      if (selectedUser) reloadDrawerPayments(selectedUser.uid);
    } catch (err: any) {
      showError('Recording Failed', err?.message || 'Failed to record installment.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleUpdateDueDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !newDueDate) return;

    setIsActionPending(true);
    try {
      await PaymentService.updateDueDate(
        selectedPayment.paymentId,
        newDueDate,
        currentAdmin?.email || 'admin@smartledgerx.io'
      );

      showSuccess('Due Date Rescheduled', `Payment due date shifted to ${newDueDate}.`);
      setShowUpdateDueDateModal(false);
      if (selectedUser) reloadDrawerPayments(selectedUser.uid);
    } catch (err: any) {
      showError('Update Failed', err?.message || 'Failed to update due date.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSendReminderAction = async (payment: PaymentRecord) => {
    setIsActionPending(true);
    try {
      await PaymentService.sendReminder(payment.paymentId, currentAdmin?.email || 'admin@smartledgerx.io');
      showSuccess('Reminder Dispatched', `Urgent payment notification dispatched to ${payment.userEmail}.`);
      if (selectedUser) reloadDrawerPayments(selectedUser.uid);
    } catch (err: any) {
      showError('Dispatch Failed', err?.message || 'Failed to send payment reminder.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleMarkPaidAction = async (payment: PaymentRecord) => {
    if (!window.confirm(`Are you sure you want to mark payment ID ${payment.paymentId} as fully paid? This will record ₹${payment.pendingAmount.toLocaleString()} as settled.`)) return;
    setIsActionPending(true);
    try {
      await PaymentService.markPaid(payment.paymentId, currentAdmin?.email || 'admin@smartledgerx.io');
      showSuccess('Settle Succeeded', `Invoice ${payment.paymentId} has been marked settled.`);
      if (selectedUser) reloadDrawerPayments(selectedUser.uid);
    } catch (err: any) {
      showError('Settle Failed', err?.message || 'Failed to mark fully paid.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleCancelPaymentAction = async (payment: PaymentRecord) => {
    if (!window.confirm(`Are you absolutely sure you want to void/cancel payment ID ${payment.paymentId}?`)) return;
    setIsActionPending(true);
    try {
      await PaymentService.cancelPayment(payment.paymentId, currentAdmin?.email || 'admin@smartledgerx.io');
      showSuccess('Invoice Cancelled', `Invoice ${payment.paymentId} has been cancelled.`);
      if (selectedUser) reloadDrawerPayments(selectedUser.uid);
    } catch (err: any) {
      showError('Cancellation Failed', err?.message || 'Failed to void invoice.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleGenerateInvoiceAction = (payment: PaymentRecord) => {
    const reportText = `SMARTLEDGERX ENTERPRISE PAYMENT INVOICE
==================================================
INVOICE ID: ${payment.paymentId}
CLIENT NAME: ${payment.userName}
CLIENT EMAIL: ${payment.userEmail}
CLIENT UID: ${payment.userId}
==================================================
INVOICED AMOUNT: ₹${payment.amount.toLocaleString('en-IN')}
SETTLED AMOUNT:  ₹${payment.paidAmount.toLocaleString('en-IN')}
PENDING AMOUNT:  ₹${payment.pendingAmount.toLocaleString('en-IN')}
PAYMENT DUE DATE: ${payment.dueDate}
INVOICE STATUS:   ${payment.status.toUpperCase()}
==================================================
TRANSACTION HISTORY
--------------------------------------------------
${(payment.history || []).map((h, i) => `[Action #${i+1}] ${new Date(h.timestamp).toLocaleString()}
   Event: ${h.action}
   Details: ${h.details}
   Operator: ${h.operator}`).join('\n\n')}

==================================================
DISPATCHED SECURELY FROM SMARTLEDGER DISPATCH ENGINE
SYSTEM CHECKSUM: sha256_b1f237c093a8d11c97a8e7d23a4
Generated on: ${new Date().toLocaleString()}
`;

    const element = document.createElement("a");
    const file = new Blob([reportText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `invoice_${payment.paymentId}_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showSuccess('Invoice Generated', `Invoice document compiled for ID: ${payment.paymentId}.`);
  };

  // Filter Enterprise Users list
  const filteredUsers = useMemo(() => {
    return enterpriseUsers.filter((user) => {
      // Search Box Query
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase().trim();
        const name = (user.fullName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const uid = (user.uid || '').toLowerCase();
        const phone = (user.phone || '').toLowerCase();
        const role = (user.role || '').toLowerCase();
        
        // Search by paymentId as well
        const matchPayment = allPayments.some(p => p.userId === user.uid && p.paymentId.toLowerCase().includes(q));

        if (!name.includes(q) && !email.includes(q) && !uid.includes(q) && !phone.includes(q) && !role.includes(q) && !matchPayment) {
          return false;
        }
      }

      // Role Filter
      if (userRoleFilter !== 'all' && user.role !== userRoleFilter) return false;

      // Status Filter
      if (userStatusFilter !== 'all' && user.status !== userStatusFilter) return false;

      // Email Verification Filter
      if (userVerifiedFilter === 'verified' && !user.emailVerified) return false;
      if (userVerifiedFilter === 'unverified' && user.emailVerified) return false;

      // Payment Status Filter
      if (userPaymentFilter !== 'all') {
        if (userPaymentFilter === 'pending' && !(user.pendingAmount && user.pendingAmount > 0)) return false;
        if (userPaymentFilter === 'paid' && !(user.paymentStatus === 'Paid' && user.totalPaid && user.totalPaid > 0)) return false;
        if (userPaymentFilter === 'overdue' && user.paymentStatus !== 'Overdue') return false;
        if (userPaymentFilter === 'partial' && user.paymentStatus !== 'Partial') return false;
      }

      // Activity / Recency Filters
      if (userActivityFilter !== 'all') {
        const timeDiff = Date.now() - new Date(user.createdAt).getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (userActivityFilter === 'recent' && timeDiff > sevenDays) return false;
        if (userActivityFilter === 'inactive' && user.transactionCount !== 0) return false;
      }

      return true;
    });
  }, [enterpriseUsers, allPayments, userSearchQuery, userRoleFilter, userStatusFilter, userVerifiedFilter, userActivityFilter, userPaymentFilter]);

  // Handle Admin permissions toggles
  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAdminError('');

    if (!currentAdmin) {
      setAddAdminError('Verification Error. You must be authenticated.');
      return;
    }

    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      setAddAdminError('Please enter a valid Google Account email address.');
      return;
    }

    setIsAddingAdmin(true);
    try {
      const res = await addAdminUser(
        newAdminEmail.trim().toLowerCase(),
        newAdminName.trim() || newAdminEmail.split('@')[0],
        newAdminRole,
        currentAdmin!
      );

      if (res.success) {
        showSuccess('Console Access Whitelisted', `Administrator credentials whitelisted for: ${newAdminEmail}.`);
        setNewAdminEmail('');
        setNewAdminName('');
        setNewAdminRole('Admin');
        setShowAddAdminModal(false);
      } else {
        setAddAdminError(res.error || 'Failed to register admin in Firestore lists.');
      }
    } catch (err: any) {
      setAddAdminError(err?.message || 'Write permissions denied by Firestore security rules.');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleAdminRoleChange = async (adminId: string, nextRole: AdminRole) => {
    try {
      const res = await updateAdminUserRole(adminId, nextRole, currentAdmin!);
      if (res.success) {
        showSuccess('Admin Privilege Switched', `Console role whitelisted to ${nextRole} successfully.`);
      } else {
        showError('Escalation Failed', res.error || 'Server error.');
      }
    } catch (err: any) {
      showError('Action Denied', 'Write privileges forbidden.');
    }
  };

  const handleAdminStatusToggle = async (admin: AdminUser) => {
    const nextStatus: AdminStatus = admin.status === 'Active' ? 'Disabled' : 'Active';
    try {
      const res = await toggleAdminUserStatus(admin.uid, nextStatus, currentAdmin!);
      if (res.success) {
        showSuccess('Access Toggled', `Admin security status shifted to ${nextStatus}.`);
      } else {
        showError('Action Failed', res.error || 'Server error.');
      }
    } catch (err: any) {
      showError('Action Denied', 'Write privileges forbidden.');
    }
  };

  const handleAdminDelete = async () => {
    if (!adminToDelete) return;
    setIsDeletingAdmin(true);
    try {
      const res = await removeAdminUser(adminToDelete.uid, currentAdmin!);
      if (res.success) {
        showSuccess('Console Privilege Revoked', `${adminToDelete.email} has been whited out of active console permissions.`);
        setAdminToDelete(null);
      } else {
        showError('Revocation Failed', res.error || 'Server error.');
      }
    } catch (err: any) {
      showError('Action Denied', 'Write privileges forbidden.');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  // Filter Console Admins list
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      if (adminRoleFilter !== 'all' && admin.role !== adminRoleFilter) return false;
      if (adminStatusFilter !== 'all' && admin.status !== adminStatusFilter) return false;
      return true;
    });
  }, [admins, adminRoleFilter, adminStatusFilter]);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'Owner':
        return isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Super Admin':
        return isDark ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Admin':
        return isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return isDark ? 'bg-slate-500/10 border-slate-500/20 text-slate-300' : 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const isOwnerOrSuper = currentAdmin?.role === 'Owner' || currentAdmin?.role === 'Super Admin';

  // Export CSV Helper
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      showInfo('No Data', 'No active records match the current filter selection.');
      return;
    }

    const headers = ['UID', 'Full Name', 'Email', 'Role', 'Status', 'Pending Amount', 'Total Paid', 'Payment Status', 'Registration Date', 'Last Login', 'Provider'];
    const rows = filteredUsers.map(u => [
      u.uid,
      u.fullName,
      u.email,
      u.role,
      u.status,
      u.pendingAmount || 0,
      u.totalPaid || 0,
      u.paymentStatus || 'Paid',
      u.createdAt,
      u.lastLoginAt || '',
      u.providerId || 'google.com'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `enterprise_users_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Export Succeeded', 'CSV snapshot generated successfully.');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 relative">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Enterprise Management Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Authoritative real-time administration of registered clients and console privileges.
          </p>
        </div>

        {activeTab === 'users' ? (
          <M3Button
            variant="tonal"
            icon={Download}
            onClick={handleExportCSV}
          >
            Export Clients CSV
          </M3Button>
        ) : (
          isOwnerOrSuper && (
            <M3Button
              variant="filled"
              icon={UserPlus}
              onClick={() => setShowAddAdminModal(true)}
            >
              Invite Admin
            </M3Button>
          )
        )}
      </div>

      {/* Navigation Segmented Tab Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-white/[0.05] rounded-2xl w-full sm:max-w-md">
        <button
          onClick={() => { setActiveTab('users'); setSelectedUser(null); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all',
            activeTab === 'users'
              ? 'bg-[#004a77] text-[#c2e7ff] shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Users size={15} />
          <span>Registered Clients ({enterpriseUsers.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('admins'); setSelectedUser(null); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all',
            activeTab === 'admins'
              ? 'bg-[#004a77] text-[#c2e7ff] shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Crown size={15} />
          <span>Console Admins ({admins.length})</span>
        </button>
      </div>

      {/* TAB 1: Registered Clients View */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-white/[0.08] backdrop-blur-xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users size={12} className="text-blue-400" /> Active Customers
              </div>
              <p className="text-xl font-mono font-extrabold text-white">
                {enterpriseUsers.filter(u => u.status === 'Active').length}
              </p>
            </div>
            <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-white/[0.08] backdrop-blur-xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-rose-400" /> Outstanding Receivables
              </div>
              <p className="text-xl font-mono font-extrabold text-rose-400">
                ₹{enterpriseUsers.reduce((sum, u) => sum + (u.pendingAmount || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-white/[0.08] backdrop-blur-xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400" /> Total Invoices Settled
              </div>
              <p className="text-xl font-mono font-extrabold text-emerald-400">
                ₹{enterpriseUsers.reduce((sum, u) => sum + (u.totalPaid || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 rounded-3xl bg-[#1e1e2d]/60 border border-white/[0.08] backdrop-blur-xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity size={12} className="text-indigo-400" /> Overdue Invoices Count
              </div>
              <p className="text-xl font-mono font-extrabold text-white">
                {allPayments.filter(p => p.status === 'Overdue').length}
              </p>
            </div>
          </div>

          {/* Detailed Search & Filters Box */}
          <M3Card variant="elevated" padding="lg" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search Name, Email, UID, Invoice ID..."
                  className="w-full text-xs bg-slate-900 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-400 shrink-0">Role:</span>
                {(['all', 'User', 'Admin', 'Manager', 'Owner'] as const).map((r) => (
                  <M3Chip
                    key={r}
                    label={r === 'all' ? 'All Roles' : r}
                    selected={userRoleFilter === r}
                    onClick={() => setUserRoleFilter(r)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/[0.05] text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Account Status:</span>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="bg-slate-900 text-slate-300 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="all">All States</option>
                  <option value="Active">Active Only</option>
                  <option value="Suspended">Suspended Only</option>
                  <option value="Disabled">Disabled Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Payment Status:</span>
                <select
                  value={userPaymentFilter}
                  onChange={(e) => setUserPaymentFilter(e.target.value)}
                  className="bg-slate-900 text-slate-300 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="all">All Users</option>
                  <option value="pending">Payment Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="partial">Partial Payment</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Email Verification:</span>
                <select
                  value={userVerifiedFilter}
                  onChange={(e) => setUserVerifiedFilter(e.target.value)}
                  className="bg-slate-900 text-slate-300 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="verified">Verified only</option>
                  <option value="unverified">Unverified only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Activity Window:</span>
                <select
                  value={userActivityFilter}
                  onChange={(e) => setUserActivityFilter(e.target.value)}
                  className="bg-slate-900 text-slate-300 border border-white/10 rounded-xl px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="all">All Registrants</option>
                  <option value="recent">Recently Joined (7 days)</option>
                  <option value="inactive">Inactive (0 transactions)</option>
                </select>
              </div>
            </div>
          </M3Card>

          {/* Customers Data Grid Table */}
          {isUsersLoading ? (
            <div className="text-center py-16 text-slate-500 text-xs flex items-center justify-center gap-2">
              <Activity className="animate-spin text-indigo-400" size={16} />
              <span>Establishing live clients stream listener...</span>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto rounded-3xl border border-white/[0.06] bg-slate-950">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Profile Photo</th>
                    <th className="py-4 px-4">Customer Name</th>
                    <th className="py-4 px-4">Email</th>
                    <th className="py-4 px-4">UID</th>
                    <th className="py-4 px-4 text-right">Pending Amount</th>
                    <th className="py-4 px-4 text-right">Total Paid</th>
                    <th className="py-4 px-4">Payment Status</th>
                    <th className="py-4 px-4 text-right">Last Payment Date</th>
                    <th className="py-4 px-4 text-right">Account Created</th>
                    <th className="py-4 px-4 text-right">Last Login</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.uid}
                      onClick={() => navigate(`/admin/users/${user.uid}`)}
                      className="text-xs hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.fullName} className="w-full h-full object-cover" />
                          ) : (
                            (user.fullName || 'User').substring(0, 2).toUpperCase()
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-bold text-white tracking-tight leading-none">{user.fullName}</p>
                          <span className={cn('px-1.5 py-0.2 mt-1.5 inline-block text-[9px] rounded font-bold border uppercase leading-none', getRoleBadgeStyle(user.role))}>
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-400 truncate max-w-[150px]" title={user.email}>
                        {user.email}
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-500" title={user.uid}>
                        {user.uid.slice(0, 8)}...
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-extrabold text-rose-400">
                        ₹{(user.pendingAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-extrabold text-emerald-400">
                        ₹{(user.totalPaid || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border',
                          user.paymentStatus === 'Paid'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : user.paymentStatus === 'Partial'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : user.paymentStatus === 'Pending'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : user.paymentStatus === 'Overdue'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            user.paymentStatus === 'Paid' ? 'bg-emerald-400' :
                            user.paymentStatus === 'Partial' ? 'bg-blue-400' :
                            user.paymentStatus === 'Pending' ? 'bg-amber-400' :
                            user.paymentStatus === 'Overdue' ? 'bg-rose-400' : 'bg-slate-400'
                          )} />
                          <span>{user.paymentStatus === 'Paid' && (user.totalPaid || 0) === 0 ? 'No Invoices' : user.paymentStatus}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {user.lastPaymentDate ? new Date(user.lastPaymentDate).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(user.lastLoginAt || '').toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/admin/users/${user.uid}`)}
                          className="p-1 px-3 rounded-full bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/20 text-xs font-semibold text-slate-300 hover:text-indigo-300 transition-all flex items-center gap-1 ml-auto"
                        >
                          <span>Manage</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 rounded-3xl border border-white/[0.05] bg-white/[0.01]">
              <p className="text-slate-400 font-bold text-sm">No clients matching filters</p>
              <p className="text-slate-500 text-xs mt-1">Try relaxing your role, status, or search query parameters.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Console Administrators View */}
      {activeTab === 'admins' && (
        <div className="space-y-6 animate-fade-in">
          {/* Admin filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Role:</span>
              {['all', 'Owner', 'Super Admin', 'Admin', 'Manager'].map((r) => (
                <M3Chip
                  key={r}
                  label={r === 'all' ? 'All Roles' : r}
                  selected={adminRoleFilter === r}
                  onClick={() => setAdminRoleFilter(r)}
                />
              ))}
            </div>

            <div className="h-4 w-[1px] bg-slate-700 hidden sm:block mx-2" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
              {['all', 'Active', 'Disabled'].map((s) => (
                <M3Chip
                  key={s}
                  label={s === 'all' ? 'All' : s}
                  selected={adminStatusFilter === s}
                  onClick={() => setAdminStatusFilter(s)}
                />
              ))}
            </div>
          </div>

          {/* Admins Table */}
          {isAdminsLoading ? (
            <div className="text-center py-16 text-slate-500 text-xs flex items-center justify-center gap-2">
              <Activity className="animate-spin text-indigo-400" size={16} />
              <span>Querying console security logs...</span>
            </div>
          ) : filteredAdmins.length > 0 ? (
            <div className="overflow-x-auto rounded-3xl border border-white/[0.06] bg-slate-950">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Console Administrator</th>
                    <th className="py-4 px-4">Google Authenticated Email</th>
                    <th className="py-4 px-4">Authorized Role</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Last Console Login</th>
                    <th className="py-4 px-6 text-right">Operation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredAdmins.map((item) => {
                    const canEditRole = isOwnerOrSuper && item.uid !== currentAdmin?.uid && item.role !== 'Owner';
                    return (
                      <tr key={item.uid} className="text-xs hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {item.photoURL ? (
                                <img src={item.photoURL} alt={item.displayName} className="w-full h-full object-cover" />
                              ) : (
                                (item.displayName || 'Admin').substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white tracking-tight flex items-center gap-1.5">
                                <span>{item.displayName || 'Authenticated Google Admin'}</span>
                                {item.uid === currentAdmin?.uid && (
                                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.2 rounded-full font-bold">
                                    Current
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono mt-1">{item.uid}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-400">
                          {item.email}
                        </td>
                        <td className="py-4 px-4">
                          {canEditRole ? (
                            <select
                              value={item.role}
                              onChange={(e) => handleAdminRoleChange(item.uid, e.target.value as AdminRole)}
                              className="bg-slate-900 text-slate-200 border border-white/10 rounded-xl px-2 py-1 text-xs cursor-pointer focus:border-indigo-500"
                            >
                              <option value="Manager">Manager</option>
                              <option value="Admin">Admin</option>
                              <option value="Super Admin">Super Admin</option>
                            </select>
                          ) : (
                            <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase', getRoleBadgeStyle(item.role))}>
                              {item.role}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1',
                            item.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          )}>
                            <span className={cn('w-1 h-1 rounded-full', item.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400')} />
                            <span>{item.status || 'Active'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-400">
                          {item.lastLogin ? new Date(item.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {item.uid !== currentAdmin?.uid && item.role !== 'Owner' && isOwnerOrSuper ? (
                            <div className="flex items-center gap-2 justify-end">
                              <M3Button
                                variant="text"
                                size="sm"
                                onClick={() => handleAdminStatusToggle(item)}
                              >
                                {item.status === 'Active' ? 'Disable' : 'Enable'}
                              </M3Button>
                              <button
                                onClick={() => setAdminToDelete(item)}
                                className="p-2 rounded-full hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Revoke admin access whitelisting"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic pr-4">Access Whitelisted</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 rounded-3xl border border-white/[0.05] bg-white/[0.01]">
              <p className="text-slate-400 font-bold text-sm">No administrators found</p>
              <p className="text-slate-500 text-xs mt-1">Use the invite action to authorize secure Google access.</p>
            </div>
          )}
        </div>
      )}

      {/* DETAILED USER PROFILE SIDE PANELS DRAWER (Enterprise slide drawer) */}
      <AnimatePresence>
        {selectedUser && (
          <>
            {/* Backdrop Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sidebar Slide Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 250 }}
              className={cn(
                'fixed top-0 right-0 bottom-0 w-full sm:max-w-2xl z-50 overflow-y-auto flex flex-col border-l shadow-[0_0_40px_rgba(0,0,0,0.5)]',
                isDark ? 'bg-[#181824] border-white/[0.08]' : 'bg-white border-[#e1e3e1]'
              )}
            >
              {/* Drawer Title Section */}
              <div className="p-6 border-b border-white/[0.08] flex items-center justify-between sticky top-0 bg-[#181824]/95 backdrop-blur z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt={selectedUser.fullName} className="w-full h-full object-cover" />
                    ) : (
                      (selectedUser.fullName || 'User').substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white tracking-tight leading-none">{selectedUser.fullName}</h2>
                    <p className="text-[11px] text-slate-400 mt-1.5 font-mono">{selectedUser.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 flex-1">
                {/* 1. Personal Info & Security telemetry details */}
                <M3Card variant="outlined" padding="lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Info size={13} className="text-blue-400" /> Personal & Enrollment Profile
                  </h3>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">Enrollment Date</p>
                      <p className="text-white font-mono">{new Date(selectedUser.createdAt).toLocaleDateString()} at {new Date(selectedUser.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">Authorization Role</p>
                      <p className="text-white flex items-center gap-1.5 font-medium">
                        <span className={cn('px-2 py-0.1 text-[9px] rounded-full font-bold border uppercase', getRoleBadgeStyle(selectedUser.role))}>
                          {selectedUser.role}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">Unique Identifier (UID)</p>
                      <p className="text-slate-300 font-mono text-[10px] truncate" title={selectedUser.uid}>{selectedUser.uid}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">Provider Source</p>
                      <p className="text-white font-mono">{selectedUser.providerId || 'google.com'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">Mobile Phone</p>
                      <p className="text-white font-mono">{selectedUser.phone || 'Not Registered'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5">E-Mail Verified</p>
                      <p className="text-white flex items-center gap-1.5">
                        <span className={cn('font-bold', selectedUser.emailVerified ? 'text-emerald-400' : 'text-slate-400')}>
                          {selectedUser.emailVerified ? 'VERIFIED' : 'PENDING'}
                        </span>
                        {!selectedUser.emailVerified && (
                          <button
                            onClick={() => handleVerifyEmail(selectedUser)}
                            className="text-[10px] text-blue-400 hover:underline font-bold"
                          >
                            Mark Verified
                          </button>
                        )}
                      </p>
                    </div>
                  </div>
                </M3Card>

                {/* 2. Interactive Role & Status Controls */}
                <M3Card variant="outlined" padding="lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Activity size={13} className="text-amber-400" /> Access Controls & Privileged Actions
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    <M3Button
                      variant={selectedUser.status === 'Suspended' ? 'filled' : 'tonal'}
                      size="sm"
                      icon={selectedUser.status === 'Suspended' ? UserCheck : UserX}
                      onClick={() => handleToggleUserSuspension(selectedUser)}
                      className={selectedUser.status === 'Suspended' ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-amber-400'}
                    >
                      {selectedUser.status === 'Suspended' ? 'Re-Activate User' : 'Suspend User'}
                    </M3Button>

                    <M3Button
                      variant={selectedUser.status === 'Disabled' ? 'filled' : 'tonal'}
                      size="sm"
                      icon={selectedUser.status === 'Disabled' ? Check : Lock}
                      onClick={() => handleToggleUserDisable(selectedUser)}
                    >
                      {selectedUser.status === 'Disabled' ? 'Enable Account' : 'Disable Account'}
                    </M3Button>

                    <M3Button
                      variant="outlined"
                      size="sm"
                      icon={Smartphone}
                      onClick={() => handleForceLogout(selectedUser)}
                    >
                      Force Logout (Sessions Reset)
                    </M3Button>

                    <M3Button
                      variant="outlined"
                      size="sm"
                      icon={Cloud}
                      onClick={() => handleResetUserBackup(selectedUser)}
                      className="text-amber-300"
                    >
                      Reset Scheduled Backup config
                    </M3Button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Escalate / De-escalate Role</label>
                      <select
                        value={selectedUser.role}
                        onChange={(e) => handleChangeUserRole(selectedUser, e.target.value as any)}
                        className="w-full text-xs bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-white outline-none cursor-pointer focus:border-indigo-500"
                      >
                        <option value="User">User (Standard account)</option>
                        <option value="Manager">Manager (Restricted console capabilities)</option>
                        <option value="Admin">Admin (Full administrative credentials)</option>
                        <option value="Owner">Owner (Root privileges)</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <M3Button
                        variant="filled"
                        size="sm"
                        icon={Trash2}
                        onClick={() => {
                          if (window.confirm(`Are you absolutely sure you want to permanently purge user ${selectedUser.fullName}? This cannot be undone.`)) {
                            handleDeleteUser(selectedUser);
                          }
                        }}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold"
                      >
                        Delete User Profile
                      </M3Button>
                    </div>
                  </div>
                </M3Card>

                {/* 3. NEW: Real Payment Due Management Panel */}
                <M3Card variant="outlined" padding="lg">
                  <div className="flex items-center justify-between mb-3 border-b border-white/[0.05] pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Receipt size={14} className="text-indigo-400" /> Payment Due Management
                      </h3>
                      <p className="text-[10px] text-slate-500">Invoice creation, installment record-keeping and overdue checks.</p>
                    </div>
                    <M3Button
                      variant="filled"
                      size="sm"
                      icon={PlusCircle}
                      onClick={() => setShowAddPaymentModal(true)}
                    >
                      Add Invoice
                    </M3Button>
                  </div>

                  {drawerData.isLoading ? (
                    <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 animate-pulse">
                      <span>Syncing user payments ledger...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Financial metrics */}
                      <div className="grid grid-cols-3 gap-3 bg-white/[0.02] border border-white/[0.05] p-3 rounded-2xl">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Invoiced</span>
                          <span className="text-xs font-mono font-extrabold text-white">
                            ₹{drawerData.payments.reduce((sum, p) => sum + (p.status !== 'Cancelled' ? p.amount : 0), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Paid</span>
                          <span className="text-xs font-mono font-extrabold text-emerald-400">
                            ₹{drawerData.payments.reduce((sum, p) => sum + (p.status !== 'Cancelled' ? p.paidAmount : 0), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Outstanding</span>
                          <span className="text-xs font-mono font-extrabold text-rose-400">
                            ₹{drawerData.payments.reduce((sum, p) => sum + (p.status !== 'Cancelled' ? p.pendingAmount : 0), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Invoices List */}
                      {drawerData.payments.length > 0 ? (
                        <div className="space-y-3">
                          {drawerData.payments.map((payment) => (
                            <div key={payment.paymentId} className="p-3 bg-slate-900/50 border border-white/[0.05] rounded-2xl text-xs space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono text-[11px] font-bold text-white block">{payment.paymentId}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">Issued {new Date(payment.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span className={cn(
                                  'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border',
                                  payment.status === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  payment.status === 'Partial' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                  payment.status === 'Pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  payment.status === 'Overdue' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                  'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                )}>
                                  {payment.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 bg-[#131314] p-2.5 rounded-xl text-[11px] text-slate-400 font-mono">
                                <div>
                                  <strong className="text-slate-300">Outstanding:</strong> ₹{payment.pendingAmount.toLocaleString('en-IN')} / ₹{payment.amount.toLocaleString('en-IN')}
                                </div>
                                <div>
                                  <strong className="text-slate-300">Due Date:</strong> {payment.dueDate}
                                </div>
                              </div>

                              {/* Actions Bar for payment invoice */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                {payment.status !== 'Paid' && payment.status !== 'Cancelled' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedPayment(payment);
                                        setRecordAmount(String(payment.pendingAmount));
                                        setShowRecordPaymentModal(true);
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold bg-[#004a77] hover:bg-[#004a77]/80 text-[#c2e7ff] rounded-lg transition-colors"
                                    >
                                      Record Pay
                                    </button>
                                    <button
                                      onClick={() => handleMarkPaidAction(payment)}
                                      className="px-2 py-1 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
                                    >
                                      Mark Paid
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedPayment(payment);
                                        setNewDueDate(payment.dueDate);
                                        setShowUpdateDueDateModal(true);
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
                                    >
                                      Update Due
                                    </button>
                                    <button
                                      onClick={() => handleSendReminderAction(payment)}
                                      className="px-2 py-1 text-[10px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg transition-colors"
                                    >
                                      Send Reminder
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleGenerateInvoiceAction(payment)}
                                  className="px-2 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Download size={10} />
                                  Invoice
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setShowPaymentHistoryModal(true);
                                  }}
                                  className="px-2 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
                                >
                                  Logs ({payment.history?.length || 0})
                                </button>
                                {payment.status !== 'Paid' && payment.status !== 'Cancelled' && (
                                  <button
                                    onClick={() => handleCancelPaymentAction(payment)}
                                    className="px-2 py-1 text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-auto"
                                  >
                                    Void
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic py-2 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/[0.05]">No active payment invoices registered on this client profile yet.</p>
                      )}
                    </div>
                  )}
                </M3Card>

                {/* 4. Transaction Summary from live Firestore */}
                <M3Card variant="outlined" padding="lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-indigo-400" /> Account ledger statistics
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-bold">
                      {drawerData.transactions.length} Records
                    </span>
                  </div>

                  {drawerData.isLoading ? (
                    <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                      <Activity className="animate-spin text-indigo-400" size={13} />
                      <span>Loading user ledger...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
                        <p className="text-[10px] text-slate-500 font-bold uppercase leading-none">Net Balance</p>
                        <p className="text-sm font-mono font-extrabold text-white mt-1.5">
                          ₹{drawerData.transactions.reduce((sum, t) => sum + (t.type === 'received' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase leading-none">Total Received</p>
                        <p className="text-sm font-mono font-extrabold text-emerald-400 mt-1.5">
                          ₹{drawerData.transactions.filter(t => t.type === 'received').reduce((sum, t) => sum + (Number(t.amount) || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                        <p className="text-[10px] text-rose-400 font-bold uppercase leading-none">Total Sent</p>
                        <p className="text-sm font-mono font-extrabold text-rose-400 mt-1.5">
                          ₹{drawerData.transactions.filter(t => t.type === 'sent').reduce((sum, t) => sum + (Number(t.amount) || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )}
                </M3Card>

                {/* 5. Connected Devices (Sessions) */}
                <M3Card variant="outlined" padding="lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Smartphone size={13} className="text-indigo-400" /> Sessions & Connected Devices ({drawerData.devices.length})
                  </h3>

                  {drawerData.isLoading ? (
                    <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 animate-pulse">
                      <span>Loading active sessions...</span>
                    </div>
                  ) : drawerData.devices.length > 0 ? (
                    <div className="space-y-2">
                      {drawerData.devices.map((device) => (
                        <div key={device.id} className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-2xl text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <SmartphoneIcon size={16} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="font-bold text-white">{device.deviceName || 'SmartLedger Device'}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{device.os} · {device.browser} · IP: {device.ip}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            Active {new Date(device.lastActive).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-2">No active connected device sessions enrolled.</p>
                  )}
                </M3Card>

                {/* 6. Login History Logs */}
                <M3Card variant="outlined" padding="lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <History size={13} className="text-cyan-400" /> Recent Security Logs & Authentication History
                  </h3>

                  {drawerData.isLoading ? (
                    <div className="py-4 text-center text-xs text-slate-500 animate-pulse">
                      <span>Analyzing security trails...</span>
                    </div>
                  ) : drawerData.loginHistory.length > 0 ? (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {drawerData.loginHistory.slice(0, 8).map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.02]">
                          <span className="text-slate-300 font-medium truncate pr-2">{log.browser} ({log.os})</span>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-2">No login history recorded on this profile yet.</p>
                  )}
                </M3Card>

                {/* 7. Administrative Dispatch (Send custom email/notification) */}
                <M3Card variant="outlined" padding="lg" className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Send size={13} className="text-blue-400" /> Dispatch Corporate Notification / Email
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowSendNotificationModal(true)}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 hover:bg-[#004a77]/10 hover:border-[#004a77]/40 text-left text-xs font-bold text-white transition-all space-y-1"
                    >
                      <Bell size={16} className="text-blue-400" />
                      <p>Send In-App Notification</p>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">Push real-time alert to user inbox.</p>
                    </button>

                    <button
                      onClick={() => setShowSendEmailModal(true)}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 hover:bg-[#004a77]/10 hover:border-[#004a77]/40 text-left text-xs font-bold text-white transition-all space-y-1"
                    >
                      <Mail size={16} className="text-blue-400" />
                      <p>Send Monthly Email Report</p>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">Trigger Resend email with current stats.</p>
                    </button>
                  </div>

                  <M3Button
                    variant="tonal"
                    icon={FileText}
                    onClick={() => handleGenerateReport(selectedUser)}
                    className="w-full justify-center"
                  >
                    Generate & Download Profile Report (.txt)
                  </M3Button>
                </M3Card>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DISPATCH: Send in-app notification dialog */}
      <M3Dialog
        isOpen={showSendNotificationModal}
        onClose={() => setShowSendNotificationModal(false)}
        title="Send In-App Notification"
        subtitle={`Dispatch a real-time message to ${selectedUser?.fullName}`}
        icon={Bell}
        iconTone="primary"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowSendNotificationModal(false)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" loading={isActionPending} onClick={handleSendNotification}>
              Deliver Message
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleSendNotification} className="space-y-4 pt-2">
          <M3TextField
            label="Alert Notification Title"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            placeholder="e.g. System Security Notice"
            required
          />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">Notification Message Body</label>
            <textarea
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder="Input your instructions or notice for the user here..."
              required
              rows={4}
              className={cn(
                "w-full p-4 rounded-2xl border text-sm outline-none transition-all duration-200 resize-none",
                isDark
                  ? "bg-[#1e1f20] hover:bg-[#282a2d] border-[#3c4043] focus:border-[#a8c7fa] text-white"
                  : "bg-[#f0f4f9] hover:bg-[#e8edf4] border-[#c4c7c5] focus:border-[#0b57d0] text-black"
              )}
            />
          </div>
        </form>
      </M3Dialog>

      {/* DISPATCH: Send Resend Email monthly report dialog */}
      <M3Dialog
        isOpen={showSendEmailModal}
        onClose={() => setShowSendEmailModal(false)}
        title="Send Monthly Email Report"
        subtitle={`Dispatch monthly financial details to ${selectedUser?.email}`}
        icon={Mail}
        iconTone="primary"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowSendEmailModal(false)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" loading={isActionPending} onClick={handleSendCustomEmail}>
              Deliver Email
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleSendCustomEmail} className="space-y-4 pt-2">
          <M3TextField
            label="Email Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="SmartLedgerX Financial Report Update"
            required
          />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">Report Summary Custom Message</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Enter custom introductory summary notes here..."
              required
              rows={4}
              className={cn(
                "w-full p-4 rounded-2xl border text-sm outline-none transition-all duration-200 resize-none",
                isDark
                  ? "bg-[#1e1f20] hover:bg-[#282a2d] border-[#3c4043] focus:border-[#a8c7fa] text-white"
                  : "bg-[#f0f4f9] hover:bg-[#e8edf4] border-[#c4c7c5] focus:border-[#0b57d0] text-black"
              )}
            />
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Note: This action automatically compiles the recipient's real-time ledger stats (funds received, transfer count, balance) and dispatches it via Resend.
          </p>
        </form>
      </M3Dialog>

      {/* ADMIN: Invite Google Admin Dialog */}
      <M3Dialog
        isOpen={showAddAdminModal}
        onClose={() => setShowAddAdminModal(false)}
        title="Invite Console Administrator"
        subtitle="Whitelist Google accounts for full-access console authentication"
        icon={UserPlus}
        iconTone="primary"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowAddAdminModal(false)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" loading={isAddingAdmin} onClick={handleAddAdminSubmit}>
              Whitelist Account
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleAddAdminSubmit} className="space-y-4 pt-2">
          <M3TextField
            label="Google Account Email address"
            type="email"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="user@gmail.com"
            required
          />

          <M3TextField
            label="Full Display Name"
            value={newAdminName}
            onChange={(e) => setNewAdminName(e.target.value)}
            placeholder="e.g. Souvik Dash"
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Privilege Level</label>
            <select
              value={newAdminRole}
              onChange={(e) => setNewAdminRole(e.target.value as AdminRole)}
              className={cn(
                'w-full h-14 px-3.5 rounded-2xl border text-sm outline-none transition-all cursor-pointer',
                isDark ? 'bg-[#1e1f20] text-white border-[#3c4043]' : 'bg-[#f0f4f9] text-black border-[#c4c7c5]'
              )}
            >
              <option value="Manager">Manager (Read & Ledger Operations)</option>
              <option value="Admin">Admin (Full Export & Control Capabilities)</option>
              <option value="Super Admin">Super Admin (Enterprise Control & Backups)</option>
            </select>
          </div>

          {addAdminError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{addAdminError}</span>
            </div>
          )}
        </form>
      </M3Dialog>

      {/* ADMIN: Revoke console access confirmation dialog */}
      <M3Dialog
        isOpen={Boolean(adminToDelete)}
        onClose={() => setAdminToDelete(null)}
        title="Revoke Admin Access"
        subtitle="Remove administrator privileges"
        icon={Trash2}
        iconTone="rose"
        actions={
          <>
            <M3Button variant="text" onClick={() => setAdminToDelete(null)}>
              Cancel
            </M3Button>
            <M3Button variant="danger" loading={isDeletingAdmin} onClick={handleAdminDelete}>
              Revoke Privileges
            </M3Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to revoke admin console privileges for <strong className="text-white">{adminToDelete?.email}</strong>?
        </p>
      </M3Dialog>

      {/* NEW: Payment Actions Modals */}
      {/* 1. Add Payment Dialog */}
      <M3Dialog
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        title="Generate Invoice / Charge"
        subtitle={`Generate a secure payment invoice for ${selectedUser?.fullName}`}
        icon={Receipt}
        iconTone="primary"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowAddPaymentModal(false)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" loading={isActionPending} onClick={handleAddPaymentSubmit}>
              Create Invoice
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleAddPaymentSubmit} className="space-y-4 pt-2">
          <M3TextField
            label="Invoiced Amount (₹)"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="e.g. 5000"
            required
          />
          <M3TextField
            label="Payment Due Date"
            type="date"
            value={paymentDueDate}
            onChange={(e) => setPaymentDueDate(e.target.value)}
            required
          />
        </form>
      </M3Dialog>

      {/* 2. Record Payment Dialog */}
      <M3Dialog
        isOpen={showRecordPaymentModal}
        onClose={() => setShowRecordPaymentModal(false)}
        title="Record Received Installment"
        subtitle={`Register receipt of funds for Invoice ID: ${selectedPayment?.paymentId}`}
        icon={CreditCard}
        iconTone="primary"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowRecordPaymentModal(false)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" loading={isActionPending} onClick={handleRecordPaymentSubmit}>
              Record Settle
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 pt-2">
          <M3TextField
            label="Amount Settled (₹)"
            type="number"
            value={recordAmount}
            onChange={(e) => setRecordAmount(e.target.value)}
            placeholder="e.g. 2500"
            required
          />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Settlement Method</label>
            <select
              value={recordMethod}
              onChange={(e) => setRecordMethod(e.target.value)}
              className={cn(
                'w-full h-14 px-3.5 rounded-2xl border text-sm outline-none transition-all cursor-pointer',
                isDark ? 'bg-[#1e1f20] text-white border-[#3c4043]' : 'bg-[#f0f4f9] text-black border-[#c4c7c5]'
              )}
            >
              <option value="UPI">UPI Payment</option>
              <option value="Cash">Cash Handover</option>
              <option value="Card">Card Swipe</option>
              <option value="Bank Transfer">Direct Bank Transfer</option>
            </select>
          </div>
          <M3TextField
            label="Transaction Reference / Notes"
            value={recordNotes}
            onChange={(e) => setRecordNotes(e.target.value)}
            placeholder="e.g. UPI txn ref ID or Cash receipt details"
          />
        </form>
      </M3Dialog>

      {/* 3. Reschedule Due Date Dialog */}
      <M3Dialog
        isOpen={showUpdateDueDateModal}
        onClose={() => setShowUpdateDueDateModal(false)}
        title="Reschedule Due Date"
        subtitle={`Update calendar commitment for Invoice: ${selectedPayment?.paymentId}`}
        icon={Calendar}
        iconTone="primary"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowUpdateDueDateModal(false)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" loading={isActionPending} onClick={handleUpdateDueDateSubmit}>
              Reschedule
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleUpdateDueDateSubmit} className="space-y-4 pt-2">
          <M3TextField
            label="New Due Date"
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            required
          />
        </form>
      </M3Dialog>

      {/* 4. Payment History Logs Dialog */}
      <M3Dialog
        isOpen={showPaymentHistoryModal}
        onClose={() => setShowPaymentHistoryModal(false)}
        title={`Audit Trail: ${selectedPayment?.paymentId}`}
        subtitle="Chronological log history of administrative interventions on this invoice"
        icon={History}
        iconTone="primary"
        actions={
          <M3Button variant="filled" onClick={() => setShowPaymentHistoryModal(false)}>
            Close Trail
          </M3Button>
        }
      >
        <div className="space-y-3 pt-2 max-h-80 overflow-y-auto pr-1">
          {selectedPayment?.history && selectedPayment.history.length > 0 ? (
            selectedPayment.history.map((log: any, idx: number) => (
              <div key={idx} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>{log.action}</span>
                  <span className="font-mono text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-slate-400 font-medium">{log.details}</p>
                <div className="text-[10px] text-indigo-400 font-mono pt-0.5">Operator: {log.operator}</div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center italic">No operations logged for this invoice.</p>
          )}
        </div>
      </M3Dialog>
    </div>
  );
}
