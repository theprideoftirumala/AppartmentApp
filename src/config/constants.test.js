import { describe, expect, it } from 'vitest';
import { APP_VERSION, DEFAULT_CONFIG, FEATURES, FIRST_LIVE_MONTH_LABEL, LIVE_APP_START, LIVE_SHEET_FILE_NAME, MAINTENANCE_MIN_DATE, SHEET_FILE_NAME, SOCIETY_DISCLAIMER, isLiveSocietySheetName, isLiveWorkbookName, isSampleDataEnabled, isSocietySheetName } from './constants';

describe('feature flags', () => {
  it('keeps late fee and misc funds off in the app', () => {
    expect(FEATURES.LATE_FEE).toBe(false);
    expect(FEATURES.SURPLUS_DEFICIT).toBe(false);
    expect(FEATURES.MISC_FUNDS).toBe(false);
    expect(FEATURES.VOICE_EXPENSES).toBe(true);
    expect(FEATURES.CAMERA_EXPENSES).toBe(true);
    expect(FEATURES.ACTIVITY_FUNDS).toBe(true);
    expect(FEATURES.SAMPLE_DATA).toBe(false);
    expect(DEFAULT_CONFIG.SAMPLE_DATA).toBe('N');
    expect(DEFAULT_CONFIG.DEFICIT_LAST_YEAR).toBe(0);
    expect(DEFAULT_CONFIG).not.toHaveProperty('AVAILABLE_BALANCE');
    expect(DEFAULT_CONFIG.FISCAL_YEAR_START).toBe('2020-11');
    expect(LIVE_APP_START).toBe('2026-08');
    expect(FIRST_LIVE_MONTH_LABEL).toBe('Aug-26');
    expect(MAINTENANCE_MIN_DATE).toBe('2020-11-01');
    expect(DEFAULT_CONFIG.WATCHMAN_SALARY).toBe(8500);
    expect(DEFAULT_CONFIG).not.toHaveProperty('LATE_FEE');
    expect(DEFAULT_CONFIG).not.toHaveProperty('LATE_FEE_AFTER_DAY');
    expect(DEFAULT_CONFIG).not.toHaveProperty('EMERGENCY_RESERVE');
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

describe('society workbook name', () => {
  it('accepts The Pride of Tirumala-APP with or without .xlsx', () => {
    expect(SHEET_FILE_NAME).toBe('The Pride of Tirumala-APP');
    expect(isSocietySheetName('The Pride of Tirumala-APP')).toBe(true);
    expect(isSocietySheetName('The Pride of Tirumala-APP.xlsx')).toBe(true);
    expect(isSocietySheetName('TPT-MaintenanceTracker')).toBe(false);
    expect(isSocietySheetName('The Pride of Tirumala-APP-old')).toBe(false);
    expect(isSocietySheetName('')).toBe(false);
    expect(isLiveSocietySheetName('The Pride of Tirumala-APP')).toBe(true);
    expect(isLiveSocietySheetName('The Pride of Tirumala-APP.xlsx')).toBe(false);
    expect(isLiveSocietySheetName('The Pride of Tirumala-APP-old')).toBe(false);
    expect(LIVE_SHEET_FILE_NAME).toBe('The Pride of Tirumala-LIVE');
    expect(isLiveWorkbookName('The Pride of Tirumala-LIVE')).toBe(true);
    expect(isLiveWorkbookName('The Pride of Tirumala-APP')).toBe(false);
    expect(isLiveWorkbookName('TPT-MaintenanceTracker')).toBe(false);
  });
});
