/**
 * Authentication Context
 * Manages Google OAuth state and Guest PIN sessions
 *
 * SECURITY: Role is never inferred as Owner for a random login.
 * The founding owner (FOUNDING_OWNER_EMAIL) is always Owner. Everyone else must appear
 * on the society Access Control tab (default Reader).
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initGoogleAuth, signIn as googleSignIn, signOut as googleSignOut } from '../services/googleAuth';
import { STORAGE_KEYS } from '../config/constants';
import { getAccessControl, resolveSpreadsheetForUser, isPermissionError } from '../services/googleSheets';
import { effectiveAppRole, isFoundingOwner } from '../config/accessPolicy';
import { normalizeEmail, parseJsonSafe, isValidSpreadsheetId } from '../utils/helpers';

const AuthContext = createContext(null);

export async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin).trim());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchAccessEntry(email) {
  const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
  if (!setupComplete || !isValidSpreadsheetId(spreadsheetId)) return null;
  const acl = await getAccessControl();
  return acl.find(u => normalizeEmail(u.email) === normalizeEmail(email) && u.status === 'Active') || null;
}

function roleOrDeny(email, entry) {
  return effectiveAppRole(email, entry);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    try {
      const s = parseJsonSafe(localStorage.getItem(STORAGE_KEYS.GUEST_SESSION), null);
      const pinHash = localStorage.getItem(STORAGE_KEYS.GUEST_PIN_HASH);
      if (s?.isGuest && s.expiresAt > Date.now() && pinHash && s.pinHash === pinHash) {
        setIsGuest(true);
        setLoading(false);
        return;
      }
      localStorage.removeItem(STORAGE_KEYS.GUEST_SESSION);
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
            const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
            if (setupComplete) {
              const sheetId = await resolveSpreadsheetForUser(userData.email);
              if (!sheetId) {
                setUser(userData);
                if (!isFoundingOwner(userData.email)) setAccessDenied(true);
                setLoading(false);
                return;
              }
            }
            const entry = await fetchAccessEntry(userData.email);
            const role = roleOrDeny(userData.email, entry);
            if (setupComplete && !role) {
              setUser(userData);
              setAccessDenied(true);
            } else {
              setUser(userData);
            }
          } catch (aclErr) {
            setUser(userData);
            if (!isPermissionError(aclErr) && localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true') {
              setError('Could not verify access against the Google Sheet. Check your connection and try again.');
            } else if (isPermissionError(aclErr) && !isFoundingOwner(userData.email)) {
              setAccessDenied(true);
            }
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
      if (setupComplete) {
        const sheetId = await resolveSpreadsheetForUser(userData.email);
        if (!sheetId) {
          setUser(userData);
          if (!isFoundingOwner(userData.email)) {
            setAccessDenied(true);
            throw new Error('ACCESS_DENIED');
          }
          return userData;
        }
        let entry = null;
        try {
          entry = await fetchAccessEntry(userData.email);
        } catch (aclErr) {
          console.warn('ACL check failed during sign-in:', aclErr);
          if (isPermissionError(aclErr)) {
            setUser(userData);
            if (!isFoundingOwner(userData.email)) {
              setAccessDenied(true);
              throw new Error('ACCESS_DENIED');
            }
            return userData;
          }
          setError('Could not verify access against the Google Sheet. Check your connection and try again.');
          throw new Error('Could not verify access. Please try again.');
        }
        if (!roleOrDeny(userData.email, entry)) {
          setUser(userData);
          setAccessDenied(true);
          throw new Error('ACCESS_DENIED');
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
    const session = {
      isGuest: true,
      expiresAt: Date.now() + 24 * 3600 * 1000,
      pinHash: storedHash,
    };
    localStorage.setItem(STORAGE_KEYS.GUEST_SESSION, JSON.stringify(session));
    setIsGuest(true);
  }, []);

  const signOutGuest = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.GUEST_SESSION);
    setIsGuest(false);
  }, []);

  const value = {
    user, loading, error, accessDenied, isGuest,
    signIn, signOut, loginAsGuest, signOutGuest, setAccessDenied,
    isAuthenticated: !!user || isGuest,
    isFoundingOwner: isFoundingOwner(user?.email),
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
