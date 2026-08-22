import { describe, expect, it } from 'vitest';
import { APP_VERSION, FEATURES, SOCIETY_DISCLAIMER } from './constants';

describe('feature flags', () => {
  it('keeps late fee and misc funds off in the app', () => {
    expect(FEATURES.LATE_FEE).toBe(false);
    expect(FEATURES.MISC_FUNDS).toBe(false);
    expect(FEATURES.VOICE_EXPENSES).toBe(true);
  });
});

describe('society disclaimer', () => {
  it('asks owners to cooperate and not complain about delays', () => {
    expect(SOCIETY_DISCLAIMER).toMatch(/not responsible/i);
    expect(SOCIETY_DISCLAIMER).toMatch(/cooperate/i);
    expect(SOCIETY_DISCLAIMER).toMatch(/convenience/i);
  });
});

describe('app version', () => {
  it('is a semver string', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
