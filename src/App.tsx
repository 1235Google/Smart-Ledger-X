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
  const { isAuthenticated, isLoading, logout } = useStore();
  const [showTimeout, setShowTimeout] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowTimeout(true);
      }, 7000);
    } else {
      setShowTimeout(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading) {
    if (showTimeout) {
      return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center text-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Loading is taking longer than expected</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Connecting to your SmartLedger workspace. Please check your internet connection or try refreshing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
            >
              Refresh
            </button>
            <button
              onClick={() => logout()}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-medium text-sm transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

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
        <Route path="help" element={<Help />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <SecurityWrapper>
          <AppRoutes />
        </SecurityWrapper>
      </BrowserRouter>
    </StoreProvider>
  );
}

