export type TransactionType = 'received' | 'pending' | 'sent';

export interface ReceivedMoney {
  id: string;
  type: 'received';
  personName: string;
  amount: number;
  date: string;
  purpose: string;
  invoiceNumber?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  purgeAfter?: string;
}

export interface SentMoney {
  id: string;
  type: 'sent';
  personName: string;
  amount: number;
  date: string;
  purpose: string;
  invoiceNumber?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  purgeAfter?: string;
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
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  purgeAfter?: string;
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
  pinLength?: 4 | 6;
  biometricEnabled: boolean;
  faceUnlockEnabled: boolean;
  autoLockTime: number; // in minutes
  inactivityTimeout?: number; // in minutes (default 30)
  autoLogoutEnabled?: boolean;
  registeredDevices: RegisteredDevice[];
  adminPasswordHash?: string;
  fallbackPassword?: string;
  appCheckEnabled?: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  deviceName: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  flagEmoji?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  screenResolution?: string;
  timestamp: string;
  status: 'Success' | 'Failed' | 'Blocked';
  method: 'Google' | 'Email' | 'PIN' | 'Biometric' | 'Password';
  failureReason?: string;
  userAgent?: string;
}

export interface UserDevice {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  deviceId: string;
  deviceName: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  flagEmoji?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  screenResolution?: string;
  lastActive: string;
  createdAt: string;
  isCurrent?: boolean;
  status: 'active' | 'revoked';
  trustStatus?: 'trusted' | 'unrecognized' | 'blocked';
  trustedAt?: string;
  trustedBy?: string;
  blockedAt?: string;
  blockedBy?: string;
  userAgent?: string;
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

export type GullakDirection = 'credit' | 'debit';
export type GullakOperation = 'allocation' | 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | string;
export type GullakType = 'savings' | 'deposit' | 'withdrawal' | string;

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
  type?: GullakType;
  operation?: GullakOperation;
  direction?: GullakDirection;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  purgeAfter?: string;
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
  notifyOnSuccess?: boolean;
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
  bills?: number;
  settings?: number;
}

export interface BackupMetadata {
  id: string;
  backupId?: string;
  name: string;
  fileName: string;
  createdAt: string;
  date?: string;
  time?: string;
  fileSize: number;
  size: number;
  durationMs?: number;
  durationFormatted?: string;
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
  recordsCount?: number;
  storagePath?: string;
  userId?: string;
  compressed?: boolean;
  lastRestoredAt?: string;
  errorMessage?: string;
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
  | 'due_payment'
  | 'bill_reminder'
  | 'backup_success'
  | 'backup_failed'
  | 'security_alert'
  | 'security_new_device'
  | 'security_pin_changed'
  | 'security_pin_reset'
  | 'security_password_changed'
  | 'security_backup_restored'
  | 'security_sync_disabled'
  | 'security_failed_login'
  | 'security_session_expired'
  | 'security_unauthorized_access'
  | 'security_settings_updated'
  | 'daily_summary'
  | 'weekly_report'
  | 'auth_google_login'
  | 'auth_google_logout'
  | 'auth_profile_updated'
  | 'auth_pin_changed'
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
  | 'admin_user_created'
  | 'admin_user_deleted'
  | 'admin_user_blocked'
  | 'admin_user_restored'
  | 'admin_db_backup'
  | 'admin_db_restore'
  | string;

export type NotificationPriority = 'high' | 'medium' | 'low';
export type NotificationCategory = 'all' | 'unread' | 'finance' | 'security' | 'backup' | 'bills';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  timestamp?: number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  priority?: NotificationPriority;
  category?: 'finance' | 'security' | 'backup' | 'bills' | 'system';
  referenceId?: string;
  eventKey?: string;
  metadata?: Record<string, any>;
}

export type BillCategory = 
  | 'utilities'
  | 'rent'
  | 'subscription'
  | 'insurance'
  | 'credit_card'
  | 'loan'
  | 'taxes'
  | 'other';

export type BillFrequency = 'once' | 'monthly' | 'quarterly' | 'yearly';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: BillCategory;
  frequency: BillFrequency;
  isPaid: boolean;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  purgeAfter?: string;
}

export interface NotificationSettings {
  duePayments: boolean;
  upcomingBills: boolean;
  backupAlerts: boolean;
  securityAlerts: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  pushEnabled: boolean;
  emailNotifications: boolean;
  emailToggles: {
    duePayments: boolean;
    upcomingBills: boolean;
    backupAlerts: boolean;
    securityAlerts: boolean;
    dailySummary: boolean;
    weeklyReport: boolean;
  };
  emailAddress?: string;
  updatedAt?: string;
}

export type AdminRole = 'Owner' | 'Super Admin' | 'Admin' | 'Manager';
export type AdminStatus = 'Active' | 'Disabled';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: string;
  lastLogin: string;
  createdById?: string;
  createdByEmail?: string;
}

