/**
 * Application Context
 * Manages global app state: config, dashboard data, access role, toasts
 */

import { createContext, useContext, useState, useCallback, useMemo, useReducer } from 'react';
import { STORAGE_KEYS } from '../config/constants';

const AppContext = createContext(null);

// Toast reducer
function toastReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, { ...action.payload, id: action.payload.id ?? Date.now() }];
    case 'REMOVE':
      return state.filter(t => t.id !== action.id);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'Owner' or 'Reader'
  const [isSetupComplete, setIsSetupComplete] = useState(
    localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true'
  );
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(
    localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, dispatchToast] = useReducer(toastReducer, []);

  // Toast helpers
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    dispatchToast({ type: 'ADD', payload: { id, message, type, duration } });
    if (duration > 0) {
      setTimeout(() => dispatchToast({ type: 'REMOVE', id }), duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    dispatchToast({ type: 'REMOVE', id });
  }, []);

  const completeSetup = useCallback(() => {
    setIsSetupComplete(true);
    localStorage.setItem(STORAGE_KEYS.SETUP_COMPLETE, 'true');
  }, []);

  const resetSetup = useCallback(() => {
    setIsSetupComplete(false);
    localStorage.removeItem(STORAGE_KEYS.SETUP_COMPLETE);
    localStorage.removeItem(STORAGE_KEYS.SPREADSHEET_ID);
    localStorage.removeItem(STORAGE_KEYS.ROOT_FOLDER_ID);
    localStorage.removeItem(STORAGE_KEYS.CACHED_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.CACHED_DASHBOARD);
    localStorage.removeItem(STORAGE_KEYS.BOUND_EMAIL);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const isOwner = userRole === 'Owner';
  const isReader = userRole === 'Reader';

  const value = useMemo(() => ({
    config,
    setConfig,
    dashboardData,
    setDashboardData,
    userRole,
    setUserRole,
    isOwner,
    isReader,
    isSetupComplete,
    completeSetup,
    resetSetup,
    loading,
    setLoading,
    lastSync,
    setLastSync,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    toasts,
    showToast,
    removeToast,
  }), [
    config, dashboardData, userRole, isOwner, isReader, isSetupComplete,
    completeSetup, resetSetup, loading, lastSync, sidebarOpen, toggleSidebar,
    toasts, showToast, removeToast,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
