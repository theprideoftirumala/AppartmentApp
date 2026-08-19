/**
 * App Component — Root layout with routing, sidebar, bottom nav, and toast.
 *
 * Rendering hierarchy:
 *   HashRouter
 *     AuthProvider  (Google OAuth state + Guest PIN sessions)
 *       AppProvider (config, dashboard cache, toast queue)
 *         ErrorBoundary (catches unexpected JS exceptions in any child)
 *           AppRoutes — AccessDenied wall OR full route tree
 *             AppLayout — Sidebar + BottomNav for authenticated users
 */

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';

import ProtectedRoute from './components/common/ProtectedRoute';
import AccessDenied from './components/common/AccessDenied';
import ErrorBoundary from './components/common/ErrorBoundary';
import Sidebar from './components/common/Sidebar';
import BottomNav from './components/common/BottomNav';
import Toast from './components/common/Toast';

import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Maintenance from './pages/Maintenance';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Reminders from './pages/Reminders';
import EmergencyContacts from './pages/EmergencyContacts';
import Settings from './pages/Settings';
import Help from './pages/Help';

function AppLayout({ children }) {
  const { user, isGuest } = useAuth();

  if (!user && !isGuest) return children;

  return (
    <div className="app-layout">
      <Sidebar />
      {children}
      <BottomNav />
    </div>
  );
}

function AppRoutes() {
  const { accessDenied } = useAuth();

  // Blocked user sees nothing but the denial screen — no routes, no sidebar, no data
  if (accessDenied) {
    return <AccessDenied />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <Expenses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reminders"
          element={
            <ProtectedRoute>
              <Reminders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <EmergencyContacts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute requireOwner>
              <Help />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppProvider>
          {/* ErrorBoundary prevents a crashed page from blanking the whole app */}
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
          {/* Toast lives outside the boundary so error toasts still appear */}
          <Toast />
        </AppProvider>
      </AuthProvider>
    </HashRouter>
  );
}
