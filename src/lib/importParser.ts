import Papa from 'papaparse';
import { Transaction, ReceivedMoney, SentMoney, PendingMoney } from '../types';

export interface ImportRecordError {
  rowNumber: number;
  rawRecord: any;
  reason: string;
}

export interface ProcessedImportRecord {
  rowNumber: number;
  transaction: Transaction;
  status: 'valid' | 'duplicate' | 'invalid';
  duplicateOfId?: string;
  errorReason?: string;
  rawRecord: any;
}

export interface ImportParseResult {
  totalCount: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  records: ProcessedImportRecord[];
  errors: ImportRecordError[];
  fileType: 'csv' | 'json';
  fileName: string;
}

// Normalized Key Helper
function normalizeKey(key: string): string {
  return String(key || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

// Clean and parse Amount
function parseAmount(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  let str = String(val).trim();
  if (!str) return null;
  const isNegative = str.includes('-') || (str.startsWith('(') && str.endsWith(')'));
  str = str.replace(/[^0-9.]/g, '');
  if (!str) return null;
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  return isNegative ? -num : num;
}

// Clean and parse Date
function parseDateValue(val: any): string {
  if (val === null || val === undefined || val === '') {
    return new Date().toISOString().split('T')[0];
  }
  
  const str = String(val).trim();
  if (!str) return new Date().toISOString().split('T')[0];

  // Check DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

// Clean and parse Type
function parseType(val: any): 'received' | 'sent' | 'pending' {
  if (!val) return 'received';
  const str = String(val).toLowerCase().trim();
  if (['sent', 'expense', 'debit', 'out', 'withdrawal', 'pay', 'paid'].includes(str)) {
    return 'sent';
  }
  if (['pending', 'due', 'unpaid', 'overdue', 'receivable', 'payable'].includes(str)) {
    return 'pending';
  }
  return 'received';
}

// Find matching value from raw row object using fuzzy key aliases
function getRowValue(row: Record<string, any>, aliases: string[]): any {
  if (!row || typeof row !== 'object') return undefined;

  // Direct key lookup
  for (const alias of aliases) {
    if (row[alias] !== undefined) return row[alias];
  }

  // Normalized key lookup
  const keys = Object.keys(row);
  const normalizedMap = new Map<string, string>();
  for (const k of keys) {
    normalizedMap.set(normalizeKey(k), k);
  }

  for (const alias of aliases) {
    const normAlias = normalizeKey(alias);
    if (normalizedMap.has(normAlias)) {
      const originalKey = normalizedMap.get(normAlias)!;
      return row[originalKey];
    }
  }

  // Fallback regex matching
  for (const k of keys) {
    const normK = normalizeKey(k);
    for (const alias of aliases) {
      const normA = normalizeKey(alias);
      if (normK.includes(normA) || normA.includes(normK)) {
        return row[k];
      }
    }
  }

  return undefined;
}

// Check for duplicates
function findDuplicate(
  tx: Transaction,
  existingTransactions: Transaction[]
): Transaction | undefined {
  return existingTransactions.find(existing => {
    if (tx.id && existing.id === tx.id) return true;

    const amtDiff = Math.abs(Number(existing.amount) - Number(tx.amount));
    if (amtDiff > 0.01) return false;

    const exDate = (existing as any).date || (existing as any).dueDate || '';
    const txDate = (tx as any).date || (tx as any).dueDate || '';
    if (exDate !== txDate) return false;

    const exPerson = (existing.personName || '').toLowerCase().trim();
    const txPerson = (tx.personName || '').toLowerCase().trim();
    if (exPerson && txPerson && exPerson === txPerson) return true;

    const exDesc = ((existing as any).purpose || (existing as any).reason || (existing as any).notes || '').toLowerCase().trim();
    const txDesc = ((tx as any).purpose || (tx as any).reason || (tx as any).notes || '').toLowerCase().trim();
    if (exDesc && txDesc && exDesc === txDesc) return true;

    return false;
  });
}

// Convert raw row object to Transaction model
export function mapRowToTransaction(row: Record<string, any>): { transaction?: Transaction; error?: string } {
  if (!row || typeof row !== 'object') {
    return { error: 'Empty or invalid record' };
  }

  // Raw fields lookup
  const rawAmount = getRowValue(row, ['amount', 'amt', 'value', 'price', 'sum', 'total', 'rs', 'inr', 'val']);
  const rawDate = getRowValue(row, ['date', 'transaction_date', 'transactiondate', 'trans_date', 'due_date', 'duedate', 'created_at', 'createdat', 'timestamp', 'dt']);
  const rawType = getRowValue(row, ['type', 'transaction_type', 'transactiontype', 'entry_type', 'entrytype', 'flow', 'status_type']);
  const rawPerson = getRowValue(row, ['person', 'person_name', 'personname', 'customer', 'customer_name', 'customername', 'created_by', 'createdby', 'added_by', 'addedby', 'name', 'entity', 'client', 'vendor', 'party']);
  const rawCategory = getRowValue(row, ['category', 'cat', 'purpose', 'reason', 'type_category']);
  const rawDesc = getRowValue(row, ['description', 'desc', 'notes', 'note', 'memo', 'details', 'purpose', 'reason', 'remark', 'remarks', 'comment']);
  const rawMethod = getRowValue(row, ['payment_method', 'paymentmethod', 'method', 'payment_mode', 'paymentmode', 'pay_method', 'mode']);
  const rawStatus = getRowValue(row, ['status', 'payment_status', 'paymentstatus']);
  const rawId = getRowValue(row, ['id', 'tx_id', 'transaction_id', 'uuid']);

  const amount = parseAmount(rawAmount);
  if (amount === null || isNaN(amount) || amount <= 0) {
    return { error: `Invalid or missing Amount (${rawAmount ?? 'blank'})` };
  }

  const date = parseDateValue(rawDate);
  const type = parseType(rawType);
  const personName = String(rawPerson || rawCategory || 'General Customer').trim() || 'General Customer';
  const category = String(rawCategory || (type === 'sent' ? 'Expense' : 'Sales')).trim();
  const description = String(rawDesc || category || '').trim();
  const paymentMethod = String(rawMethod || 'UPI').trim();
  const statusStr = String(rawStatus || (type === 'pending' ? 'pending' : 'completed')).toLowerCase().trim();

  const id = rawId ? String(rawId) : crypto.randomUUID();

  if (type === 'sent') {
    const tx: SentMoney = {
      id,
      amount,
      personName,
      date,
      type: 'sent',
      purpose: description || category
    };
    (tx as any).category = category;
    (tx as any).method = paymentMethod;
    return { transaction: tx };
  } else if (type === 'pending') {
    const tx: PendingMoney = {
      id,
      amount,
      personName,
      dueDate: date,
      type: 'pending',
      reason: description || category,
      status: statusStr.includes('overdue') ? 'overdue' : (statusStr.includes('paid') || statusStr.includes('completed')) ? 'completed' : 'pending',
      reminderFrequency: 'once',
      reminderStatus: 'active',
      nextReminderDate: date
    };
    return { transaction: tx };
  } else {
    const tx: ReceivedMoney = {
      id,
      amount,
      personName,
      date,
      type: 'received',
      purpose: description || category
    };
    (tx as any).category = category;
    (tx as any).method = paymentMethod;
    return { transaction: tx };
  }
}

// Master File Parser supporting CSV, XLSX, XLS, and JSON
export async function parseImportFile(
  file: File,
  existingTransactions: Transaction[],
  onProgress?: (percent: number, message: string) => void
): Promise<ImportParseResult> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  let rawRows: any[] = [];
  let detectedType: 'csv' | 'json' = 'csv';

  onProgress?.(10, 'Reading file contents...');

  if (ext === 'json' || file.type.includes('json')) {
    detectedType = 'json';
    const text = await file.text();
    let jsonParsed: any;
    try {
      jsonParsed = JSON.parse(text);
    } catch (e) {
      throw new Error('Malformed JSON file. Please check syntax.');
    }

    if (Array.isArray(jsonParsed)) {
      rawRows = jsonParsed;
    } else if (jsonParsed && typeof jsonParsed === 'object') {
      if (Array.isArray(jsonParsed.entries)) rawRows = jsonParsed.entries;
      else if (Array.isArray(jsonParsed.transactions)) rawRows = jsonParsed.transactions;
      else if (Array.isArray(jsonParsed.records)) rawRows = jsonParsed.records;
      else if (Array.isArray(jsonParsed.data)) rawRows = jsonParsed.data;
      else if (Array.isArray(jsonParsed.items)) rawRows = jsonParsed.items;
      else {
        throw new Error('JSON object does not contain an array of records (expected "entries", "transactions", "records", or "data").');
      }
    } else {
      throw new Error('Invalid JSON format.');
    }

  } else if (ext === 'csv' || file.type.includes('csv') || file.type.includes('text/plain')) {
    detectedType = 'csv';
    const text = await file.text();
    const papaRes = Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim()
    });

    if (papaRes.errors && papaRes.errors.length > 0 && papaRes.data.length === 0) {
      throw new Error(`CSV Parsing failed: ${papaRes.errors[0].message}`);
    }
    rawRows = papaRes.data;

  } else if (ext === 'xlsx' || ext === 'xls' || file.type.includes('spreadsheet') || file.type.includes('excel')) {
    throw new Error('Excel files are currently not supported due to memory constraints. Please upload CSV or JSON.');
  } else {
    // Fallback detection using text/arrayBuffer checks
    const text = await file.text();
    try {
      const jsonParsed = JSON.parse(text);
      detectedType = 'json';
      if (Array.isArray(jsonParsed)) rawRows = jsonParsed;
      else if (jsonParsed.transactions) rawRows = jsonParsed.transactions;
      else if (jsonParsed.entries) rawRows = jsonParsed.entries;
    } catch {
      // Try CSV papa parse as fallback
      const papaRes = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' });
      if (papaRes.data && papaRes.data.length > 0) {
        detectedType = 'csv';
        rawRows = papaRes.data;
      } else {
        throw new Error('Unsupported file extension and type. Please upload a CSV, or JSON file.');
      }
    }
  }

  onProgress?.(30, `Parsed ${rawRows.length} raw rows. Validating records...`);

  const totalCount = rawRows.length;
  let validCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  const records: ProcessedImportRecord[] = [];
  const errors: ImportRecordError[] = [];

  const chunkSize = 500;
  for (let i = 0; i < rawRows.length; i++) {
    if (i % chunkSize === 0) {
      const progressPct = 30 + Math.floor((i / rawRows.length) * 60);
      onProgress?.(progressPct, `Validating row ${i + 1} of ${rawRows.length}...`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const rawRow = rawRows[i];
    const rowNumber = i + 1;

    const { transaction, error } = mapRowToTransaction(rawRow);

    if (error || !transaction) {
      invalidCount++;
      const errItem: ImportRecordError = {
        rowNumber,
        rawRecord: rawRow,
        reason: error || 'Validation failed'
      };
      errors.push(errItem);
      records.push({
        rowNumber,
        transaction: {
          id: `invalid-${rowNumber}`,
          amount: 0,
          personName: 'Invalid Row',
          type: 'received',
          date: new Date().toISOString().split('T')[0]
        } as any,
        status: 'invalid',
        errorReason: error,
        rawRecord: rawRow
      });
      continue;
    }

    // Check duplicate
    const dup = findDuplicate(transaction, existingTransactions);
    if (dup) {
      duplicateCount++;
      records.push({
        rowNumber,
        transaction,
        status: 'duplicate',
        duplicateOfId: dup.id,
        rawRecord: rawRow
      });
    } else {
      validCount++;
      records.push({
        rowNumber,
        transaction,
        status: 'valid',
        rawRecord: rawRow
      });
    }
  }

  onProgress?.(100, 'Processing complete!');

  return {
    totalCount,
    validCount,
    duplicateCount,
    invalidCount,
    records,
    errors,
    fileType: detectedType,
    fileName
  };
}
