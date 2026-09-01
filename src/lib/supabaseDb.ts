import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Transaction, 
  Customer, 
  SavingsGoal, 
  GullakEntry, 
  Investment, 
  Bill, 
  UserProfile, 
  BackupMetadata, 
  AppState 
} from '../types';

/**
 * ============================================================================
 * SUPABASE DATABASE QUERIES & OBJECT-RELATIONAL MAPPERS (ORM) FOR SMART LEDGER
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. TRANSACTION MAPPERS & QUERIES
// ----------------------------------------------------------------------------

export interface SupabaseTransactionRow {
  id: string;
  user_id: string;
  type: 'received' | 'pending' | 'sent' | 'income' | 'expense';
  amount: number;
  category?: string | null;
  note?: string | null;
  date?: string | null;
  created_at?: string;
  person_name?: string | null;
  purpose?: string | null;
  invoice_number?: string | null;
  phone_number?: string | null;
  email?: string | null;
  reason?: string | null;
  due_date?: string | null;
  status?: string | null;
  reminder_frequency?: string | null;
  next_reminder_date?: string | null;
  reminder_status?: string | null;
  penalty_enabled?: boolean | null;
  penalty_type?: string | null;
  penalty_value?: number | null;
  grace_period?: number | null;
  ai_tone?: string | null;
  raw_data?: any | null;
  updated_at?: string;
}

export function mapTransactionToRow(tx: Transaction, userId: string): SupabaseTransactionRow {
  const isPending = tx.type === 'pending';
  const pTx = tx as any;

  // Resolve category and note
  const category = (tx as any).category || (tx as any).purpose || (tx.type === 'received' ? 'Income' : tx.type === 'sent' ? 'Expense' : 'Pending');
  const note = (tx as any).note || (tx as any).purpose || (tx as any).reason || '';

  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    amount: Number(tx.amount) || 0,
    category: category || null,
    note: note || null,
    date: (tx as any).date || (tx as any).dueDate || new Date().toISOString().split('T')[0],
    created_at: (tx as any).createdAt || (tx as any).date || new Date().toISOString(),
    person_name: tx.personName || '',
    purpose: (tx as any).purpose || null,
    invoice_number: (tx as any).invoiceNumber || null,
    phone_number: isPending ? pTx.phoneNumber || null : null,
    email: isPending ? pTx.email || null : null,
    reason: isPending ? pTx.reason || null : null,
    due_date: isPending ? pTx.dueDate || null : null,
    status: isPending ? pTx.status || 'pending' : 'completed',
    reminder_frequency: isPending ? pTx.reminderFrequency || 'once' : null,
    next_reminder_date: isPending ? pTx.nextReminderDate || null : null,
    reminder_status: isPending ? pTx.reminderStatus || 'active' : null,
    penalty_enabled: isPending ? Boolean(pTx.penaltyEnabled) : null,
    penalty_type: isPending ? pTx.penaltyType || null : null,
    penalty_value: isPending ? Number(pTx.penaltyValue || 0) : null,
    grace_period: isPending ? Number(pTx.gracePeriod || 0) : null,
    ai_tone: isPending ? pTx.aiTone || null : null,
    raw_data: tx,
    updated_at: new Date().toISOString(),
  };
}

export function mapRowToTransaction(row: SupabaseTransactionRow): Transaction {
  if (row.raw_data && typeof row.raw_data === 'object' && row.raw_data.id) {
    return row.raw_data as Transaction;
  }

  if (row.type === 'pending') {
    return {
      id: row.id,
      type: 'pending',
      personName: row.person_name || 'Unknown',
      amount: Number(row.amount) || 0,
      phoneNumber: row.phone_number || undefined,
      email: row.email || undefined,
      reason: row.reason || row.note || '',
      dueDate: row.due_date || row.date || new Date().toISOString().split('T')[0],
      status: (row.status as any) || 'pending',
      reminderFrequency: (row.reminder_frequency as any) || 'once',
      nextReminderDate: row.next_reminder_date || row.due_date || row.date || new Date().toISOString().split('T')[0],
      reminderStatus: (row.reminder_status as any) || 'active',
      penaltyEnabled: row.penalty_enabled ?? undefined,
      penaltyType: (row.penalty_type as any) ?? undefined,
      penaltyValue: row.penalty_value ?? undefined,
      gracePeriod: row.grace_period ?? undefined,
      aiTone: (row.ai_tone as any) ?? undefined,
    };
  }

  if (row.type === 'sent' || row.type === 'expense') {
    return {
      id: row.id,
      type: 'sent',
      personName: row.person_name || 'Expense',
      amount: Number(row.amount) || 0,
      date: row.date || new Date().toISOString().split('T')[0],
      purpose: row.purpose || row.note || row.category || '',
      invoiceNumber: row.invoice_number || undefined,
    };
  }

  // Default: received / income
  return {
    id: row.id,
    type: 'received',
    personName: row.person_name || 'Income',
    amount: Number(row.amount) || 0,
    date: row.date || new Date().toISOString().split('T')[0],
    purpose: row.purpose || row.note || row.category || '',
    invoiceNumber: row.invoice_number || undefined,
  };
}

/**
 * Upsert a single transaction to Supabase
 */
