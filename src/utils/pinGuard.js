/**
 * Device-local Guest PIN throttling. Not a server lockout.
 */

import { STORAGE_KEYS } from '../config/constants';

export const PIN_MIN_DIGITS = 6;
export const PIN_MAX_DIGITS = 12;
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 60 * 1000;

export function assertPinFormat(pin) {
  const value = String(pin || '').trim();
  if (!new RegExp(`^\\d{${PIN_MIN_DIGITS},${PIN_MAX_DIGITS}}$`).test(value)) {
    throw new Error(`PIN must be ${PIN_MIN_DIGITS} to ${PIN_MAX_DIGITS} digits.`);
  }
  return value;
}

const memoryStore = new Map();

function memoryStorage() {
  return {
    getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
    setItem: (key, value) => { memoryStore.set(key, String(value)); },
    removeItem: (key) => { memoryStore.delete(key); },
  };
}

function storage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.getItem) return localStorage;
  } catch {
    // private mode or Node tests
  }
  return memoryStorage();
}

export function readPinLock() {
  try {
    const store = storage();
    const raw = JSON.parse(store?.getItem(STORAGE_KEYS.GUEST_PIN_LOCK) || 'null');
    if (!raw || typeof raw !== 'object') return { attempts: 0, lockedUntil: 0 };
    return {
      attempts: Number(raw.attempts) || 0,
      lockedUntil: Number(raw.lockedUntil) || 0,
    };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

export function writePinLock(lock) {
  storage()?.setItem(STORAGE_KEYS.GUEST_PIN_LOCK, JSON.stringify(lock));
}

export function clearPinLock() {
  storage()?.removeItem(STORAGE_KEYS.GUEST_PIN_LOCK);
}

export function assertPinUnlocked(now = Date.now()) {
  const lock = readPinLock();
  if (lock.lockedUntil && lock.lockedUntil > now) {
    const secs = Math.max(1, Math.ceil((lock.lockedUntil - now) / 1000));
    throw new Error(`Too many incorrect PINs. Try again in ${secs} seconds.`);
  }
}

export function pinAttemptDelayMs(attempts) {
  const n = Number(attempts) || 0;
  return Math.min(4000, 300 * (2 ** Math.max(0, n - 1)));
}

export function registerFailedPinAttempt(now = Date.now()) {
  const lock = readPinLock();
  const attempts = (lock.attempts || 0) + 1;
  const next = attempts >= PIN_MAX_ATTEMPTS
    ? { attempts, lockedUntil: now + PIN_LOCK_MS }
    : { attempts, lockedUntil: 0 };
  writePinLock(next);
  if (next.lockedUntil) {
    throw new Error('Too many incorrect PINs. Wait 1 minute and try again.');
  }
  const left = PIN_MAX_ATTEMPTS - attempts;
  throw new Error(`Incorrect PIN. ${left} attempt${left === 1 ? '' : 's'} left.`);
}
