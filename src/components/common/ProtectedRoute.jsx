/**
 * Protected Route Component
 * Redirects to login if not authenticated (Google or Guest PIN), to setup if not configured
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, requireOwner = false }) {
  const { user, isGuest, loading: authLoading } = useAuth();
  const { isSetupComplete, userRole } = useApp();

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

  // Guests bypass the setup check (they use an already-set-up app)
  if (!isGuest && !isSetupComplete) {
    return <Navigate to="/setup" replace />;
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
