export type TransactionType = 'received' | 'pending' | 'sent';

export interface ReceivedMoney {
  id: string;
  type: 'received';
  personName: string;
  amount: number;
  date: string;
  purpose: string;
  invoiceNumber?: string;
}

export interface SentMoney {
  id: string;
  type: 'sent';
  personName: string;
  amount: number;
  date: string;
  purpose: string;
  invoiceNumber?: string;
}

export interface PendingMoney {
  id: string;
  type: 'pending';
  personName: string;
  phoneNumber?: string;
  email?: string;
  amount: number;
  reason: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled' | 'closed';
  reminderFrequency: 'once' | '3days' | '7days' | '15days' | 'monthly';
  nextReminderDate: string;
  reminderStatus: 'active' | 'paused';
  penaltyEnabled?: boolean;
  penaltyType?: 'fixed' | 'percent_day' | 'percent_week' | 'percent_month';
  penaltyValue?: number;
  gracePeriod?: number; // in days
  aiTone?: 'friendly' | 'professional' | 'strict' | 'formal';
}

export type Transaction = ReceivedMoney | PendingMoney | SentMoney;

export interface RegisteredDevice {
  id: string; // The credential ID
  name: string; // Friendly name (e.g. "Windows Hello", "iPhone")
  publicKey: Uint8Array;
  addedAt: string;
  lastUsedAt: string | null;
  transports?: AuthenticatorTransport[];
}

export interface SecuritySettings {
  pinEnabled: boolean;
  pin: string | null;
  biometricEnabled: boolean;
  faceUnlockEnabled: boolean;
  autoLockTime: number; // in minutes
  registeredDevices: RegisteredDevice[];
  adminPasswordHash?: string;
}

export interface EmailSettings {
  enabled: boolean;
  emailAddress: string;
  verificationStatus?: 'verified' | 'pending' | 'invalid' | 'none';
  lastReportSent: string | null;
  nextScheduledReport: string | null;
}

export interface ReportSchedule {
  frequency: 'monthly' | 'weekly' | 'daily' | 'custom';
  customDay?: number;
  time: string; // HH:MM
  timezone: string;
}

export interface ReportSettings {
  emailAddress: string;
  verificationStatus: 'verified' | 'pending' | 'invalid' | 'none';
  schedule: ReportSchedule;
  includePdf: boolean;
}

export interface EmailHistoryLog {
  id: string;
  date: string;
  month: string;
  recipient: string;
  status: 'success' | 'failed';
  fileSizeXlsx?: number;
  fileSizePdf?: number;
  type?: 'monthly_report' | 'test_report' | 'simple_summary';
}

export interface GeneratedReport extends EmailHistoryLog {
  xlsxUrl?: string;
  pdfUrl?: string;
  aiSummary?: string;
  downloadCount?: number;
}

export interface GeneralSettings {
  timezone: string;
}

export interface AiRecognitionSettings {
  enabled: boolean;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'manual';
  enablePhoto: boolean;
  enableAiMessage: boolean;
  whatsappDelivery: 'auto' | 'ask' | 'download_only';
  theme: 'luxury_gold' | 'premium_blue' | 'executive_black' | 'royal_purple';
  orientation: 'portrait' | 'square' | 'landscape';
}

export interface AiRecognitionHistory {
  id: string;
  customerName: string;
  awardTitle: string;
  date: string;
  deliveryStatus: 'sent' | 'pending' | 'downloaded';
  posterUrl?: string;
}

export interface PlaceholderStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  isBold: boolean;
  alignment: 'left' | 'center' | 'right';
  borderRadius: number;
  opacity: number;
}

export type PlaceholderType = 'CustomerPhoto' | 'CustomerName' | 'AwardTitle' | 'TotalPaid' | 'TrustScore' | 'LifetimeValue' | 'LastPaymentDate' | 'AiMessage' | 'GeneratedDate' | 'CompanyLogo' | 'QRCode';

export interface PosterPlaceholder {
  id: string;
  type: PlaceholderType;
  style: PlaceholderStyle;
}

