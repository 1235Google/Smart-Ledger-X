import { GullakEntry } from '../types';

export type GullakDirection = 'credit' | 'debit';
export type GullakOperation = 'allocation' | 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';

/**
 * Resolves the accounting direction for a Gullak vault entry.
 * 
 * Account Perspective: Gullak Digital Vault
 * - Credit: Money added/allocated into Gullak (Vault balance increases, displayed as +₹Amount in success color)
 * - Debit: Money withdrawn/transferred out of Gullak (Vault balance decreases, displayed as -₹Amount in danger color)
 */
export function getGullakEntryDirection(entry: Partial<GullakEntry> | any): GullakDirection {
  if (!entry) return 'credit';

  // 1. Explicit direction field
  if (entry.direction === 'debit') return 'debit';
  if (entry.direction === 'credit') return 'credit';

  // 2. Explicit operation field
  const op = String(entry.operation || '').toLowerCase().trim();
  if (['withdrawal', 'withdraw', 'transfer_out', 'debit', 'deduction', 'payout'].includes(op)) {
    return 'debit';
  }
  if (['allocation', 'deposit', 'transfer_in', 'credit', 'save', 'savings', 'add'].includes(op)) {
    return 'credit';
  }

  // 3. Category field inspection (case-insensitive)
  const cat = String(entry.category || '').toLowerCase().trim();
  if (['withdrawal', 'withdraw', 'transfer_out', 'debit', 'expense'].includes(cat)) {
    return 'debit';
  }
  if ([
    'savings', 
    'emergency', 
    'investment', 
    'goal', 
    'other', 
    'deposit', 
    'transfer_in', 
    'allocation', 
    'credit',
    'vault'
  ].includes(cat)) {
    return 'credit';
  }

  // 4. Type field inspection
  const typ = String(entry.type || '').toLowerCase().trim();
  if (['withdrawal', 'withdraw', 'debit', 'transfer_out'].includes(typ)) {
    return 'debit';
  }
  if (['savings', 'deposit', 'credit', 'transfer_in', 'allocation'].includes(typ)) {
    return 'credit';
  }

  // 5. Note / Purpose keyword inspection for legacy entries
  const note = String(entry.note || '').toLowerCase().trim();
  if (note.includes('withdraw') || note.includes('transfer out') || note.includes('debit') || note.includes('deduct')) {
    return 'debit';
  }
  if (note.includes('allocation') || note.includes('deposit') || note.includes('saved') || note.includes('credit')) {
    return 'credit';
  }

  // Default: In Gullak vault, savings entries are deposits/allocations into the vault (Credit)
  return 'credit';
}

/**
 * Returns the absolute numerical value of the entry amount, guarding against NaN and negative values.
 */
export function getGullakAbsoluteAmount(entry: Partial<GullakEntry> | number | undefined | null): number {
  if (typeof entry === 'number') {
    return Math.abs(isNaN(entry) ? 0 : entry);
  }
  const amt = Number(entry?.amount);
  return Math.abs(isNaN(amt) ? 0 : amt);
}

/**
 * Returns signed amount from the Gullak vault perspective (+ for credits/allocations, - for debits/withdrawals)
 */
export function getGullakSignedAmount(entry: Partial<GullakEntry> | any): number {
  const abs = getGullakAbsoluteAmount(entry);
  const dir = getGullakEntryDirection(entry);
  return dir === 'credit' ? abs : -abs;
}

/**
 * Computes the net Gullak vault balance accurately by summing credits and subtracting debits.
 */
export function calculateGullakBalance(entries: (GullakEntry | any)[]): number {
  if (!Array.isArray(entries)) return 0;
  return entries.reduce((acc, curr) => {
    return acc + getGullakSignedAmount(curr);
  }, 0);
}

/**
 * Provides comprehensive UI presentation properties strictly respecting accounting direction.
 */
export function formatGullakLedgerDisplay(entry: GullakEntry, isDark: boolean) {
  const direction = getGullakEntryDirection(entry);
  const isCredit = direction === 'credit';
  const absAmount = getGullakAbsoluteAmount(entry);

  const prefix = isCredit ? '+' : '-';
  const formattedAmount = `${prefix}₹${absAmount.toLocaleString('en-IN')}`;

  // Type label: e.g. "SAVINGS", "DEPOSIT", "WITHDRAWAL"
  const rawType = entry.type || entry.category || (isCredit ? 'savings' : 'withdrawal');
  const typeLabel = rawType.toUpperCase();

  // Operation label: e.g. "Gullak Allocation", "Vault Withdrawal"
  let operationLabel = 'Gullak Allocation';
  if (entry.operation) {
    if (entry.operation.toLowerCase() === 'allocation') {
      operationLabel = 'Gullak Allocation';
    } else if (entry.operation.toLowerCase() === 'withdrawal') {
      operationLabel = 'Vault Withdrawal';
    } else {
      operationLabel = entry.operation.charAt(0).toUpperCase() + entry.operation.slice(1).replace('_', ' ');
    }
  } else if (entry.note) {
    operationLabel = entry.note;
  } else {
    operationLabel = isCredit ? 'Gullak Allocation' : 'Vault Withdrawal';
  }

  // Material Design 3 and VisionOS token pairings
  const amountColor = isCredit 
    ? (isDark ? 'text-[#6dd58c]' : 'text-[#137333]') 
    : (isDark ? 'text-[#f2b8b5]' : 'text-[#c5221f]');

  const iconBg = isCredit
    ? (isDark ? 'bg-[#0f5223] text-[#b4f3b8]' : 'bg-[#c4eed0] text-[#073814]')
    : (isDark ? 'bg-[#601410] text-[#f9dedc]' : 'bg-[#f9dedc] text-[#410e0b]');

  const badgeClass = isCredit
    ? (isDark ? 'bg-[#0f5223]/50 text-[#85e197]' : 'bg-[#e6f4ea] text-[#137333]')
    : (isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]');

  const directionTagClass = isCredit
    ? (isDark ? 'text-[#85e197]/80' : 'text-[#137333]/80')
    : (isDark ? 'text-[#f2b8b5]/80' : 'text-[#c5221f]/80');

  return {
    direction,
    isCredit,
    absAmount,
    prefix,
    formattedAmount,
    typeLabel,
    operationLabel,
    amountColor,
    iconBg,
    badgeClass,
    directionTagClass,
  };
}
