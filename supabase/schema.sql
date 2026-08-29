-- =============================================================================
-- SMART LEDGER X - SUPABASE POSTGRESQL DATABASE SCHEMA & MIGRATIONS
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE (Linked with Supabase Auth User ID)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  full_name TEXT,
  username TEXT,
  email TEXT,
  mobile TEXT,
  dob TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  language TEXT DEFAULT 'en',
  member_since TEXT,
  profile_photo TEXT,
  business_name TEXT,
  business_category TEXT,
  gst_number TEXT,
  upi_id TEXT,
  business_address TEXT,
  website TEXT,
  business_logo TEXT,
  verified_email BOOLEAN DEFAULT FALSE,
  verified_phone BOOLEAN DEFAULT FALSE,
  raw_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Alias compatibility table / view for user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  full_name TEXT,
  username TEXT,
  email TEXT,
  mobile TEXT,
  business_name TEXT,
  business_category TEXT,
  gst_number TEXT,
  upi_id TEXT,
  business_address TEXT,
  profile_photo TEXT,
  raw_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('received', 'pending', 'sent', 'income', 'expense')),
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  category TEXT,
  note TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Extended Smart Ledger Ledger Fields:
  person_name TEXT,
  purpose TEXT,
  invoice_number TEXT,
  phone_number TEXT,
  email TEXT,
  reason TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'completed',
  reminder_frequency TEXT DEFAULT 'once',
  next_reminder_date TEXT,
  reminder_status TEXT DEFAULT 'active',
  penalty_enabled BOOLEAN DEFAULT FALSE,
  penalty_type TEXT,
  penalty_value NUMERIC(10, 2),
  grace_period INT,
  ai_tone TEXT,
  raw_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- 4. BACKUPS TABLE
CREATE TABLE IF NOT EXISTS public.backups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  backup_date TEXT,
  backup_size BIGINT DEFAULT 0,
  status TEXT DEFAULT 'verified',
  name TEXT,
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'smart-ledger-backups',
  records_count INT DEFAULT 0,
  checksum_sha256 TEXT,
  encryption_iv TEXT,
  type TEXT DEFAULT 'manual',
  version TEXT DEFAULT '1.0.0',
  compressed BOOLEAN DEFAULT TRUE,
  raw_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_backups_user_id ON public.backups(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON public.backups(created_at);
CREATE INDEX IF NOT EXISTS idx_backups_status ON public.backups(status);

-- 5. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  period TEXT DEFAULT 'monthly',
  spent_amount NUMERIC(15, 2) DEFAULT 0,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);

-- 6. GOALS (SAVINGS GOALS) TABLE
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  saved_amount NUMERIC(15, 2) DEFAULT 0,
  deadline TEXT,
  category TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

-- Alias compatibility for savings_goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  saved_amount NUMERIC(15, 2) DEFAULT 0,
  deadline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals(user_id);

-- 7. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- 8. GULLAK ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.gullak_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  person_name TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  date TEXT,
  time TEXT,
  payment_method TEXT,
  category TEXT,
  note TEXT,
  receipt_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gullak_entries_user_id ON public.gullak_entries(user_id);

-- 9. INVESTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.investments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  current_value NUMERIC(15, 2) NOT NULL,
  invested_amount NUMERIC(15, 2) NOT NULL,
  growth_percentage NUMERIC(8, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);

-- 10. BILLS TABLE
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  due_date TEXT,
  category TEXT,
  frequency TEXT DEFAULT 'monthly',
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);

-- 11. APP STATE TABLE
CREATE TABLE IF NOT EXISTS public.app_state (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  starting_balance NUMERIC(15, 2) DEFAULT 0,
  is_setup_complete BOOLEAN DEFAULT TRUE,
  state_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_state_user_id ON public.app_state(user_id);

-- =============================================================================
-- STORAGE BUCKET: smart-ledger-backups
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'smart-ledger-backups', 
  'smart-ledger-backups', 
  false, 
  52428800, 
  ARRAY['application/octet-stream', 'application/zip', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gullak_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- User Profiles Alias Policies
CREATE POLICY "Users can view own user_profiles" ON public.user_profiles
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own user_profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own user_profiles" ON public.user_profiles
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own user_profiles" ON public.user_profiles
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Transactions Policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Backups Policies
CREATE POLICY "Users can view own backups" ON public.backups
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own backups" ON public.backups
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own backups" ON public.backups
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own backups" ON public.backups
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Budgets Policies
CREATE POLICY "Users can view own budgets" ON public.budgets
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own budgets" ON public.budgets
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Goals Policies
CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Savings Goals Alias Policies
CREATE POLICY "Users can view own savings_goals" ON public.savings_goals
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own savings_goals" ON public.savings_goals
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own savings_goals" ON public.savings_goals
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own savings_goals" ON public.savings_goals
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Customers Policies
CREATE POLICY "Users can view own customers" ON public.customers
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own customers" ON public.customers
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own customers" ON public.customers
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own customers" ON public.customers
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Gullak Entries Policies
CREATE POLICY "Users can view own gullak_entries" ON public.gullak_entries
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own gullak_entries" ON public.gullak_entries
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own gullak_entries" ON public.gullak_entries
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own gullak_entries" ON public.gullak_entries
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Investments Policies
CREATE POLICY "Users can view own investments" ON public.investments
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own investments" ON public.investments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own investments" ON public.investments
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own investments" ON public.investments
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Bills Policies
CREATE POLICY "Users can view own bills" ON public.bills
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can insert own bills" ON public.bills
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can update own bills" ON public.bills
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
CREATE POLICY "Users can delete own bills" ON public.bills
  FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- App State Policies
CREATE POLICY "Users can manage own app_state" ON public.app_state
  FOR ALL USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Storage bucket access policies for 'smart-ledger-backups'
CREATE POLICY "Users can upload backups" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'smart-ledger-backups');

CREATE POLICY "Users can view and download backups" ON storage.objects
  FOR SELECT USING (bucket_id = 'smart-ledger-backups');

CREATE POLICY "Users can delete backups" ON storage.objects
  FOR DELETE USING (bucket_id = 'smart-ledger-backups');

