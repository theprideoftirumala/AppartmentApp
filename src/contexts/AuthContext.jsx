/**
 * Authentication Context
 * Manages Google OAuth state across the app
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initGoogleAuth, signIn as googleSignIn, signOut as googleSignOut, getCurrentUser } from '../services/googleAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        const userData = await initGoogleAuth((updatedUser) => {
          if (mounted) setUser(updatedUser);
        });
        if (mounted) {
          setUser(userData);
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
    try {
      const userData = await googleSignIn();
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    googleSignOut();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isOwner: false, // Will be determined by access control
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