export type AdminSecurityAction = 
  | 'LOGIN_SUCCESS' 
  | 'LOGIN_FAILED' 
  | 'GOOGLE_LOGIN'
  | 'PASSWORD_LOGIN'
  | 'ADMIN_LOGIN'
  | 'LOGIN_DENIED_UNAUTHORIZED' 
  | 'LOGIN_DENIED_DISABLED' 
  | 'LOGOUT' 
  | 'NEW_DEVICE_DETECTED'
  | 'SESSION_REVOKED'
  | 'JOB_MANUAL_RUN'
  | 'JOB_RETRY_RUN'
  | 'JOB_CONFIG_TOGGLE'
  | 'ADMIN_ADDED' 
  | 'ADMIN_ROLE_UPDATED' 
  | 'ADMIN_STATUS_CHANGED' 
  | 'ADMIN_REMOVED';

export interface SecurityLocationInfo {
  country: string;
  region: string;
  city: string;
  source: string;
}

export interface SecurityDeviceInfo {
  category: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  model: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  userAgent?: string;
  clientHints?: Record<string, any>;
}

export interface AdminSecurityLog {
  id: string;
  email: string;
  uid: string;
  ip: string;
  device: string;
  browser: string;
  timestamp: string;
  action: AdminSecurityAction;
  eventType?: AdminSecurityAction;
  authProvider?: 'google' | 'password' | 'other' | 'none';
  details?: string;
  location?: SecurityLocationInfo;
  deviceInfo?: SecurityDeviceInfo;
  newDevice?: boolean;
  sessionId?: string;
  authorizationResult?: 'admin' | 'user' | 'denied';
  serverTimestampMs?: number;
}

export type ScheduledJobStatus = 
  | 'HEALTHY' 
  | 'RUNNING' 
  | 'DELAYED' 
  | 'CRITICAL_DELAY' 
  | 'FAILED' 
  | 'DISABLED' 
  | 'UNKNOWN';

export type ScheduledJobTriggerType = 'SCHEDULED_CRON' | 'MANUAL_ADMIN' | 'RETRY_ADMIN';

export interface ScheduledJobRun {
  runId: string;
  jobId: string;
  jobName: string;
  startedAt: string;
  completedAt?: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  durationMs: number;
  errorCode?: string;
  errorSummary?: string;
  triggerType: ScheduledJobTriggerType;
  executionId: string;
  executedBy?: string;
  details?: Record<string, any>;
  serverTimestampMs: number;
}

export interface ScheduledJob {
  jobId: string;
  jobName: string;
  description: string;
  iconType: 'backup' | 'bell' | 'calculator' | 'camera' | 'broom' | 'shield' | 'report' | 'trash';
  scheduleCron: string;
  scheduleHuman: string;
  status: ScheduledJobStatus;
  statusMessage?: string;
  enabled: boolean;
  safeToRetry: boolean;
  safeToRunManually: boolean;
  lastRun: {
    runId: string;
    startedAt: string;
    completedAt?: string;
    status: 'SUCCESS' | 'FAILED' | 'RUNNING';
    durationMs: number;
    result: string;
    errorSummary?: string;
    triggerType: ScheduledJobTriggerType;
  } | null;
  lastSuccessfulRun: {
    runId: string;
    startedAt: string;
    completedAt?: string;
    durationMs: number;
  } | null;
  nextExpectedRun: string; // ISO string
  nextExpectedRunMs: number;
  isOverdue: boolean;
  overdueDurationMs?: number;
  recentFailureCount: number;
  estimatedDurationMs: number;
}

export interface ScheduledJobsSummary {
  totalJobs: number;
  healthyCount: number;
  runningCount: number;
  delayedCount: number;
  failedCount: number;
  disabledCount: number;
  serverTime: string;
  serverTimestampMs: number;
  schedulerActive: boolean;
  autoBackupSystem: {
    status: 'HEALTHY' | 'WARNING' | 'FAILED' | 'DISABLED';
    message: string;
    lastAttempt: string | null;
    lastSuccessfulBackup: string | null;
    nextBackup: string | null;
    backupDuration: string;
    failureCount: number;
    realBackupsFound: number;
  };
}

export type SystemMode = 'normal' | 'readonly' | 'maintenance';

export interface SystemConfig {
  mode: SystemMode;
  reason: string;
  changedAt: string;
  changedBy: string;
  expectedEndAt: string | null;
  autoRestore: boolean;
  previousMode?: SystemMode;
}

export interface SystemSafetyReport {
  databaseConnected: boolean;
  databaseLatencyMs: number;
  activeCriticalOperations: number;
  activeJobs: string[];
  backupStatus: {
    hasRecentBackup: boolean;
    lastBackupTimestamp: string | null;
    lastBackupHoursAgo: number | null;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    message: string;
  };
  safeToProceed: boolean;
  warnings: string[];
}

// --- Admin Reports Center Types ---

export type AdminReportCategory = 
  | 'system_health' 
  | 'backup' 
  | 'security' 
  | 'data_integrity' 
  | 'scheduled_jobs' 
  | 'admin_activity';

export type AdminReportDatePreset = 
  | 'today' 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'this_month' 
  | 'prev_month' 
  | 'this_year' 
  | 'custom';

export type HealthSeverity = 'healthy' | 'warning' | 'problem';

