import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
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
const AdminRecycleBin = lazy(() => import('./pages/admin/AdminRecycleBin'));
const AdminTrustedDevices = lazy(() => import('./pages/admin/AdminTrustedDevices'));

const Login = lazy(() => import('./pages/Login'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthReady, systemConfig, isAdminAuthenticated } = useStore();
  
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-neutral-400 font-medium">Verifying authentication...</p>
      </div>
    );
  }

  // If system is in maintenance mode and user is not an administrator, show maintenance screen
  if (systemConfig?.mode === 'maintenance' && !isAdminAuthenticated) {
    return <MaintenanceScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function LoginRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthReady, systemConfig, isAdminAuthenticated } = useStore();
  
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-neutral-400 font-medium">Loading Smart Ledger...</p>
      </div>
    );
  }

  // If system is in maintenance mode and user is not an administrator, show maintenance screen
  if (systemConfig?.mode === 'maintenance' && !isAdminAuthenticated) {
    return <MaintenanceScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import ToastContainer from './components/ui/ToastContainer';
import CommandPalette from './components/CommandPalette';

import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';

import AutomaticBackupRunner from './components/AutomaticBackupRunner';

import { useLocation } from 'react-router-dom';

function AppRoutes() {
  const location = useLocation();
  
  return (
    <Suspense fallback={null}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname.split('/')[1] || '/'}>
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/*" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="ledger" element={<AdminLedger />} />
            <Route path="received" element={<MoneyReceived />} />
            <Route path="pending" element={<AdminPending />} />
            <Route path="reminders" element={<AdminReminders />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="backup" element={<AdminBackup />} />
            <Route path="jobs" element={<AdminScheduledJobs />} />
            <Route path="gullak" element={<AdminGullak />} />
            <Route path="recycle-bin" element={<AdminRecycleBin />} />
            <Route path="trusted-devices" element={<AdminTrustedDevices />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="/login" element={
            <LoginRoute>
              <Login />
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
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="backup" element={<BackupDashboard />} />
            <Route path="backups" element={<BackupDashboard />} />
            <Route path="help" element={<Help />} />
            <Route path="about" element={<About />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <ErrorBoundary>
      <StoreProvider>
        <NotificationProvider>
          <ToastProvider>
            <BrowserRouter>
              {showSplash ? (
                <SplashScreen onComplete={() => setShowSplash(false)} />
              ) : (
                <SecurityWrapper>
                  <AutomaticBackupRunner />
                  <AppRoutes />
                  <CommandPalette />
                  <ToastContainer />
                </SecurityWrapper>
              )}
            </BrowserRouter>
          </ToastProvider>
        </NotificationProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}

