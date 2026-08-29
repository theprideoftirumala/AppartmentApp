import { describe, expect, it } from 'vitest';
import { APP_VERSION, DEFAULT_CONFIG, FEATURES, SOCIETY_DISCLAIMER, isSampleDataEnabled } from './constants';

describe('feature flags', () => {
  it('keeps late fee and misc funds off in the app', () => {
    expect(FEATURES.LATE_FEE).toBe(false);
    expect(FEATURES.MISC_FUNDS).toBe(false);
    expect(FEATURES.VOICE_EXPENSES).toBe(true);
    expect(FEATURES.CAMERA_EXPENSES).toBe(true);
    expect(FEATURES.ACTIVITY_FUNDS).toBe(true);
    expect(FEATURES.SAMPLE_DATA).toBe(false);
    expect(DEFAULT_CONFIG.SAMPLE_DATA).toBe('N');
    expect(DEFAULT_CONFIG.DEFICIT_LAST_YEAR).toBe(612);
    expect(DEFAULT_CONFIG.WATCHMAN_SALARY).toBe(8500);
  });

  it('keeps sample data off after handover', () => {
    expect(isSampleDataEnabled()).toBe(false);
    expect(isSampleDataEnabled({ SAMPLE_DATA: 'N' })).toBe(false);
    expect(isSampleDataEnabled({ SAMPLE_DATA: 'Y' })).toBe(false);
  });
});

describe('society disclaimer', () => {
  it('is cooperative and does not blame members', () => {
    expect(SOCIETY_DISCLAIMER).toMatch(/volunteers/i);
    expect(SOCIETY_DISCLAIMER).toMatch(/support one another/i);
    expect(SOCIETY_DISCLAIMER).not.toMatch(/do not complain/i);
    expect(SOCIETY_DISCLAIMER).not.toMatch(/not responsible for anything/i);
  });
});

describe('app version', () => {
  it('is a semver string', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
