/**
 * Authentication Context
 * Manages Google OAuth state across the app
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initGoogleAuth, signIn as googleSignIn, signOut as googleSignOut } from '../services/googleAuth';
import { STORAGE_KEYS } from '../config/constants';
import { getAccessControl } from '../services/googleSheets';

const AuthContext = createContext(null);

/**
 * Check if email is in the active ACL.
 * Returns the entry or null. Skips silently when not yet set up.
 * Only call AFTER gapi is fully initialised (i.e. after initGoogleAuth resolves).
 */
async function fetchAccessEntry(email) {
  const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
  if (!setupComplete || !spreadsheetId) return null;
  const acl = await getAccessControl();
  return acl.find(u => u.email === email && u.status === 'Active') || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // initGoogleAuth resolves with existing session data (or null).
        // We pass a simple callback that only updates user state — no ACL calls here
        // because gapi may not be ready when the callback fires.
        const userData = await initGoogleAuth((updatedUser) => {
          if (mounted) setUser(updatedUser);
        });

        if (!mounted) return;

        if (userData) {
          // GAPI is now initialised — safe to check ACL
          try {
            const entry = await fetchAccessEntry(userData.email);
            const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
            if (setupComplete && entry === null) {
              googleSignOut();
              setAccessDenied(true);
              setUser(null);
            } else {
              setUser(userData);
            }
          } catch {
            setUser(userData); // Fail open — network issue shouldn't block auth
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    setAccessDenied(false);
    try {
      const userData = await googleSignIn();

      // Enforce access control after successful Google auth
      const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
      const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);

      if (setupComplete && spreadsheetId) {
        let entry = null;
        try {
          entry = await fetchAccessEntry(userData.email);
        } catch (aclErr) {
          console.warn('ACL check failed during sign-in:', aclErr);
          // Fail open — allow login if we can't reach the sheet
          setUser(userData);
          return userData;
        }
        if (!entry) {
          googleSignOut();
          setUser(null);
          setAccessDenied(true);
          const err = new Error(`ACCESS_DENIED: Your Google account (${userData.email}) is not authorized. Contact the Treasurer or President to request access.`);
          setError(err.message);
          throw err;
        }
      }

      setUser(userData);
      return userData;
    } catch (err) {
      if (!err.message?.startsWith('ACCESS_DENIED')) setError(err.message);
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    googleSignOut();
    setUser(null);
    setAccessDenied(false);
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    accessDenied,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isOwner: false, // Determined by access control check in Dashboard
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