export interface ScoreDeduction {
  reason: string;
  deduction: number;
  severity: HealthSeverity;
  category: string;
}

export interface SystemHealthReportData {
  status: HealthSeverity;
  score: number; // 0 - 100 deterministic formula
  maxScore: number;
  formulaDescription: string;
  scoreBreakdown: ScoreDeduction[];
  components: {
    firestore: { status: HealthSeverity; latencyMs: number; message: string };
    auth: { status: HealthSeverity; message: string; activeAdminsCount: number };
    backup: { status: HealthSeverity; message: string; lastBackupTime: string | null; hoursAgo: number | null };
    scheduledJobs: { status: HealthSeverity; message: string; healthyCount: number; delayedCount: number; failedCount: number };
    dataIntegrity: { status: HealthSeverity; message: string; discrepancyCount: number };
    adminSecurity: { status: HealthSeverity; message: string; unauthorizedAttemptsCount: number };
  };
  warningsCount: number;
  criticalIssuesCount: number;
  generatedAt: string;
}

export interface MissingBackupDay {
  dateString: string;
  formattedDate: string;
}

export interface BackupReportData {
  totalBackupsInRange: number;
  successfulBackups: number;
  failedBackups: number;
  successRate: number;
  lastSuccessfulBackup: {
    id?: string;
    createdAt: string;
    formattedTime: string;
    sizeBytes: number;
    formattedSize: string;
    type: string;
  } | null;
  totalSizeBytes: number;
  formattedTotalSize: string;
  averageSizeBytes: number;
  formattedAverageSize: string;
  scheduledCount: number;
  manualCount: number;
  averageDurationMs: number;
  missingExpectedBackupDays: MissingBackupDay[];
  records: Array<{
    id: string;
    createdAt: string;
    name: string;
    type: string;
    status: string;
    sizeBytes: number;
    formattedSize: string;
    durationMs: number;
    sha256?: string;
    recordsCount?: number;
  }>;
}

export interface SecurityReportData {
  successfulLogins: number;
  failedAttempts: number;
  newUnrecognizedDevices: number;
  unauthorizedAdminAttempts: number;
  sessionEvents: number;
  totalEvents: number;
  uniqueIpsCount: number;
  uniqueUsersCount: number;
  geoDistribution: Array<{ location: string; count: number }>;
  deviceDistribution: Array<{ category: string; count: number }>;
  events: AdminSecurityLog[];
}

export interface DuplicateTransactionCandidate {
  id: string;
  matchId: string;
  amount: number;
  date: string;
  personName: string;
  type: string;
  reason: string;
}

export interface MissingFieldItem {
  id: string;
  date: string;
  amount: number;
  missingField: string;
  description: string;
}

export interface InvalidAmountItem {
  id: string;
  amount: any;
  date: string;
  personName: string;
  issue: string;
}

export interface BrokenReferenceItem {
  id: string;
  type: string;
  referenceField: string;
  referenceId: string;
  issue: string;
}

export interface DataIntegrityReportData {
  overallStatus: HealthSeverity;
  totalDiscrepancies: number;
  mainLedger: {
    storedBalance: number;
    calculatedBalance: number;
    inflows: number;
    outflows: number;
    pendingReceivables: number;
    discrepancyAmount: number;
    isBalanced: boolean;
  };
  gullak: {
    storedBalance: number;
    calculatedBalance: number;
    totalCredits: number;
    totalDebits: number;
    discrepancyAmount: number;
    isBalanced: boolean;
    entriesCount: number;
  };
  duplicates: DuplicateTransactionCandidate[];
  missingRequiredFields: MissingFieldItem[];
  invalidAmounts: InvalidAmountItem[];
  brokenReferences: BrokenReferenceItem[];
}

export interface ScheduledJobsReportData {
  totalJobsConfigured: number;
  totalExecutionsInRange: number;
  successExecutionsCount: number;
  failedExecutionsCount: number;
  successRate: number;
  overallHealth: HealthSeverity;
  jobSummaries: Array<{
    jobId: string;
    jobName: string;
    scheduleHuman: string;
    status: ScheduledJobStatus;
    totalRunsInRange: number;
    successRunsInRange: number;
    failedRunsInRange: number;
    averageDurationMs: number;
    lastExecutedAt: string | null;
    isOverdue: boolean;
  }>;
  recentRuns: ScheduledJobRun[];
}

export interface AdminActivityReportData {
  totalActions: number;
  modeChangesCount: number;
  backupActionsCount: number;
  jobTriggersCount: number;
  securityConfigCount: number;
  actions: Array<{
    id: string;
    action: string;
    timestamp: string;
    adminEmail: string;
    ip: string;
    device: string;
    result: 'success' | 'failed' | 'denied';
    details: string;
  }>;
}

export interface ScheduledReportConfig {
  id: string;
  name: string;
  reportType: 'weekly_system' | 'monthly_security' | 'monthly_backup';
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday
  dayOfMonth?: number; // 1 = 1st
  time: string; // "09:00"
  deliveryEmail: string;
  verifiedAdmin: boolean;
  format: 'pdf' | 'csv' | 'both';
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

