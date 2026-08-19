/**
 * Authentication Context
 * Manages Google OAuth state and Guest PIN sessions
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initGoogleAuth, signIn as googleSignIn, signOut as googleSignOut } from '../services/googleAuth';
import { STORAGE_KEYS } from '../config/constants';
import { getAccessControl } from '../services/googleSheets';

const AuthContext = createContext(null);

export async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin).trim());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GUEST_SESSION);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.isGuest && s.expiresAt > Date.now()) {
          setIsGuest(true);
          setLoading(false);
          return;
        }
        localStorage.removeItem(STORAGE_KEYS.GUEST_SESSION);
      }
    } catch { /* ignore */ }

    let mounted = true;

    async function init() {
      try {
        const userData = await initGoogleAuth((updatedUser) => {
          if (mounted) setUser(updatedUser);
        });
        if (!mounted) return;
        if (userData) {
          try {
            const entry = await fetchAccessEntry(userData.email);
            const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
            if (setupComplete && entry === null) {
              // Keep user set so AccessDenied screen can show their email
              setUser(userData);
              setAccessDenied(true);
            } else {
              setUser(userData);
            }
          } catch {
            setUser(userData);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) { setError(err.message); setLoading(false); }
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
      const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
      const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
      if (setupComplete && spreadsheetId) {
        let entry = null;
        try {
          entry = await fetchAccessEntry(userData.email);
        } catch (aclErr) {
          console.warn('ACL check failed during sign-in:', aclErr);
          setUser(userData);
          return userData;
        }
        if (!entry) {
          // Keep the Google session alive so the user sees WHO is blocked.
          // Do NOT sign them out — the AccessDenied screen will show their email
          // and provide a sign-out button.
          setUser(userData);
          setAccessDenied(true);
          const err = new Error(`ACCESS_DENIED`);
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

  const loginAsGuest = useCallback(async (pin) => {
    const storedHash = localStorage.getItem(STORAGE_KEYS.GUEST_PIN_HASH);
    if (!storedHash) {
      throw new Error('Guest access is not configured on this device. An Owner must visit Settings > Configuration first to set the Guest PIN.');
    }
    const entered = await hashPin(pin);
    if (entered !== storedHash) {
      throw new Error('Incorrect PIN. Please try again.');
    }
    const session = { isGuest: true, expiresAt: Date.now() + 24 * 3600 * 1000 };
    localStorage.setItem(STORAGE_KEYS.GUEST_SESSION, JSON.stringify(session));
    setIsGuest(true);
  }, []);

  const signOutGuest = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.GUEST_SESSION);
    setIsGuest(false);
  }, []);

  const value = {
    user, loading, error, accessDenied, isGuest,
    signIn, signOut, loginAsGuest, signOutGuest,
    isAuthenticated: !!user || isGuest,
    isOwner: false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;
