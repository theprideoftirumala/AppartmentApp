/**
 * Google Authentication Service
 * Handles OAuth 2.0 via Google Identity Services (GIS)
 * No backend required — uses client-side token flow
 */

import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, DISCOVERY_DOCS, STORAGE_KEYS } from '../config/constants';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;
let onAuthChangeCallback = null;

/**
 * Load a script tag dynamically
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Initialize the GAPI client library
 */
async function initGapiClient() {
  await new Promise((resolve) => window.gapi.load('client', resolve));
  await window.gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
  });
  gapiInited = true;
}

/**
 * Initialize the GIS token client
 */
function initGisClient(callback) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse.error) {
        console.error('Auth error:', tokenResponse.error);
        if (callback) callback(null, tokenResponse.error);
        return;
      }
      // Fetch user profile
      fetchUserProfile(tokenResponse.access_token).then((user) => {
        const userData = {
          ...user,
          accessToken: tokenResponse.access_token,
          expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        };
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        if (onAuthChangeCallback) onAuthChangeCallback(userData);
        if (callback) callback(userData, null);
      });
    },
  });
  gisInited = true;
}

/**
 * Fetch user profile from Google
 */
async function fetchUserProfile(accessToken) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
      id: data.id,
    };
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return {};
  }
}

/**
 * Initialize both GAPI and GIS libraries
 */
export async function initGoogleAuth(onAuthChange) {
  onAuthChangeCallback = onAuthChange;

  try {
    // Load scripts in parallel
    await Promise.all([
      loadScript('https://apis.google.com/js/api.js'),
      loadScript('https://accounts.google.com/gsi/client'),
    ]);

    // Initialize GAPI
    await initGapiClient();

    // Initialize GIS
    initGisClient();

    // Check for existing session
    const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (stored) {
      const userData = JSON.parse(stored);
      if (userData.expiresAt > Date.now()) {
        // Token still valid, set it on gapi
        window.gapi.client.setToken({ access_token: userData.accessToken });
        if (onAuthChange) onAuthChange(userData);
        return userData;
      } else {
        // Token expired, clear it
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to initialize Google Auth:', error);
    throw error;
  }
}

/**
 * Sign in — triggers Google OAuth consent
 */
export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Auth not initialized'));
      return;
    }

    // Override the callback for this specific sign-in attempt
    const originalCallback = tokenClient.callback;
    tokenClient.callback = (tokenResponse) => {
      if (tokenResponse.error) {
        reject(new Error(tokenResponse.error));
        return;
      }
      fetchUserProfile(tokenResponse.access_token).then((user) => {
        const userData = {
          ...user,
          accessToken: tokenResponse.access_token,
          expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        };
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        window.gapi.client.setToken({ access_token: tokenResponse.access_token });
        if (onAuthChangeCallback) onAuthChangeCallback(userData);
        resolve(userData);
      });
    };

    // Check if we need consent or just a new token
    if (window.gapi.client.getToken() === null) {
      // First time — show consent screen
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Returning user — skip consent
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

/**
 * Sign out — revoke token and clear session
 */
export function signOut() {
  const token = window.gapi?.client?.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken(null);
  }
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  if (onAuthChangeCallback) onAuthChangeCallback(null);
}

/**
 * Get current user data from localStorage
 */
export function getCurrentUser() {
  const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA);
  if (!stored) return null;
  const userData = JSON.parse(stored);
  if (userData.expiresAt <= Date.now()) {
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    return null;
  }
  return userData;
}

/**
 * Check if user is authenticated and token is valid
 */
export function isAuthenticated() {
  const user = getCurrentUser();
  return user !== null;
}

/**
 * Refresh the access token silently
 */
export function refreshToken() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Auth not initialized'));
      return;
    }
    tokenClient.requestAccessToken({ prompt: '' });
    // The callback set during init will handle the response
    // We just need to wait for the callback to fire
    const checkInterval = setInterval(() => {
      const user = getCurrentUser();
      if (user && user.expiresAt > Date.now() + 3500000) {
        clearInterval(checkInterval);
        resolve(user);
      }
    }, 200);

    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Token refresh timed out'));
    }, 10000);
  });
}

/**
 * Ensure we have a valid token before API calls
 * Refreshes if token expires in < 5 minutes
 */
export async function ensureValidToken() {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // If token expires in less than 5 minutes, refresh
  if (user.expiresAt - Date.now() < 300000) {
    try {
      await refreshToken();
    } catch {
      // If refresh fails silently, we still might have a valid token
      const refreshedUser = getCurrentUser();
      if (!refreshedUser) throw new Error('Session expired. Please sign in again.');
    }
  }

  return user;
}
