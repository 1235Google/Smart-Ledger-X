import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { AlertService } from './alertService';

export interface PaymentRecord {
  id?: string;
  paymentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
  history?: Array<{
    timestamp: string;
    action: string;
    details: string;
    operator: string;
  }>;
}

export class PaymentService {
  /**
   * Subscribe to live updates of all payments
   */
  public static subscribeToPayments(onUpdate: (payments: PaymentRecord[]) => void) {
    const colRef = collection(db, 'payments');
    return onSnapshot(colRef, (snapshot) => {
      const payments: PaymentRecord[] = [];
      snapshot.forEach((docSnap) => {
        payments.push({
          id: docSnap.id,
          ...docSnap.data()
        } as PaymentRecord);
      });
      // Sort newest first
      payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(payments);
    }, (err) => {
      console.error('[PaymentService] Error loading payments live stream:', err);
    });
  }

  /**
   * Subscribe to live updates of payments belonging to a specific user
   */
  public static subscribeToUserPayments(userId: string, onUpdate: (payments: PaymentRecord[]) => void) {
    const colRef = collection(db, 'payments');
    const q = query(colRef, where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const payments: PaymentRecord[] = [];
      snapshot.forEach((docSnap) => {
        payments.push({
          id: docSnap.id,
          ...docSnap.data()
        } as PaymentRecord);
      });
      payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(payments);
    }, (err) => {
      console.error(`[PaymentService] Error loading user payments for ${userId}:`, err);
    });
  }

  /**
   * Create a new payment record
   */
  public static async createPayment(data: {
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    paidAmount?: number;
    dueDate: string;
    operator: string;
  }) {
    try {
      const colRef = collection(db, 'payments');
      const paid = data.paidAmount || 0;
      const pending = data.amount - paid;
      
      let status: PaymentRecord['status'] = 'Pending';
      if (pending <= 0) {
        status = 'Paid';
      } else if (paid > 0) {
        status = 'Partial';
      } else if (new Date(data.dueDate).getTime() < Date.now()) {
        status = 'Overdue';
      }

      const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
      const payload: PaymentRecord = {
        paymentId,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        amount: data.amount,
        paidAmount: paid,
        pendingAmount: pending,
        dueDate: data.dueDate,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [{
          timestamp: new Date().toISOString(),
          action: 'Payment Created',
          details: `Invoiced ₹${data.amount.toLocaleString()} due on ${data.dueDate}.`,
          operator: data.operator
        }]
      };

      const docRef = await addDoc(colRef, payload);
      await updateDoc(docRef, { id: docRef.id });

      // Automatically generate real-time alerts if payment is pending or overdue
      if (status !== 'Paid') {
        await AlertService.createAlert({
          type: 'payment_due',
          title: `Payment Due: ${data.userName}`,
          description: `${data.userName} has ₹${pending.toLocaleString()} pending payment.`,
          severity: status === 'Overdue' ? 'Critical' : 'Warning',
          userId: data.userId,
          source: 'Payment Engine',
          metadata: {
            paymentId,
            amount: data.amount,
            dueDate: data.dueDate,
            timestamp: new Date().toISOString()
          }
        });

        // Trigger in-app notification to the user's box
        await this.addUserNotification(data.userId, {
          title: 'Payment Invoice Received',
          message: `An invoice of ₹${data.amount.toLocaleString()} has been generated for your account. Due Date: ${data.dueDate}.`,
          type: 'invoice'
        });
      }

      return { success: true, paymentId, id: docRef.id };
    } catch (err) {
      console.error('[PaymentService] Error creating payment:', err);
      throw err;
    }
  }

  /**
   * Helper to write an in-app notification directly into user's notification subcollection
   */
  private static async addUserNotification(userId: string, data: { title: string; message: string; type: string }) {
    try {
      const notifCol = collection(db, 'users', userId, 'notifications');
      const docRef = await addDoc(notifCol, {
        title: data.title,
        message: data.message,
        type: data.type,
        read: false,
        createdAt: new Date().toISOString()
      });
      await updateDoc(docRef, { id: docRef.id });
    } catch (err) {
      console.warn('[PaymentService] Background notification notice:', err);
    }
  }

  /**
   * Record a payment installment or partial/full payment
   */
  public static async recordPayment(paymentId: string, amountPaid: number, paymentMethod: string, notes: string, operator: string) {
    try {
      const q = query(collection(db, 'payments'), where('paymentId', '==', paymentId));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`Payment record not found: ${paymentId}`);
      }

      const pDoc = snap.docs[0];
      const data = pDoc.data() as PaymentRecord;

      const newPaid = Number(data.paidAmount) + amountPaid;
      const newPending = Math.max(0, Number(data.amount) - newPaid);

      let status: PaymentRecord['status'] = 'Pending';
      if (newPending <= 0) {
        status = 'Paid';
      } else if (newPaid > 0) {
        status = 'Partial';
      } else if (new Date(data.dueDate).getTime() < Date.now()) {
        status = 'Overdue';
      }

      const historyLog = {
        timestamp: new Date().toISOString(),
        action: 'Payment Recorded',
        details: `Paid ₹${amountPaid.toLocaleString()} via ${paymentMethod}. Notes: ${notes || 'None'}.`,
        operator
      };

      const updatedHistory = [...(data.history || []), historyLog];

      await updateDoc(pDoc.ref, {
        paidAmount: newPaid,
        pendingAmount: newPending,
        status,
        history: updatedHistory,
        updatedAt: new Date().toISOString()
      });

      // Write security audit alert if paid
      if (status === 'Paid') {
        await AlertService.createAlert({
          type: 'payment_completed',
          title: `Invoice Paid: ${data.userName}`,
          description: `Invoice ${paymentId} for ${data.userName} has been fully settled.`,
          severity: 'Success',
          userId: data.userId,
          source: 'Payment Engine',
          metadata: { paymentId, amount: data.amount, timestamp: new Date().toISOString() }
        });
      }

      // Sync notification to user
      await this.addUserNotification(data.userId, {
        title: status === 'Paid' ? 'Invoice Settled' : 'Payment Installment Received',
        message: status === 'Paid' 
          ? `Thank you! Your invoice ${paymentId} of ₹${data.amount.toLocaleString()} has been fully settled.`
          : `We received your payment of ₹${amountPaid.toLocaleString()} for invoice ${paymentId}. Remaining Balance: ₹${newPending.toLocaleString()}.`,
        type: 'receipt'
      });

      return { success: true };
    } catch (err) {
      console.error('[PaymentService] Error recording payment:', err);
      throw err;
    }
  }

  /**
   * Update payment due date
   */
  public static async updateDueDate(paymentId: string, newDueDate: string, operator: string) {
    try {
      const q = query(collection(db, 'payments'), where('paymentId', '==', paymentId));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`Payment record not found: ${paymentId}`);
      }

      const pDoc = snap.docs[0];
      const data = pDoc.data() as PaymentRecord;

      let status: PaymentRecord['status'] = data.status;
      if (data.status !== 'Paid' && data.status !== 'Cancelled') {
        status = new Date(newDueDate).getTime() < Date.now() ? 'Overdue' : 'Pending';
      }

      const historyLog = {
        timestamp: new Date().toISOString(),
        action: 'Due Date Updated',
        details: `Due date rescheduled from ${data.dueDate} to ${newDueDate}.`,
        operator
      };

      const updatedHistory = [...(data.history || []), historyLog];

      await updateDoc(pDoc.ref, {
        dueDate: newDueDate,
        status,
        history: updatedHistory,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (err) {
      console.error('[PaymentService] Error updating due date:', err);
      throw err;
    }
  }

  /**
   * Cancel payment invoice
   */
  public static async cancelPayment(paymentId: string, operator: string) {
    try {
      const q = query(collection(db, 'payments'), where('paymentId', '==', paymentId));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`Payment record not found: ${paymentId}`);
      }

      const pDoc = snap.docs[0];
      const data = pDoc.data() as PaymentRecord;

      const historyLog = {
        timestamp: new Date().toISOString(),
        action: 'Payment Cancelled',
        details: `Invoice was officially cancelled.`,
        operator
      };

      const updatedHistory = [...(data.history || []), historyLog];

      await updateDoc(pDoc.ref, {
        status: 'Cancelled',
        pendingAmount: 0,
        history: updatedHistory,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (err) {
      console.error('[PaymentService] Error cancelling payment:', err);
      throw err;
    }
  }

  /**
   * Send payment reminder (triggers notification, Resend email if configured, and generates due alerts)
   */
  public static async sendReminder(paymentId: string, operator: string) {
    try {
      const q = query(collection(db, 'payments'), where('paymentId', '==', paymentId));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`Payment record not found: ${paymentId}`);
      }

      const pDoc = snap.docs[0];
      const data = pDoc.data() as PaymentRecord;

      const historyLog = {
        timestamp: new Date().toISOString(),
        action: 'Reminder Dispatched',
        details: `Sent payment reminder to ${data.userEmail} via Resend and Operational Inbox.`,
        operator
      };

      const updatedHistory = [...(data.history || []), historyLog];

      await updateDoc(pDoc.ref, {
        history: updatedHistory,
        updatedAt: new Date().toISOString()
      });

      // Generate real-time admin alert
      await AlertService.createAlert({
        type: 'payment_due',
        title: `Reminder Sent: ${data.userName}`,
        description: `Dispatched payment reminder to ${data.userName} for ₹${data.pendingAmount.toLocaleString()} pending amount.`,
        severity: 'Information',
        userId: data.userId,
        source: 'Payment Engine',
        metadata: { paymentId, pendingAmount: data.pendingAmount, recipient: data.userEmail }
      });

      // Deliver in-app notification to client
      await this.addUserNotification(data.userId, {
        title: '⚠️ Payment Reminder Notice',
        message: `This is a reminder that you have a pending payment of ₹${data.pendingAmount.toLocaleString()} due on ${data.dueDate}. Please settle as soon as possible.`,
        type: 'reminder'
      });

      // Optionally invoke server-side Resend microservice
      try {
        await fetch('/api/send-monthly-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.userEmail,
            month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            currentBalance: data.pendingAmount,
            incomeThisMonth: 0,
            highestPaymentReceived: 0,
            numberOfIncomeTransactions: 0,
            aiSummary: `URGENT PAYMENT REMINDER: Dear ${data.userName}, this is an automated dispatch from the SmartLedgerX billing engine. You have a pending invoice (${paymentId}) with an outstanding balance of ₹${data.pendingAmount.toLocaleString()} due on ${data.dueDate}. Please arrange immediate settlement.`
          })
        });
      } catch (emailErr) {
        console.warn('[PaymentService] Background email notice (sandbox mode limit):', emailErr);
      }

      return { success: true };
    } catch (err) {
      console.error('[PaymentService] Error sending reminder:', err);
      throw err;
    }
  }

  /**
   * Mark paid directly (full settlement)
   */
  public static async markPaid(paymentId: string, operator: string) {
    try {
      const q = query(collection(db, 'payments'), where('paymentId', '==', paymentId));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`Payment record not found: ${paymentId}`);
      }

      const pDoc = snap.docs[0];
      const data = pDoc.data() as PaymentRecord;
      const outstanding = Number(data.pendingAmount);

      return await this.recordPayment(paymentId, outstanding, 'Manual Balance Adjustment', 'Marked fully paid by administrator.', operator);
    } catch (err) {
      console.error('[PaymentService] Error marking paid:', err);
      throw err;
    }
  }
}