export interface PosterTemplate {
  id: string;
  name: string;
  imageUrl: string;
  isDefault: boolean;
  placeholders: PosterPlaceholder[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  createdAt: string;
}

export interface SecurityLog {
  id: string;
  eventType: 'login' | 'logout' | 'device_added' | 'device_removed' | 'password_change' | 'pin_change';
  deviceInfo: string;
  location: string;
  timestamp: string;
}

export interface AutomationRule {
  id: string;
  enabled: boolean;
  trigger: 'salary_received' | 'food_limit_exceeded' | 'payment_due';
  triggerValue: number;
  action: 'move_to_savings' | 'send_warning' | 'send_reminder';
  actionTarget: string;
}

export interface Investment {
  id: string;
  name: string;
  type: 'stock' | 'mutual_fund' | 'fixed_deposit' | 'gold' | 'other';
  currentValue: number;
  investedAmount: number;
  growthPercentage: number;
}

export interface FinanceHabit {
  id: string;
  name: string;
  streak: number;
  lastTrackedDate: string;
  totalTrackedDays: number;
}

export interface GullakEntry {
  id: string;
  personName: string;
  amount: number;
  date: string;
  time: string;
  paymentMethod: string;
  category: string;
  note: string;
  receiptImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GullakSettings {
  monthlyGoal: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
  xpEarned: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface ReminderHistoryLog {
  id: string;
  transactionId: string;
  customerName: string;
  amount: number;
  dateTime: string;
  sentVia: 'WhatsApp' | 'Email' | 'Manual';
  reminderCount: number;
  nextReminderDate: string | null;
}

export interface ReminderDetails {
  remindersSent: number;
  totalReminders: number;
  nextReminderDate: string | null;
  nextReminderDisplay: string;
  lastSentDisplay?: string;
  isStopped: boolean;
}

export type DataLoadStatus = 'loading' | 'success' | 'error';

export interface BackupSettings {
  autoBackupEnabled: boolean;
  frequency: '12h' | '24h' | '7d';
  retention: '10' | '25' | '30' | 'unlimited';
  backupOnLogin: boolean;
  backupBeforeLogout: boolean;
  lastAutoBackupTime?: string;
  lastBackupTime?: string;
  nextBackupTime?: string;
  lastBackupStatus?: 'healthy' | 'warning' | 'error' | 'in-progress';
  backupHealth?: string;
  lastError?: string | null;
  lastBackupSize?: number;
  lastBackupChecksum?: string;
  lastBackupLocation?: string;
}

export type BackupType = 'manual' | 'automatic' | 'pre-restore' | 'on-login' | 'on-logout' | 'daily';

export type BackupProgressStage = 'idle' | 'preparing' | 'encrypting' | 'uploading' | 'verifying' | 'completed' | 'failed';

export interface BackupItemCounts {
  transactions: number;
  customers: number;
  savingsGoals: number;
  gullakEntries: number;
  investments: number;
  reports: number;
}

export interface BackupMetadata {
  id: string;
  backupId?: string;
  name: string;
  fileName: string;
  createdAt: string;
  fileSize: number;
  size: number;
  status: 'verified' | 'failed' | 'pending' | 'restored';
  version: string;
  appVersion?: string;
  encryptionVersion?: string;
  device?: string;
  restoreVersion?: string;
  type: BackupType;
  checksum: string;
  checksumSha256: string;
  encryptionIv?: string;
  itemCounts?: BackupItemCounts;
  storagePath?: string;
  userId?: string;
  compressed?: boolean;
  lastRestoredAt?: string;
}

export interface AppState {
  isSetupComplete: boolean;
  startingBalance: number;
  customers: Customer[];
  transactions: Transaction[];
  gullakEntries: GullakEntry[];
  savingsGoals: SavingsGoal[];
  securityLogs: SecurityLog[];
  automationRules: AutomationRule[];
  investments: Investment[];
  financeHabits: FinanceHabit[];
  gullakSettings: GullakSettings;
  securitySettings: SecuritySettings;
  emailSettings: EmailSettings;
  emailHistory: EmailHistoryLog[];
  reportSettings?: ReportSettings;
  generatedReports?: GeneratedReport[];
  generalSettings: GeneralSettings;
  unlockedAchievements?: UnlockedAchievement[];
  aiRecognitionSettings?: AiRecognitionSettings;
  aiRecognitionHistory?: AiRecognitionHistory[];
  posterTemplates?: PosterTemplate[];
  userProfile?: UserProfile;
  reminderHistory?: ReminderHistoryLog[];
  customReminderTemplate?: string;
  backupSettings?: BackupSettings;
}



export interface UserProfile {
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  country: string;
  language: string;
  memberSince: string;
  profilePhoto: string;
  
  businessName: string;
  businessCategory: string;
  gstNumber: string;
  upiId: string;
  businessAddress: string;
  website: string;
  businessLogo: string;
  
  verifiedEmail: boolean;
  verifiedPhone: boolean;
  lastLogin: string;
  activeDevice: string;
}

export type NotificationType =
  | 'auth_google_login'
  | 'auth_google_logout'
  | 'auth_pin_changed'
  | 'auth_pin_reset'
  | 'auth_profile_updated'
  | 'ledger_transaction_added'
  | 'ledger_transaction_edited'
  | 'ledger_transaction_deleted'
  | 'ledger_income_added'
  | 'ledger_expense_added'
  | 'pending_created'
  | 'pending_updated'
  | 'pending_paid'
  | 'pending_reminder_sent'
  | 'report_generated'
  | 'report_export_completed'
  | 'report_import_completed'
  | 'security_new_device'
  | 'security_session_expired'
  | 'security_password_changed'
  | 'security_unauthorized_access'
  | 'security_settings_updated'
  | 'admin_user_created'
  | 'admin_user_deleted'
  | 'admin_user_blocked'
  | 'admin_user_restored'
  | 'admin_db_backup'
  | 'admin_db_restore';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  userId: string;
  referenceId?: string;
}

