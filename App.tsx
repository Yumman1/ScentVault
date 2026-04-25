import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { 
  SupplierForm, 
  CustomerForm, 
  PackingTypeForm, 
  LocationForm 
} from './components/forms/SystemForms';
import { UserForm } from './components/forms/UserForm';
import { PerfumeMasterForm } from './components/forms/PerfumeForm';
import { 
  GateInForm, 
  GateOutForm, 
  StockTransferForm 
} from './components/forms/TransactionForms';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReportsView } from './components/reports/ReportsView';
import { TagsSettings } from './components/settings/TagsSettings';
import { DatabaseSettings } from './components/settings/DatabaseSettings';
import { Dashboard } from './components/dashboard/Dashboard';
import { Header } from './components/layout/Header';
import { UserRole } from './types';
import { UndoToast } from './components/ui/UndoToast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AuditLedger } from './components/system/AuditLedger';
import { QuickActionsFAB } from './components/ui/QuickActionsFAB';
import { LoginPage } from './pages/LoginPage';
import { ThemeProvider } from './context/ThemeContext';
import { Loader2 } from 'lucide-react';

// ── Loading Screen ──────────────────────────────────────────
const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
    <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
    <p className="text-slate-400 text-sm font-medium tracking-wide">Loading ScentVault...</p>
  </div>
);

// ── Main App Content (authenticated) ────────────────────────
const AppContent = () => {
  const { currentUser, isLoading } = useInventory();
  const [dashboardSearch, setDashboardSearch] = useState('');
  const location = useLocation();

  useKeyboardShortcuts();

  if (isLoading) return <LoadingScreen />;

  const isAdmin = currentUser?.role === UserRole.Admin;
  const isOperator = currentUser?.role === UserRole.Operator;
  const isViewer = currentUser?.role === UserRole.Viewer;

  const currentView = location.pathname.substring(1) || 'dashboard';

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-100">
      <Sidebar currentView={currentView} />
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header 
          currentView={currentView} 
          searchTerm={dashboardSearch} 
          setSearchTerm={setDashboardSearch} 
        />
        <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard searchTerm={dashboardSearch} />} />
              <Route path="/reports" element={<ReportsView />} />
              
              {/* Protected Master Data Routes */}
              <Route path="/perfumes" element={isAdmin ? <div className="p-4 sm:p-6 lg:p-10 max-w-full min-w-0"><PerfumeMasterForm /></div> : <Navigate to="/dashboard" replace />} />
              <Route path="/tags" element={isAdmin ? <TagsSettings /> : <Navigate to="/dashboard" replace />} />
              <Route path="/suppliers" element={isAdmin ? <div className="p-10"><SupplierForm /></div> : <Navigate to="/dashboard" replace />} />
              <Route path="/customers" element={isAdmin ? <div className="p-10"><CustomerForm /></div> : <Navigate to="/dashboard" replace />} />
              <Route path="/packing" element={isAdmin ? <div className="p-10"><PackingTypeForm /></div> : <Navigate to="/dashboard" replace />} />
              <Route path="/locations" element={isAdmin ? <div className="p-10"><LocationForm /></div> : <Navigate to="/dashboard" replace />} />
              
              {/* Logistics Routes (Admin & Operator) */}
              <Route path="/gate-in" element={!isViewer ? <div className="p-10"><GateInForm /></div> : <Navigate to="/dashboard" replace />} />
              <Route path="/gate-out" element={!isViewer ? <div className="p-10"><GateOutForm /></div> : <Navigate to="/dashboard" replace />} />
              <Route path="/transfer" element={!isViewer ? <div className="p-10"><StockTransferForm /></div> : <Navigate to="/dashboard" replace />} />
              
              {/* System Routes (Admin Only) */}
              <Route path="/users" element={isAdmin ? <div className="p-10"><UserForm /></div> : <Navigate to="/dashboard" replace />} />
              <Route path="/audit" element={isAdmin ? <AuditLedger /> : <Navigate to="/dashboard" replace />} />
              <Route path="/database" element={isAdmin ? <div className="p-10"><DatabaseSettings /></div> : <Navigate to="/dashboard" replace />} />
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
          <UndoToast />
          {['dashboard', 'reports'].includes(currentView) && <QuickActionsFAB />}
        </main>
    </div>
  );
};

// ── Auth Gate ───────────────────────────────────────────────
const AuthGate = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (!session) return <LoginPage />;

  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
};

// ── Root App ────────────────────────────────────────────────
const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;