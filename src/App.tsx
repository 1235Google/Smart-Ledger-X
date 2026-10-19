import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './components/ui/ThemeProvider';
import Layout from './components/Layout';
import SecurityWrapper from './components/SecurityWrapper';
import MaintenanceScreen from './components/MaintenanceScreen';

// Lazy load all page routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CurrentBalance = lazy(() => import('./pages/CurrentBalance'));
const MoneyReceived = lazy(() => import('./pages/MoneyReceived'));
const PendingPayments = lazy(() => import('./pages/PendingPayments'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Search = lazy(() => import('./pages/Search'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const MonthlyReports = lazy(() => import('./pages/MonthlyReports'));
const Vault = lazy(() => import('./pages/Vault'));
const Goals = lazy(() => import('./pages/Goals'));
const Gullak = lazy(() => import('./pages/Gullak'));
const ImportExport = lazy(() => import('./pages/ImportExport'));
const Calculator = lazy(() => import('./pages/Calculator'));
const TimelineReplay = lazy(() => import('./pages/TimelineReplay'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'));
const BackupDashboard = lazy(() => import('./pages/BackupDashboard'));
const SmartGuardDashboard = lazy(() => import('./components/smartguard/SmartGuardDashboard'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Help = lazy(() => import('./pages/Help'));
const About = lazy(() => import('./pages/About'));

// Lazy load admin routes
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminLedger = lazy(() => import('./pages/admin/AdminLedger'));
const AdminPending = lazy(() => import('./pages/admin/AdminPending'));
const AdminReminders = lazy(() => import('./pages/admin/AdminReminders'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminGullak = lazy(() => import('./pages/admin/AdminGullak'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminBackup = lazy(() => import('./pages/admin/AdminBackup'));
const AdminScheduledJobs = lazy(() => import('./pages/admin/AdminScheduledJobs'));
const AdminSystemMode = lazy(() => import('./pages/admin/AdminSystemMode'));
const AdminAlerts = lazy(() => import('./pages/admin/AdminAlerts'));
const AdminRecycleBin = lazy(() => import('./pages/admin/AdminRecycleBin'));
const AdminTrustedDevices = lazy(() => import('./pages/admin/AdminTrustedDevices'));
const AdminUserProfile = lazy(() => import('./pages/admin/AdminUserProfile'));

const Login = lazy(() => import('./pages/Login'));

import { getDeviceSession } from './lib/deviceAuthSession';

/**
 * Loading & Splash screen displayed while Firebase Auth restores user session
 */
function AuthLoadingScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-4 text-white select-none">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping absolute" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold tracking-wide text-neutral-200">Smart Ledger X</p>
        <p className="text-xs text-neutral-400 font-medium">{message || 'Restoring secure authentication...'}</p>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute:
 * - If authLoading === true and no remembered device session -> show loading/splash screen (never redirect prematurely)
 * - If has authenticated user or device session -> render protected content
 * - Otherwise -> redirect to /login
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, authLoading, isAuthReady, systemConfig, isAdminAuthenticated } = useStore();
  const hasDeviceSession = Boolean(getDeviceSession());
  
  if ((authLoading || !isAuthReady) && !hasDeviceSession) {
    return <AuthLoadingScreen message="Verifying authentication session..." />;
  }

  // If system is in maintenance mode and user is not an administrator, show maintenance screen
  if (systemConfig?.mode === 'maintenance' && !isAdminAuthenticated) {
    return <MaintenanceScreen />;
  }

  const hasAuthenticatedUser = Boolean(user || isAuthenticated || hasDeviceSession);
  if (!hasAuthenticatedUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * LoginRoute:
 * - If user exists or persistent device session exists -> automatically redirect to dashboard ("/")
 * - While authLoading === true -> show loading/splash
 * - If user is null and no device session -> show login screen
 */
function LoginRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, authLoading, isAuthReady, systemConfig, isAdminAuthenticated } = useStore();
  const hasDeviceSession = Boolean(getDeviceSession());
  
  const hasAuthenticatedUser = Boolean(user || isAuthenticated || hasDeviceSession);
  if (hasAuthenticatedUser) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || !isAuthReady) {
    return <AuthLoadingScreen message="Loading Smart Ledger..." />;
  }

  // If system is in maintenance mode and user is not an administrator, show maintenance screen
  if (systemConfig?.mode === 'maintenance' && !isAdminAuthenticated) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}

import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ui/ToastContainer';
import CommandPalette from './components/CommandPalette';
import SplashScreen from './components/SplashScreen';
import AutomaticBackupRunner from './components/AutomaticBackupRunner';
import PageTransitionWrapper from './components/PageTransitionWrapper';

function AppRoutes() {
  const location = useLocation();
  
  return (
    <Suspense fallback={null}>
      <Routes location={location}>
        <Route path="/admin" element={
          <PageTransitionWrapper routeKey="/admin">
            <AdminLogin />
          </PageTransitionWrapper>
        } />
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:uid" element={<AdminUserProfile />} />
          <Route path="ledger" element={<AdminLedger />} />
          <Route path="received" element={<MoneyReceived />} />
          <Route path="pending" element={<AdminPending />} />
          <Route path="reminders" element={<AdminReminders />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="backup" element={<AdminBackup />} />
          <Route path="alerts" element={<AdminAlerts />} />
          <Route path="system-mode" element={<AdminSystemMode />} />
          <Route path="jobs" element={<AdminScheduledJobs />} />
          <Route path="gullak" element={<AdminGullak />} />
          <Route path="recycle-bin" element={<AdminRecycleBin />} />
          <Route path="trusted-devices" element={<AdminTrustedDevices />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="/login" element={
          <LoginRoute>
            <PageTransitionWrapper routeKey="/login">
              <Login />
            </PageTransitionWrapper>
          </LoginRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="balance" element={<CurrentBalance />} />
          <Route path="received" element={<MoneyReceived />} />
          <Route path="sent" element={<Navigate to="/received" replace />} />
          <Route path="pending" element={<PendingPayments />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="search" element={<Search />} />
          <Route path="vault" element={<Vault />} />
          <Route path="goals" element={<Goals />} />
          <Route path="gullak" element={<Gullak />} />
          <Route path="timeline" element={<TimelineReplay />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="import-export" element={<ImportExport />} />
          <Route path="reports" element={<MonthlyReports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="security" element={<SecurityCenter />} />
          <Route path="smartguard" element={<SmartGuardDashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="backup" element={<BackupDashboard />} />
          <Route path="backups" element={<BackupDashboard />} />
          <Route path="help" element={<Help />} />
          <Route path="about" element={<About />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

/**
 * MainAppContent synchronizes brand splash display with Firebase auth initialization.
 * The splash screen only hides when auth has resolved (authLoading === false) AND
 * the initial brand animation duration has elapsed.
 */
function MainAppContent() {
  const { authLoading, isAuthReady } = useStore();
  const [minSplashDone, setMinSplashDone] = React.useState(false);

  React.useEffect(() => {
    // Minimum cinematic brand splash duration (800ms)
    const timer = setTimeout(() => {
      setMinSplashDone(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // While authLoading is true or initial splash duration is running, show SplashScreen
  const isInitializing = authLoading || !isAuthReady || !minSplashDone;

  if (isInitializing) {
    return <SplashScreen onComplete={() => {}} />;
  }

  return (
    <SecurityWrapper>
      <AutomaticBackupRunner />
      <AppRoutes />
      <CommandPalette />
      <ToastContainer />
    </SecurityWrapper>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <StoreProvider>
          <NotificationProvider>
            <ToastProvider>
              <BrowserRouter>
                <MainAppContent />
              </BrowserRouter>
            </ToastProvider>
          </NotificationProvider>
        </StoreProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
