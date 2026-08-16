import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import Layout from './components/Layout';
import InitialSetup from './pages/InitialSetup';
import Dashboard from './pages/Dashboard';
import CurrentBalance from './pages/CurrentBalance';
import MoneyReceived from './pages/MoneyReceived';
import PendingPayments from './pages/PendingPayments';
import SendMoney from './pages/SendMoney';
import Analytics from './pages/Analytics';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import MonthlyReports from './pages/MonthlyReports';
import Vault from './pages/Vault';
import Goals from './pages/Goals';
import Gullak from './pages/Gullak';
import ImportExport from './pages/ImportExport';
import Calculator from './pages/Calculator';
import TimelineReplay from './pages/TimelineReplay';
import SecurityWrapper from './components/SecurityWrapper';
import SecurityCenter from './pages/SecurityCenter';
import BackupDashboard from './pages/BackupDashboard';
import Help from './pages/Help';
import About from './pages/About';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLedger from './pages/admin/AdminLedger';
import AdminPending from './pages/admin/AdminPending';
import AdminReminders from './pages/admin/AdminReminders';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';
import AdminGullak from './pages/admin/AdminGullak';

import Login from './pages/Login';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function LoginRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ui/ToastContainer';
import CommandPalette from './components/CommandPalette';

import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';

import AutomaticBackupRunner from './components/AutomaticBackupRunner';

function AppRoutes() {
  return (
    <Routes>
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
        <Route path="gullak" element={<AdminGullak />} />
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
        <Route path="sent" element={<SendMoney />} />
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
        <Route path="backup" element={<BackupDashboard />} />
        <Route path="help" element={<Help />} />
        <Route path="about" element={<About />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <ErrorBoundary>
      <StoreProvider>
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
      </StoreProvider>
    </ErrorBoundary>
  );
}

