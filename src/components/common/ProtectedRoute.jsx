/**
 * Protected Route Component
 * Redirects to login if not authenticated (Google or Guest PIN).
 * Founding owner goes to Setup whenever APP-TPT-Tracker is not bound,
 * even if a leftover SETUP_COMPLETE flag is still true.
 * Guest users (PIN only, no Google token) are restricted to the Dashboard — all other pages
 * require the Google Sheets API which is unavailable without an OAuth token.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { STORAGE_KEYS } from '../../config/constants';
import { isFoundingOwner } from '../../config/accessPolicy';
import { isValidSpreadsheetId } from '../../utils/helpers';
import { shouldSendFounderToSetup } from '../../utils/setupFlow';
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

  const hasBoundSheet = isValidSpreadsheetId(localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID));
  if (shouldSendFounderToSetup({
    isGuest,
    isFounder: isFoundingOwner(user?.email),
    hasBoundSheet,
  })) {
    return <Navigate to="/setup" replace />;
  }
  if (!isGuest && !isSetupComplete && !hasBoundSheet) {
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