export async function upsertTransactionToSupabase(tx: Transaction, userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !userId || !tx?.id) return { success: false };
  try {
    const row = mapTransactionToRow(tx, userId);
    const { error } = await supabase
      .from('transactions')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase DB] upsertTransaction error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase DB] upsertTransaction exception:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Batch upsert an array of transactions to Supabase
 */
export async function batchUpsertTransactionsToSupabase(txs: Transaction[], userId: string): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isSupabaseConfigured() || !userId || !txs.length) return { success: false, count: 0 };
  try {
    const rows = txs.filter((t) => t && t.id).map((t) => mapTransactionToRow(t, userId));
    const CHUNK_SIZE = 100;
    let successCount = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('transactions')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.warn(`[Supabase DB] batchUpsert chunk [${i}..${i + chunk.length}] error:`, error.message);
      } else {
        successCount += chunk.length;
      }
    }

    console.log(`[Supabase DB] Batch upserted ${successCount}/${rows.length} transactions for user ${userId}`);
    return { success: successCount > 0, count: successCount };
  } catch (err: any) {
    console.warn('[Supabase DB] batchUpsert exception:', err);
    return { success: false, count: 0, error: err?.message };
  }
}

/**
 * Delete a transaction from Supabase
 */
export async function deleteTransactionFromSupabase(txId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !userId || !txId) return { success: false };
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase DB] deleteTransaction error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase DB] deleteTransaction exception:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch all transactions for a user from Supabase
 */
export async function fetchTransactionsFromSupabase(userId: string): Promise<Transaction[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.warn('[Supabase DB] fetchTransactions error:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];
    return data.map((row: SupabaseTransactionRow) => mapRowToTransaction(row));
  } catch (err) {
    console.warn('[Supabase DB] fetchTransactions exception:', err);
    return [];
  }
}

/**
 * Search transactions in Supabase by keyword and filters
 */
export async function searchTransactionsInSupabase(
  userId: string,
  query?: string,
  options?: {
    type?: 'received' | 'pending' | 'sent';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<Transaction[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    let q = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId);

    if (options?.type) {
      q = q.eq('type', options.type);
    }
    if (options?.startDate) {
      q = q.gte('date', options.startDate);
    }
    if (options?.endDate) {
      q = q.lte('date', options.endDate);
    }
    if (query && query.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`person_name.ilike.${term},purpose.ilike.${term},reason.ilike.${term},category.ilike.${term},note.ilike.${term}`);
    }

    q = q.order('date', { ascending: false });
    if (options?.limit) {
      q = q.limit(options.limit);
    }

    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((row: SupabaseTransactionRow) => mapRowToTransaction(row));
  } catch (e) {
    console.warn('[Supabase DB] searchTransactions error:', e);
    return [];
  }
}


