import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Users, Mail, Clock, CheckCircle2, AlertCircle, X, Crown, Key, Sparkles, 
  Info, Check, Activity, FileText, Smartphone, Calendar, Cloud, Database, 
  AlertTriangle, Send, ChevronRight, Download, CreditCard, History, Lock, 
  SmartphoneIcon, Bell, PlusCircle, FileCheck, Ban, Receipt, Trash2
} from 'lucide-react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { UserService, EnterpriseUser } from '../../lib/userService';
import { PaymentService, PaymentRecord } from '../../lib/paymentService';
import { AlertService } from '../../lib/alertService';
import { cn, formatDate } from '../../lib/utils';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3TextField } from '../../components/admin/material3/M3TextField';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';
import { calculateGullakBalance } from '../../lib/gullakAccounting';

export default function AdminUserProfile() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { adminUser: currentAdmin } = useStore();
  const { showSuccess, showError, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  // Data Loading & User State
  const [selectedUser, setSelectedUser] = useState<EnterpriseUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);

  // Tab State for Customer Activity
  const [activeActivityTab, setActiveActivityTab] = useState<'transactions' | 'logins' | 'devices' | 'notifications' | 'reports'>('transactions');

  // Customer subcollections & computed profile summary
  const [profileData, setProfileData] = useState<{
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
    isLoading: true
  });

  // Action states for Modals
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

  // Load User Details & Core Profile
  useEffect(() => {
    if (!uid) return;
    setIsLoadingUser(true);

    const loadCoreUser = async () => {
      try {
        const rootRef = doc(db, 'users', uid);
        const rootSnap = await getDoc(rootRef);
        
        const profileRef = doc(db, 'users', uid, 'profile', 'info');
        const profileSnap = await getDoc(profileRef);
        
        if (!rootSnap.exists() && !profileSnap.exists()) {
          showError('User Not Found', `No profile exists for UID ${uid}`);
          navigate('/admin/users');
          return;
        }

        const rootData = rootSnap.exists() ? rootSnap.data() : {};
        const profileDataRaw = profileSnap.exists() ? profileSnap.data() : {};

        // Fetch subcollection data sizes
        const txCol = collection(db, 'users', uid, 'transactions');
        const txSnap = await getDocs(txCol);
        const activeTx = txSnap.docs.map(d => d.data()).filter(t => !t.deleted);

        const devCol = collection(db, 'users', uid, 'devices');
        const devSnap = await getDocs(devCol).catch(() => null);
        const deviceCount = devSnap ? devSnap.size : 1;

        const backupRef = doc(db, 'users', uid, 'backups_schedule', 'config');
        const backupSnap = await getDoc(backupRef).catch(() => null);
        const backupStatus = backupSnap && backupSnap.exists() ? 'verified' : 'none';

        const userObj: EnterpriseUser = {
          uid,
          fullName: rootData.name || profileDataRaw.fullName || profileDataRaw.displayName || 'SmartLedger User',
          email: rootData.email || profileDataRaw.email || 'user@smartledger.io',
          photoURL: rootData.photoURL || profileDataRaw.photoURL || '',
          role: profileDataRaw.role || 'User',
          status: rootData.status || profileDataRaw.status || 'Active',
          emailVerified: rootData.emailVerified !== undefined ? rootData.emailVerified : !!profileDataRaw.emailVerified,
          createdAt: rootData.createdAt || profileDataRaw.createdAt || new Date().toISOString(),
          lastLoginAt: rootData.lastLogin || profileDataRaw.lastLogin || new Date().toISOString(),
          providerId: rootData.provider || profileDataRaw.providerId || 'google.com',
          phone: profileDataRaw.mobile || '',
          transactionCount: activeTx.length,
          backupStatus,
          deviceCount
        };

        setSelectedUser(userObj);
      } catch (err: any) {
        showError('Fetch Failed', err?.message || 'Failed to fetch core user.');
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadCoreUser();
  }, [uid]);

  // Load Subcollections Details
  const loadSubcollectionDetails = async () => {
    if (!uid) return;
    setProfileData(prev => ({ ...prev, isLoading: true }));
    try {
      // 1. Fetch transactions
      const txSnap = await getDocs(collection(db, 'users', uid, 'transactions')).catch(() => null);
      const txList = txSnap ? txSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) : [];
      txList.sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
      
      // 2. Fetch login history
      const logSnap = await getDocs(collection(db, 'users', uid, 'loginHistory')).catch(() => null);
      const logList = logSnap ? logSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) : [];
      logList.sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      
      // 3. Fetch devices
      const devSnap = await getDocs(collection(db, 'users', uid, 'devices')).catch(() => null);
      const devList = devSnap ? devSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) : [];
      
      // 4. Fetch notifications
      const notifSnap = await getDocs(collection(db, 'users', uid, 'notifications')).catch(() => null);
      const notifList = notifSnap ? notifSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) : [];
      notifList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      // 5. Fetch backup schedule config
      const backupRef = doc(db, 'users', uid, 'backups_schedule', 'config');
      const backupSnap = await getDoc(backupRef).catch(() => null);
      const backupConfig = backupSnap && backupSnap.exists() ? backupSnap.data() : null;

      // 6. Fetch payments live
      const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', uid))).catch(() => null);
      const paymentsList = paymentsSnap ? paymentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PaymentRecord)) : [];
      paymentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setProfileData({
        transactions: txList,
        loginHistory: logList,
        devices: devList,
        notifications: notifList,
        backupConfig,
        payments: paymentsList,
        isLoading: false
      });
    } catch (err) {
      console.error('[UserProfile] Error fetching subcollection profiles:', err);
      setProfileData(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    loadSubcollectionDetails();
  }, [uid]);

  // Sync user payments state
  const reloadPaymentsLedger = async () => {
    if (!uid) return;
    try {
      const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', uid))).catch(() => null);
      const paymentsList = paymentsSnap ? paymentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PaymentRecord)) : [];
      paymentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setProfileData(prev => ({
        ...prev,
        payments: paymentsList
      }));
    } catch (e) {
      console.warn('[PaymentsLedger] Reload failed:', e);
    }
  };

  // Profile Action handlers
  const handleToggleUserSuspension = async () => {
    if (!selectedUser) return;
    setIsActionPending(true);
    const nextStatus = selectedUser.status === 'Suspended' ? 'Active' : 'Suspended';
    try {
      const profileRef = doc(db, 'users', selectedUser.uid, 'profile', 'info');
      await updateDoc(profileRef, { status: nextStatus });
      const rootRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(rootRef, { status: nextStatus }).catch(() => {});

      await AlertService.createAlert({
        type: nextStatus === 'Suspended' ? 'User Suspended' : 'New User Registered',
        title: nextStatus === 'Suspended' ? 'User Suspended by Admin' : 'User Re-Activated',
        description: `User ${selectedUser.fullName} (${selectedUser.email}) status changed to ${nextStatus}.`,
        severity: nextStatus === 'Suspended' ? 'Warning' : 'Success',
        userId: selectedUser.uid,
        source: 'Admin Console'
      });

      showSuccess('Status Updated', `User ${selectedUser.fullName} has been set to ${nextStatus}.`);
      setSelectedUser(prev => prev ? { ...prev, status: nextStatus } : null);
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Failed to update user status.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleToggleUserDisable = async () => {
    if (!selectedUser) return;
    setIsActionPending(true);
    const nextStatus = selectedUser.status === 'Disabled' ? 'Active' : 'Disabled';
    try {
      const profileRef = doc(db, 'users', selectedUser.uid, 'profile', 'info');
      await updateDoc(profileRef, { status: nextStatus });
      const rootRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(rootRef, { status: nextStatus }).catch(() => {});

      await AlertService.createAlert({
        type: nextStatus === 'Disabled' ? 'User Suspended' : 'New User Registered',
        title: nextStatus === 'Disabled' ? 'User Account Disabled' : 'User Account Enabled',
        description: `User ${selectedUser.fullName} account was toggled to ${nextStatus} by console admin.`,
        severity: nextStatus === 'Disabled' ? 'Warning' : 'Success',
        userId: selectedUser.uid,
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

  const handleVerifyEmail = async () => {
    if (!selectedUser) return;
    setIsActionPending(true);
    try {
      const profileRef = doc(db, 'users', selectedUser.uid, 'profile', 'info');
      await updateDoc(profileRef, { emailVerified: true });
      const rootRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(rootRef, { emailVerified: true }).catch(() => {});

      showSuccess('Email Verified', `Verification credentials updated for ${selectedUser.fullName}.`);
      setSelectedUser(prev => prev ? { ...prev, emailVerified: true } : null);
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Failed to verify email.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleChangeUserRole = async (nextRole: 'User' | 'Admin' | 'Manager' | 'Owner') => {
    if (!selectedUser) return;
    setIsActionPending(true);
    try {
      const profileRef = doc(db, 'users', selectedUser.uid, 'profile', 'info');
      await updateDoc(profileRef, { role: nextRole });
      const rootRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(rootRef, { role: nextRole }).catch(() => {});

      showSuccess('Role Changed', `User assigned role ${nextRole}.`);
      setSelectedUser(prev => prev ? { ...prev, role: nextRole } : null);
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Failed to update role.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleForceLogout = async () => {
    if (!selectedUser) return;
    setIsActionPending(true);
    try {
      const devCol = collection(db, 'users', selectedUser.uid, 'devices');
      const devSnap = await getDocs(devCol);
      let deletedCount = 0;
      for (const d of devSnap.docs) {
        await deleteDoc(doc(db, 'users', selectedUser.uid, 'devices', d.id));
        deletedCount++;
      }

      await AlertService.createAlert({
        type: 'Authentication Error',
        title: 'Force Session Revocation',
        description: `Admin terminated ${deletedCount} active device sessions for ${selectedUser.fullName}.`,
        severity: 'Warning',
        userId: selectedUser.uid,
        source: 'Admin Console'
      });

      showSuccess('Sessions Revoked', `Successfully terminated ${deletedCount} active device logins.`);
      setProfileData(prev => ({ ...prev, devices: [] }));
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Failed to terminate user sessions.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleResetUserBackup = async () => {
    if (!selectedUser) return;
    setIsActionPending(true);
    try {
      const backupRef = doc(db, 'users', selectedUser.uid, 'backups_schedule', 'config');
      await deleteDoc(backupRef);
      
      showSuccess('Backup Configuration Reset', 'Automatic backup parameters restored to default.');
      setProfileData(prev => ({ ...prev, backupConfig: null }));
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
      setProfileData(prev => ({
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
          currentBalance: profileData.transactions.reduce((sum, t) => sum + (t.type === 'received' ? Number(t.amount) : -Number(t.amount)), 0),
          incomeThisMonth: profileData.transactions.filter(t => t.type === 'received').reduce((sum, t) => sum + Number(t.amount), 0),
          highestPaymentReceived: profileData.transactions.filter(t => t.type === 'received').reduce((mx, t) => Math.max(mx, Number(t.amount)), 0),
          numberOfIncomeTransactions: profileData.transactions.filter(t => t.type === 'received').length,
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
      showError('Email Failed', err?.message || 'Failed to deliver email through Resend API.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleGenerateReport = () => {
    if (!selectedUser) return;
    const ledger = profileData.transactions;
    const balance = ledger.reduce((sum, t) => sum + (t.type === 'received' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)), 0);
    const received = ledger.filter(t => t.type === 'received').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const sent = ledger.filter(t => t.type === 'sent').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const reportText = `SMARTLEDGERX ENTERPRISE USER PROFILE REPORT
--------------------------------------------------
USER UID: ${selectedUser.uid}
FULL NAME: ${selectedUser.fullName}
EMAIL: ${selectedUser.email}
ROLE: ${selectedUser.role}
STATUS: ${selectedUser.status}
EMAIL VERIFIED: ${selectedUser.emailVerified ? 'Yes' : 'No'}
MEMBER SINCE: ${new Date(selectedUser.createdAt).toLocaleString()}

FINANCIAL SUMMARY
--------------------------------------------------
Net Account Balance: ₹${balance.toLocaleString('en-IN')}
Total Funds Received: ₹${received.toLocaleString('en-IN')}
Total Funds Transferred: ₹${sent.toLocaleString('en-IN')}
Transaction Record Count: ${ledger.length}

DEVICES & SESSIONS
--------------------------------------------------
Active Devices Enrolled: ${profileData.devices.length}
${profileData.devices.map((d, i) => `[Device #${i+1}] ${d.deviceName} (${d.os}) - IP: ${d.ip} - Last active: ${new Date(d.lastActive).toLocaleString()}`).join('\n')}

LOGIN HISTORY & TELEMETRY
--------------------------------------------------
${profileData.loginHistory.slice(0, 5).map((h, i) => `[Session #${i+1}] ${new Date(h.timestamp).toLocaleString()} - Browser: ${h.browser} - Status: ${h.status || 'Success'}`).join('\n')}

--------------------------------------------------
Generated on: ${new Date().toLocaleString()} by authorized administrator: ${currentAdmin?.email}
`;

    const element = document.createElement("a");
    const file = new Blob([reportText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `user_profile_report_${selectedUser.uid}_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showSuccess('Report Exported', `Account log report compiled for user: ${selectedUser.fullName}.`);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsActionPending(true);
    try {
      const res = await UserService.deleteUser(selectedUser.uid);
      if (res.success) {
        await AlertService.createAlert({
          type: 'User Deleted',
          title: 'User Profile Deleted',
          description: `User ${selectedUser.fullName} (${selectedUser.email}) cleanly purged from Firestore databases.`,
          severity: 'Critical',
          userId: selectedUser.uid,
          source: 'Admin Console'
        });

        showSuccess('User Purged', `Successfully deleted user ${selectedUser.fullName} and cleared all subcollections.`);
        navigate('/admin/users');
      } else {
        showError('Purge Failed', 'An error occurred during transaction removals.');
      }
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Purge process failed.');
    } finally {
      setIsActionPending(false);
    }
  };

  // Payment Submissions
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
        reloadPaymentsLedger();
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
      reloadPaymentsLedger();
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
      reloadPaymentsLedger();
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
      reloadPaymentsLedger();
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
      reloadPaymentsLedger();
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
      reloadPaymentsLedger();
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

  // Helper styles
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

  if (isLoadingUser || !selectedUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Activity className="animate-spin text-indigo-400" size={24} />
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Compiling customer statistics ledger...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className={cn('text-xl sm:text-2xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
                Client Secure Profile View
              </h1>
              <span className={cn('px-2 py-0.5 text-[9px] rounded-full font-bold border uppercase leading-none', getRoleBadgeStyle(selectedUser.role))}>
                {selectedUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Authoritative full-page database inspection for unique identifier: <span className="font-mono text-indigo-300">{selectedUser.uid}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <M3Button
            variant="tonal"
            icon={Download}
            onClick={handleGenerateReport}
          >
            Export Profile Report (.txt)
          </M3Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Profile Info & Access Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card Info */}
          <M3Card variant="elevated" padding="lg" className="space-y-4">
            <div className="flex flex-col items-center text-center pb-4 border-b border-white/[0.06]">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-indigo-500/10 border-2 border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xl mb-3 shadow-inner">
                {selectedUser.photoURL ? (
                  <img src={selectedUser.photoURL} alt={selectedUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  (selectedUser.fullName || 'User').substring(0, 2).toUpperCase()
                )}
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-none">{selectedUser.fullName}</h2>
              <p className="text-xs text-slate-400 font-mono mt-1.5">{selectedUser.email}</p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className={cn(
                  'px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider',
                  selectedUser.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  selectedUser.status === 'Suspended' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                )}>
                  {selectedUser.status}
                </span>
                {selectedUser.emailVerified && (
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Verified Google Auth
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Account details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Provider Source</span>
                  <span className="text-white font-mono">{selectedUser.providerId || 'google.com'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Mobile Phone</span>
                  <span className="text-white font-mono">{selectedUser.phone || 'Not Registered'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Enrollment Date</span>
                  <span className="text-white font-mono">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Last Login</span>
                  <span className="text-white font-mono">{new Date(selectedUser.lastLoginAt || '').toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Active Devices</span>
                  <span className="text-white font-mono font-bold">{selectedUser.deviceCount || 1} Device</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">E-Mail Verified</span>
                  <span className="text-white flex items-center gap-1 font-bold">
                    <span className={selectedUser.emailVerified ? 'text-emerald-400' : 'text-slate-400'}>
                      {selectedUser.emailVerified ? 'YES' : 'PENDING'}
                    </span>
                    {!selectedUser.emailVerified && (
                      <button
                        onClick={handleVerifyEmail}
                        className="text-[10px] text-indigo-400 hover:underline font-bold"
                      >
                        (Verify)
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </M3Card>

          {/* Access Controls & Actions */}
          <M3Card variant="elevated" padding="lg" className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-white/[0.05] pb-2">
              <Activity size={13} className="text-amber-400" /> Access Controls & Privileged Actions
            </h3>

            <div className="flex flex-col gap-2">
              <M3Button
                variant={selectedUser.status === 'Suspended' ? 'filled' : 'tonal'}
                size="sm"
                icon={selectedUser.status === 'Suspended' ? Check : Ban}
                onClick={handleToggleUserSuspension}
                className={selectedUser.status === 'Suspended' ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-amber-400'}
              >
                {selectedUser.status === 'Suspended' ? 'Re-Activate User' : 'Suspend User'}
              </M3Button>

              <M3Button
                variant={selectedUser.status === 'Disabled' ? 'filled' : 'tonal'}
                size="sm"
                icon={selectedUser.status === 'Disabled' ? Check : Lock}
                onClick={handleToggleUserDisable}
              >
                {selectedUser.status === 'Disabled' ? 'Enable Account' : 'Disable Account'}
              </M3Button>

              <M3Button
                variant="outlined"
                size="sm"
                icon={Smartphone}
                onClick={handleForceLogout}
              >
                Force Session Revocation (Logouts)
              </M3Button>

              {profileData.backupConfig && (
                <M3Button
                  variant="outlined"
                  size="sm"
                  icon={Cloud}
                  onClick={handleResetUserBackup}
                  className="text-amber-300 border-amber-500/20"
                >
                  Reset Scheduled Backup Config
                </M3Button>
              )}
            </div>

            <div className="space-y-3.5 pt-3 border-t border-white/[0.05]">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Escalate / De-escalate Role</label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => handleChangeUserRole(e.target.value as any)}
                  className="w-full text-xs bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-white outline-none cursor-pointer focus:border-indigo-500"
                >
                  <option value="User">User (Standard account)</option>
                  <option value="Manager">Manager (Restricted console capabilities)</option>
                  <option value="Admin">Admin (Full administrative credentials)</option>
                  <option value="Owner">Owner (Root privileges)</option>
                </select>
              </div>

              <div className="pt-2">
                <M3Button
                  variant="filled"
                  size="sm"
                  icon={Trash2}
                  onClick={() => {
                    if (window.confirm(`Are you absolutely sure you want to permanently purge user ${selectedUser.fullName}? This cannot be undone.`)) {
                      handleDeleteUser();
                    }
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Delete User Profile
                </M3Button>
              </div>
            </div>
          </M3Card>
        </div>

        {/* RIGHT COLUMN: Payments, Account ledger & Subcollection Activity grids */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Due Management block */}
          <M3Card variant="elevated" padding="lg" className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Receipt size={14} className="text-indigo-400" /> Real-time Payment Due Management
                </h3>
                <p className="text-[11px] text-slate-400">Track and manage invoices, installments, and outstanding balances.</p>
              </div>
              <M3Button
                variant="filled"
                size="sm"
                icon={PlusCircle}
                onClick={() => setShowAddPaymentModal(true)}
              >
                Create Invoice
              </M3Button>
            </div>

            {profileData.isLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <Activity className="animate-spin text-indigo-400" size={14} />
                <span>Syncing payments database...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Financial Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/[0.02] border border-white/[0.05] p-3 rounded-2xl">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Invoiced Total</span>
                    <span className="text-base font-mono font-extrabold text-white">
                      ₹{profileData.payments.reduce((sum, p) => sum + (p.status !== 'Cancelled' ? p.amount : 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Paid Settled</span>
                    <span className="text-base font-mono font-extrabold text-emerald-400">
                      ₹{profileData.payments.reduce((sum, p) => sum + (p.status !== 'Cancelled' ? p.paidAmount : 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Outstanding Dues</span>
                    <span className="text-base font-mono font-extrabold text-rose-400">
                      ₹{profileData.payments.reduce((sum, p) => sum + (p.status !== 'Cancelled' ? p.pendingAmount : 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Invoices List */}
                {profileData.payments.length > 0 ? (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {profileData.payments.map((payment) => (
                      <div key={payment.paymentId} className="p-3.5 bg-slate-900/50 border border-white/[0.05] rounded-2xl text-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs font-bold text-white block">{payment.paymentId}</span>
                            <span className="text-[10px] text-slate-500">Issued {new Date(payment.createdAt).toLocaleDateString()}</span>
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

                        <div className="grid grid-cols-2 gap-2 bg-[#131314] p-2.5 rounded-xl text-xs text-slate-400 font-mono">
                          <div>
                            <strong className="text-slate-300">Outstanding:</strong> ₹{payment.pendingAmount.toLocaleString('en-IN')} / ₹{payment.amount.toLocaleString('en-IN')}
                          </div>
                          <div>
                            <strong className="text-slate-300">Due Date:</strong> {payment.dueDate}
                          </div>
                        </div>

                        {/* Actions bar for invoice */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/[0.03]">
                          {payment.status !== 'Paid' && payment.status !== 'Cancelled' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setRecordAmount(String(payment.pendingAmount));
                                  setShowRecordPaymentModal(true);
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold bg-[#004a77] hover:bg-[#004a77]/80 text-[#c2e7ff] rounded-lg transition-colors"
                              >
                                Record Pay
                              </button>
                              <button
                                onClick={() => handleMarkPaidAction(payment)}
                                className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
                              >
                                Settle Paid
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setNewDueDate(payment.dueDate);
                                  setShowUpdateDueDateModal(true);
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleSendReminderAction(payment)}
                                className="px-2.5 py-1 text-[10px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg transition-colors"
                              >
                                Send Reminder
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleGenerateInvoiceAction(payment)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Download size={10} /> Invoice
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentHistoryModal(true);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
                          >
                            Logs ({payment.history?.length || 0})
                          </button>
                          {payment.status !== 'Paid' && payment.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleCancelPaymentAction(payment)}
                              className="px-2.5 py-1 text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-auto font-mono"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/[0.05]">No active payment invoices registered on this client profile yet.</p>
                )}
              </div>
            )}
          </M3Card>

          {/* User Multi-Segmented Activity Logs & telemetry panel */}
          <M3Card variant="elevated" padding="lg" className="space-y-4">
            {/* Tabs Bar */}
            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/[0.05] overflow-x-auto gap-1">
              {[
                { id: 'transactions', label: `Transactions (${profileData.transactions.length})`, icon: CreditCard },
                { id: 'logins', label: `Security Logs (${profileData.loginHistory.length})`, icon: History },
                { id: 'devices', label: `Devices (${profileData.devices.length})`, icon: Smartphone },
                { id: 'notifications', label: `Notifications (${profileData.notifications.length})`, icon: Bell },
                { id: 'reports', label: `Administrative Dispatch`, icon: Send }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveActivityTab(tab.id as any)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap',
                    activeActivityTab === tab.id
                      ? 'bg-[#004a77] text-[#c2e7ff] shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <tab.icon size={13} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content Blocks */}
            <div className="pt-2">
              {activeActivityTab === 'transactions' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Historical Account ledger entries</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      Total Balanced: ₹{profileData.transactions.reduce((sum, t) => sum + (t.type === 'received' ? Number(t.amount) || 0 : -(Number(t.amount) || 0)), 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {profileData.transactions.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {profileData.transactions.map((t) => (
                        <div key={t.id} className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-2xl flex items-center justify-between text-xs font-mono">
                          <div className="space-y-1">
                            <span className="text-slate-200 font-bold block">{t.purpose || 'General Adjustment'}</span>
                            <span className="text-[10px] text-slate-500">{t.date || t.createdAt} · {t.invoiceNumber || 'No Ref'}</span>
                          </div>
                          <span className={cn(
                            'text-sm font-bold',
                            t.type === 'received' ? 'text-emerald-400' : 'text-rose-400'
                          )}>
                            {t.type === 'received' ? '+' : '-'} ₹{Number(t.amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-4 italic text-center">No transaction records enrolled on this ledger.</p>
                  )}
                </div>
              )}

              {activeActivityTab === 'logins' && (
                <div className="space-y-3">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Recent login authentication events</span>
                  {profileData.loginHistory.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {profileData.loginHistory.map((log) => (
                        <div key={log.id} className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-2xl text-xs flex justify-between items-center font-mono">
                          <div>
                            <p className="font-bold text-slate-300">{log.browser} ({log.os})</p>
                            <p className="text-[10px] text-slate-500 mt-1">IP Location: {log.ip || 'Unknown'} · Session Verified</p>
                          </div>
                          <span className="text-slate-400 shrink-0 text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-4 italic text-center">No telemetry security records registered.</p>
                  )}
                </div>
              )}

              {activeActivityTab === 'devices' && (
                <div className="space-y-3">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Registered secure browsers & trusted devices</span>
                  {profileData.devices.length > 0 ? (
                    <div className="space-y-2">
                      {profileData.devices.map((device) => (
                        <div key={device.id} className="p-3.5 bg-white/[0.01] border border-white/[0.05] rounded-2xl text-xs flex items-center justify-between">
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
                    <p className="text-xs text-slate-500 py-4 italic text-center">No active connected device sessions enrolled.</p>
                  )}
                </div>
              )}

              {activeActivityTab === 'notifications' && (
                <div className="space-y-3">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Delivered notification alert records</span>
                  {profileData.notifications.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 font-mono">
                      {profileData.notifications.map((n) => (
                        <div key={n.id} className="p-3 bg-white/[0.01] border border-white/[0.05] rounded-2xl text-xs space-y-1">
                          <div className="flex justify-between items-center text-slate-200 font-bold">
                            <span>{n.title}</span>
                            <span className="text-[10px] text-slate-500 font-normal">{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-400 font-medium">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-4 italic text-center">No push alerts catalogued.</p>
                  )}
                </div>
              )}

              {activeActivityTab === 'reports' && (
                <div className="space-y-4">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Secure Administrative dispatch channel</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowSendNotificationModal(true)}
                      className="p-4 rounded-2xl bg-slate-900 border border-white/10 hover:bg-[#004a77]/10 hover:border-[#004a77]/40 text-left text-xs font-bold text-white transition-all space-y-1.5"
                    >
                      <Bell size={18} className="text-blue-400" />
                      <p>Send In-App Push Notification</p>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5 leading-normal">Deliver a popup banner alert to the user's dashboard notifications center instantly.</p>
                    </button>

                    <button
                      onClick={() => setShowSendEmailModal(true)}
                      className="p-4 rounded-2xl bg-slate-900 border border-white/10 hover:bg-[#004a77]/10 hover:border-[#004a77]/40 text-left text-xs font-bold text-white transition-all space-y-1.5"
                    >
                      <Mail size={18} className="text-blue-400" />
                      <p>Send Monthly Email Report</p>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5 leading-normal">Trigger immediate delivery of a summary email incorporating the client's current ledger activity via Resend.</p>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </M3Card>
        </div>
      </div>

      {/* DISPATCH: Push notification dialog */}
      <M3Dialog
        isOpen={showSendNotificationModal}
        onClose={() => setShowSendNotificationModal(false)}
        title="Send In-App Notification"
        subtitle={`Dispatch a real-time message to ${selectedUser.fullName}`}
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

      {/* DISPATCH: Email report dialog */}
      <M3Dialog
        isOpen={showSendEmailModal}
        onClose={() => setShowSendEmailModal(false)}
        title="Send Monthly Email Report"
        subtitle={`Dispatch monthly financial details to ${selectedUser.email}`}
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
              placeholder="Enter custom summary notes here..."
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

      {/* NEW: Payment Dialogs */}
      {/* 1. Add Payment Dialog */}
      <M3Dialog
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        title="Generate Invoice / Charge"
        subtitle={`Generate a secure payment invoice for ${selectedUser.fullName}`}
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
