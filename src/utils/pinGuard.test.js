import { afterEach, describe, expect, it } from 'vitest';
import {
  PIN_MAX_ATTEMPTS,
  assertPinFormat,
  assertPinUnlocked,
  clearPinLock,
  pinAttemptDelayMs,
  registerFailedPinAttempt,
} from './pinGuard';

afterEach(() => {
  clearPinLock();
});

describe('assertPinFormat', () => {
  it('accepts a six-digit PIN', () => {
    expect(assertPinFormat('123456')).toBe('123456');
  });

  it('rejects a four-digit PIN', () => {
    expect(() => assertPinFormat('1234')).toThrow(/6 to 12 digits/);
  });
});

describe('registerFailedPinAttempt', () => {
  it('locks after five failures', () => {
    for (let i = 0; i < PIN_MAX_ATTEMPTS - 1; i += 1) {
      expect(() => registerFailedPinAttempt(1_000)).toThrow(/Incorrect PIN/);
    }
    expect(() => registerFailedPinAttempt(1_000)).toThrow(/Wait 1 minute/);
    expect(() => assertPinUnlocked(1_000)).toThrow(/Try again in/);
    expect(() => assertPinUnlocked(1_000 + 61_000)).not.toThrow();
  });
});

describe('pinAttemptDelayMs', () => {
  it('grows with failed attempts', () => {
    expect(pinAttemptDelayMs(1)).toBe(300);
    expect(pinAttemptDelayMs(3)).toBe(1200);
  });
});
