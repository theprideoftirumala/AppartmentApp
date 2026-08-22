/**
 * Local and service-worker cache helpers.
 * Google API traffic must never be served from a stale PWA cache.
 */

import { STORAGE_KEYS } from '../config/constants';

const CACHE_ONLY_KEYS = [
  STORAGE_KEYS.CACHED_CONFIG,
  STORAGE_KEYS.CACHED_DASHBOARD,
  STORAGE_KEYS.LAST_SYNC,
];

export function clearLocalDataCache() {
  CACHE_ONLY_KEYS.forEach((key) => localStorage.removeItem(key));
}

export async function clearServiceWorkerCaches() {
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  }
}

/** Clears app data cache and the service worker, then reloads. */
export async function clearAppCachesAndReload() {
  clearLocalDataCache();
  await clearServiceWorkerCaches();
  window.location.reload();
}
