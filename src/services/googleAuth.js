/**
 * Google Authentication Service
 * Handles OAuth 2.0 via Google Identity Services (GIS)
 * No backend required — uses client-side token flow
 */

import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, DISCOVERY_DOCS, STORAGE_KEYS, OAUTH_SCOPE_VERSION } from '../config/constants';
import { parseJsonSafe } from '../utils/helpers';

function readUserSession() {
  const raw = sessionStorage.getItem(STORAGE_KEYS.USER_DATA)
    || localStorage.getItem(STORAGE_KEYS.USER_DATA);
  return parseJsonSafe(raw, null);
}

function writeUserSession(userData) {
  const safe = {
    email: userData.email || '',
    name: userData.name || '',
    picture: userData.picture || '',
    id: userData.id || '',
    expiresAt: userData.expiresAt,
  };
  sessionStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify({
    ...safe,
    accessToken: userData.accessToken,
  }));
  // Profile only in localStorage — never persist the access token across browser restarts
  localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(safe));
}

function clearUserSession() {
  sessionStorage.removeItem(STORAGE_KEYS.USER_DATA);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
}

let tokenClient = null;
let gapiInited = false;
let gisInited = false;
let onAuthChangeCallback = null;

export function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

export function friendlyAuthError(err) {
  const s = String(err?.message || err || '');
  if (/popup_closed|popup_blocked|access_denied|Failed to open/i.test(s)) {
    return 'Google sign-in was blocked. On a phone use Chrome or Safari (not WhatsApp/Instagram in-app browser), allow pop-ups for this site, then tap Sign in again.';
  }
  if (/idpiframe|Tracking|Timed out|network|Failed to fetch|Load failed/i.test(s)) {
    return 'Google could not start on this device. Open this site in Chrome or Safari, turn off strict tracking prevention for this site, clear cache from Settings, and try again.';
  }
  if (/Not authenticated|Session expired/i.test(s)) {
    return 'Session expired. Please sign in again.';
  }
  return s || 'Google sign-in failed. Please try again.';
}

/**
 * Load a script tag dynamically.
 * If the tag already exists, wait for the global object rather than resolving instantly.
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    // If the global is already populated, skip entirely
    const isGapi = src.includes('api.js');
    const isGis = src.includes('gsi/client');
    if (isGapi && window.gapi?.load) { resolve(); return; }
    if (isGis && window.google?.accounts?.oauth2) { resolve(); return; }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // Tag was injected before but may not have fired onload yet — attach listeners
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
    setTimeout(() => reject(new Error(`Timed out loading ${src}`)), 15000);
  });
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

/**
 * Initialize the GAPI client library (skip if already done)
 */
async function initGapiClient() {
  if (gapiInited && window.gapi?.client?.sheets) return;
  gapiInited = false;
  await withTimeout(
    new Promise((resolve, reject) => {
      try {
        window.gapi.load('client', resolve);
      } catch (err) {
        reject(err);
      }
    }),
    12000,
    'Google API script loaded but did not start. Try a normal browser window (not InPrivate) and allow this site in Tracking Prevention.',
  );
  await withTimeout(
    window.gapi.client.init({
      discoveryDocs: DISCOVERY_DOCS,
    }),
    15000,
    'Google Sheets/Drive client timed out. Check your connection, then refresh.',
  );
  gapiInited = true;
}

/**
 * Initialize the GIS token client
 */
function initGisClient(callback) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    error_callback: (err) => {
      console.error('GIS error:', err);
    },
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
        writeUserSession(userData);
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
    if (!response.ok) throw new Error('Failed to load Google profile');
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
    const userData = readUserSession();
    if (userData?.accessToken && userData.expiresAt > Date.now()) {
      window.gapi.client.setToken({ access_token: userData.accessToken });
      if (onAuthChange) onAuthChange(userData);
      return userData;
    }
    if (userData) {
      clearUserSession();
    }

    const restoreToken = () => {
      const current = getCurrentUser();
      if (current?.accessToken && window.gapi?.client) {
        window.gapi.client.setToken({ access_token: current.accessToken });
      }
    };
    document.addEventListener('visibilitychange', restoreToken);
    window.addEventListener('pageshow', restoreToken);

    return null;
  } catch (error) {
    console.error('Failed to initialize Google Auth:', error);
    throw new Error(friendlyAuthError(error));
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
    tokenClient.callback = (tokenResponse) => {
      if (tokenResponse.error) {
        reject(new Error(friendlyAuthError(tokenResponse.error)));
        return;
      }
      localStorage.setItem(STORAGE_KEYS.OAUTH_SCOPE_VERSION, OAUTH_SCOPE_VERSION);
      fetchUserProfile(tokenResponse.access_token).then((user) => {
        const userData = {
          ...user,
          accessToken: tokenResponse.access_token,
          expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        };
        writeUserSession(userData);
        window.gapi.client.setToken({ access_token: tokenResponse.access_token });
        if (onAuthChangeCallback) onAuthChangeCallback(userData);
        resolve(userData);
      });
    };

    // Re-consent when scopes change (e.g. drive.metadata.readonly) so shared files are listable.
    const grantedVersion = localStorage.getItem(STORAGE_KEYS.OAUTH_SCOPE_VERSION);
    const needsConsent = window.gapi.client.getToken() === null || grantedVersion !== OAUTH_SCOPE_VERSION;
    try {
      tokenClient.requestAccessToken({ prompt: needsConsent || isMobileBrowser() ? 'consent' : '' });
    } catch (err) {
      reject(new Error(friendlyAuthError(err)));
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
  clearUserSession();
  if (onAuthChangeCallback) onAuthChangeCallback(null);
}

/**
 * Get current user data from localStorage
 */
export function getCurrentUser() {
  const userData = readUserSession();
  if (!userData) return null;
  if (!userData.accessToken || userData.expiresAt <= Date.now()) {
    clearUserSession();
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
    if (isMobileBrowser()) {
      throw new Error('Session expired. Please sign in again. On a phone, tap Sign in with Google — silent refresh often fails in mobile browsers.');
    }
    try {
      await refreshToken();
    } catch {
      const refreshedUser = getCurrentUser();
      if (!refreshedUser) throw new Error('Session expired. Please sign in again.');
    }
  }

  return user;
}