// ----------------------------------------------------------------------------
// 2. CUSTOMER QUERIES
// ----------------------------------------------------------------------------

export async function upsertCustomerToSupabase(customer: Customer, userId: string): Promise<{ success: boolean }> {
  if (!isSupabaseConfigured() || !userId || !customer?.id) return { success: false };
  try {
    const row = {
      id: customer.id,
      user_id: userId,
      name: customer.name,
      phone: customer.phone || null,
      email: customer.email || null,
      photo_url: customer.photoUrl || null,
      created_at: customer.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('customers').upsert(row, { onConflict: 'id' });
    return { success: !error };
  } catch {
    return { success: false };
  }
}

export async function deleteCustomerFromSupabase(customerId: string, userId: string): Promise<{ success: boolean }> {
  if (!isSupabaseConfigured() || !userId || !customerId) return { success: false };
  try {
    const { error } = await supabase.from('customers').delete().eq('id', customerId).eq('user_id', userId);
    return { success: !error };
  } catch {
    return { success: false };
  }
}

export async function fetchCustomersFromSupabase(userId: string): Promise<Customer[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase.from('customers').select('*').eq('user_id', userId);
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      phone: d.phone || undefined,
      email: d.email || undefined,
      photoUrl: d.photo_url || undefined,
      createdAt: d.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// 3. SAVINGS GOALS & BUDGETS & GULLAK & INVESTMENTS & BILLS
// ----------------------------------------------------------------------------

export interface SupabaseBudget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  period?: string;
  spent_amount?: number;
  raw_data?: any;
  created_at?: string;
  updated_at?: string;
}

export async function upsertBudgetToSupabase(budget: { id: string; category: string; monthlyLimit: number; period?: string; spentAmount?: number }, userId: string): Promise<{ success: boolean }> {
  if (!isSupabaseConfigured() || !userId || !budget?.id) return { success: false };
  try {
    const { error } = await supabase.from('budgets').upsert({
      id: budget.id,
      user_id: userId,
      category: budget.category,
      monthly_limit: Number(budget.monthlyLimit) || 0,
      period: budget.period || 'monthly',
      spent_amount: Number(budget.spentAmount) || 0,
      raw_data: budget,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    return { success: !error };
  } catch {
    return { success: false };
  }
}

export async function fetchBudgetsFromSupabase(userId: string): Promise<SupabaseBudget[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase.from('budgets').select('*').eq('user_id', userId);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function deleteBudgetFromSupabase(budgetId: string, userId: string): Promise<{ success: boolean }> {
  if (!isSupabaseConfigured() || !userId || !budgetId) return { success: false };
  try {
    const { error } = await supabase.from('budgets').delete().eq('id', budgetId).eq('user_id', userId);
    return { success: !error };
  } catch {
    return { success: false };
  }
}

export async function upsertSavingsGoalToSupabase(goal: SavingsGoal, userId: string) {
  if (!isSupabaseConfigured() || !userId || !goal?.id) return;
  try {
    const row = {
      id: goal.id,
      user_id: userId,
      name: goal.name,
      target_amount: Number(goal.targetAmount) || 0,
      saved_amount: Number(goal.savedAmount) || 0,
      deadline: goal.deadline || null,
      raw_data: goal,
      created_at: goal.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Sync to goals and savings_goals
    await Promise.allSettled([
      supabase.from('goals').upsert(row, { onConflict: 'id' }),
      supabase.from('savings_goals').upsert(row, { onConflict: 'id' }),
    ]);
  } catch {}
}

export async function fetchGoalsFromSupabase(userId: string): Promise<SavingsGoal[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data: gData } = await supabase.from('goals').select('*').eq('user_id', userId);
    if (gData && gData.length > 0) {
      return gData.map((d: any) => ({
        id: d.id,
        name: d.name,
        targetAmount: Number(d.target_amount) || 0,
        savedAmount: Number(d.saved_amount) || 0,
        deadline: d.deadline || '',
        createdAt: d.created_at || new Date().toISOString(),
      }));
    }
    const { data: sgData } = await supabase.from('savings_goals').select('*').eq('user_id', userId);
    if (sgData && sgData.length > 0) {
      return sgData.map((d: any) => ({
        id: d.id,
        name: d.name,
        targetAmount: Number(d.target_amount) || 0,
        savedAmount: Number(d.saved_amount) || 0,
        deadline: d.deadline || '',
        createdAt: d.created_at || new Date().toISOString(),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function deleteGoalFromSupabase(goalId: string, userId: string): Promise<{ success: boolean }> {
  if (!isSupabaseConfigured() || !userId || !goalId) return { success: false };
  try {
    await Promise.allSettled([
      supabase.from('goals').delete().eq('id', goalId).eq('user_id', userId),
      supabase.from('savings_goals').delete().eq('id', goalId).eq('user_id', userId),
    ]);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function upsertGullakEntryToSupabase(entry: GullakEntry, userId: string) {
  if (!isSupabaseConfigured() || !userId) return;
  try {
    await supabase.from('gullak_entries').upsert({
      id: entry.id,
      user_id: userId,
      person_name: entry.personName,
      amount: entry.amount,
      date: entry.date,
      time: entry.time,
      payment_method: entry.paymentMethod,
      category: entry.category,
      note: entry.note,
      receipt_image: entry.receiptImage || null,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    }, { onConflict: 'id' });
  } catch {}
}

export async function upsertInvestmentToSupabase(inv: Investment, userId: string) {
  if (!isSupabaseConfigured() || !userId) return;
  try {
    await supabase.from('investments').upsert({
      id: inv.id,
      user_id: userId,
      name: inv.name,
      type: inv.type,
      current_value: inv.currentValue,
      invested_amount: inv.investedAmount,
      growth_percentage: inv.growthPercentage,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch {}
}

export async function upsertBillToSupabase(bill: Bill, userId: string) {
  if (!isSupabaseConfigured() || !userId) return;
  try {
    await supabase.from('bills').upsert({
      id: bill.id,
      user_id: userId,
      name: bill.name,
      amount: bill.amount,
      due_date: bill.dueDate,
      category: bill.category,
      frequency: bill.frequency,
      is_paid: bill.isPaid,
      paid_at: bill.paidAt || null,
      notes: bill.notes || null,
      created_at: bill.createdAt,
      updated_at: bill.updatedAt,
    }, { onConflict: 'id' });
  } catch {}
}

// ----------------------------------------------------------------------------
// 4. USER PROFILE & APP STATE
// ----------------------------------------------------------------------------

export async function upsertUserProfileToSupabase(profile: Partial<UserProfile>, userId: string) {
  if (!isSupabaseConfigured() || !userId) return;
  try {
    const payload = {
      id: userId,
      user_id: userId,
      full_name: profile.fullName || null,
      username: profile.username || null,
      email: profile.email || null,
      mobile: profile.mobile || null,
      dob: (profile as any).dob || null,
      address: (profile as any).address || null,
      city: (profile as any).city || null,
      state: (profile as any).state || null,
      business_name: profile.businessName || null,
      business_category: profile.businessCategory || null,
      gst_number: profile.gstNumber || null,
      upi_id: profile.upiId || null,
      business_address: profile.businessAddress || null,
      website: (profile as any).website || null,
      profile_photo: profile.profilePhoto || null,
      raw_profile: profile,
      updated_at: new Date().toISOString(),
    };

    await Promise.allSettled([
      supabase.from('profiles').upsert(payload, { onConflict: 'id' }),
      supabase.from('user_profiles').upsert(payload, { onConflict: 'id' }),
    ]);
  } catch {}
}

export async function fetchUserProfileFromSupabase(userId: string): Promise<Partial<UserProfile> | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const { data: pData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (pData) {
      return (pData.raw_profile || {
        fullName: pData.full_name,
        email: pData.email,
        mobile: pData.mobile,
        businessName: pData.business_name,
        profilePhoto: pData.profile_photo,
      }) as Partial<UserProfile>;
    }
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return (data.raw_profile || {
      fullName: data.full_name,
      email: data.email,
      mobile: data.mobile,
      businessName: data.business_name,
      profilePhoto: data.profile_photo,
    }) as Partial<UserProfile>;
  } catch {
    return null;
  }
}


/**
 * Synchronize full application state document to Supabase `app_state` table
 */
export async function syncFullAppStateToSupabase(userId: string, state: AppState): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;
  try {
    const statePayload = { ...state };
    // Keep transactions separated in relational table to optimize space
    delete (statePayload as any).transactions;

    await supabase.from('app_state').upsert({
      id: userId,
      user_id: userId,
      starting_balance: state.startingBalance || 0,
      is_setup_complete: state.isSetupComplete ?? true,
      state_payload: statePayload,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (e) {
    console.warn('[Supabase DB] syncFullAppState warning:', e);
  }
}

/**
 * Fetch full application state from Supabase
 */
export async function fetchFullAppStateFromSupabase(userId: string): Promise<Partial<AppState> | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const { data, error } = await supabase.from('app_state').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return (data.state_payload || {}) as Partial<AppState>;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// 5. BACKUP RECORDS QUERIES
// ----------------------------------------------------------------------------

export async function saveBackupRecordToSupabase(backup: BackupMetadata, userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !userId) return { success: false };
  try {
    const row = {
      id: backup.id || backup.backupId,
      user_id: userId,
      name: backup.name || backup.fileName,
      file_name: backup.fileName,
      file_url: (backup as any).fileUrl || (backup as any).url || null,
      backup_date: backup.createdAt || new Date().toISOString(),
      backup_size: backup.fileSize || backup.size || 0,
      storage_path: backup.storagePath || `backups/${userId}/${backup.fileName}`,
      storage_bucket: 'smart-ledger-backups',
      file_size: backup.fileSize || backup.size || 0,
      records_count: backup.recordsCount || 0,
      checksum_sha256: backup.checksumSha256 || backup.checksum || '',
      encryption_iv: backup.encryptionIv || '',
      type: backup.type || 'manual',
      status: backup.status || 'verified',
      version: backup.version || backup.appVersion || '1.0.0',
      compressed: backup.compressed ?? true,
      created_at: backup.createdAt || new Date().toISOString(),
      raw_metadata: backup,
    };

    const { error } = await supabase.from('backups').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase DB] saveBackupRecord error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase DB] saveBackupRecord exception:', err);
    return { success: false, error: err?.message };
  }
}

export async function fetchBackupRecordsFromSupabase(userId: string): Promise<BackupMetadata[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((d: any) => ({
      ...(d.raw_metadata || {}),
      id: d.id,
      backupId: d.id,
      name: d.name,
      fileName: d.file_name,
      fileSize: d.file_size,
      size: d.file_size,
      recordsCount: d.records_count,
      createdAt: d.created_at,
      status: d.status,
      type: d.type,
      checksumSha256: d.checksum_sha256,
      storagePath: d.storage_path,
    }));
  } catch {
    return [];
  }
}

export async function deleteBackupRecordFromSupabase(backupId: string, userId: string): Promise<{ success: boolean }> {
  if (!isSupabaseConfigured() || !userId || !backupId) return { success: false };
  try {
    const { error } = await supabase.from('backups').delete().eq('id', backupId).eq('user_id', userId);
    return { success: !error };
  } catch {
    return { success: false };
  }
}
