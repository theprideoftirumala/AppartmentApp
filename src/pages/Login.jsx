/**
 * Login Page
 * Google OAuth sign-in with premium design
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn, Building2, Lock, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../config/constants';

export default function Login() {
  const { signIn, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      navigate('/');
    } catch (err) {
      setError('Sign in failed. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decorative background */}
      <div className="login-bg-decor">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      <div className="login-container animate-fade-in-up">
        {/* Logo & Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <Shield size={40} />
          </div>
          <h1 className="login-title">{APP_NAME}</h1>
          <p className="login-subtitle">Apartment Maintenance Expense Tracker</p>
        </div>

        {/* Features */}
        <div className="login-features">
          <div className="login-feature">
            <Building2 size={20} />
            <span>Track maintenance for 10 flats</span>
          </div>
          <div className="login-feature">
            <BarChart3 size={20} />
            <span>Real-time financial dashboard</span>
          </div>
          <div className="login-feature">
            <Lock size={20} />
            <span>Secure Google Drive storage</span>
          </div>
        </div>

        {/* Sign In Button */}
        <button
          className="btn btn-primary btn-lg login-btn"
          onClick={handleSignIn}
          disabled={loading || authLoading}
        >
          {loading ? (
            <>
              <div className="loading-spinner" style={{ width: 20, height: 20 }}>
                <svg viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeDasharray="80, 200" />
                </svg>
              </div>
              Signing in...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        {error && (
          <p className="login-error">{error}</p>
        )}

        <p className="login-note">
          Only authorized members can access this app.
          <br />Contact your Treasurer or President for access.
        </p>
      </div>
    </div>
  );
}
