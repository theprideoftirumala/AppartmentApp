/**
 * Protected Route Component
 * Redirects to login if not authenticated (Google or Guest PIN), to setup if not configured.
 * Guest users (PIN only, no Google token) are restricted to the Dashboard — all other pages
 * require the Google Sheets API which is unavailable without an OAuth token.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { isFoundingOwner } from '../../config/accessPolicy';
import LoadingSpinner from './LoadingSpinner';
import AccessDenied from './AccessDenied';

export default function ProtectedRoute({ children, requireOwner = false }) {
  const { user, isGuest, loading: authLoading } = useAuth();
  const { isSetupComplete, userRole } = useApp();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="full-page-center">
        <LoadingSpinner text="Authenticating..." />
      </div>
    );
  }

  if (!user && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  // Guests bypass the setup check but can only visit the Dashboard
  // (other pages call the Google Sheets API which needs an OAuth token)
  if (isGuest && location.pathname !== '/') {
    return <Navigate to="/" replace />;
  }

  if (!isGuest && !isSetupComplete) {
    if (isFoundingOwner(user?.email)) {
      return <Navigate to="/setup" replace />;
    }
    return <AccessDenied />;
  }

  if (requireOwner && userRole !== 'Owner') {
    return (
      <div className="full-page-center">
        <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
          <h3>Access Restricted</h3>
          <p className="mt-2">This section is only available to Owners.</p>
        </div>
      </div>
    );
  }

  return children;
}
