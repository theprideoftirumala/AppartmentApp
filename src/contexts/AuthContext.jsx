/**
 * Authentication Context
 * Manages Google OAuth state across the app
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initGoogleAuth, signIn as googleSignIn, signOut as googleSignOut, getCurrentUser } from '../services/googleAuth';
import { STORAGE_KEYS } from '../config/constants';
import { getAccessControl } from '../services/googleSheets';

const AuthContext = createContext(null);

/**
 * Check if an email is in the active access control list.
 * Returns the ACL entry or null. Skips check when setup is not complete.
 */
async function fetchAccessEntry(email) {
  const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
  if (!setupComplete || !spreadsheetId) return null; // Skip — not set up yet
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
        const userData = await initGoogleAuth(async (updatedUser) => {
          if (!mounted) return;
          if (!updatedUser) { setUser(null); return; }
          // For token refreshes, re-validate access
          try {
            await fetchAccessEntry(updatedUser.email);
            setUser(updatedUser);
          } catch {
            setUser(updatedUser); // Fail open on refresh errors
          }
        });
        if (mounted) {
          if (userData) {
            // Re-validate stored session against ACL
            try {
              const entry = await fetchAccessEntry(userData.email);
              const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
              if (setupComplete && entry === null) {
                // User was in ACL before but now missing — block silently
                googleSignOut();
                setUser(null);
                setAccessDenied(true);
              } else {
                setUser(userData);
              }
            } catch {
              setUser(userData); // Fail open if ACL check errors
            }
          }
          setLoading(false);
        }
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
