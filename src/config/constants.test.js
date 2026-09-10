import { describe, expect, it } from 'vitest';
import {
  APP_VERSION,
  DEFAULT_CONFIG,
  DRIVE_ROOT_FOLDER,
  FEATURES,
  FIRST_APP_MONTH,
  FIRST_APP_MONTH_LABEL,
  MAINTENANCE_MIN_DATE,
  OPENING_SURPLUS,
  SHEET_FILE_NAME,
  SOCIETY_DISCLAIMER,
  REPORT_NOTE_TITLE,
  REPORT_NOTE_LINES,
  isSampleDataEnabled,
  isSocietySheetName,
} from './constants';

describe('feature flags', () => {
  it('keeps late fee and misc funds off and surplus on', () => {
    expect(FEATURES.LATE_FEE).toBe(false);
    expect(FEATURES.SURPLUS_DEFICIT).toBe(true);
    expect(FEATURES.MISC_FUNDS).toBe(false);
    expect(FEATURES.VOICE_EXPENSES).toBe(true);
    expect(FEATURES.CAMERA_EXPENSES).toBe(true);
    expect(FEATURES.ACTIVITY_FUNDS).toBe(true);
    expect(FEATURES.SAMPLE_DATA).toBe(false);
    expect(DEFAULT_CONFIG.SAMPLE_DATA).toBe('N');
    expect(DEFAULT_CONFIG.OPENING_SURPLUS).toBe(612);
    expect(DEFAULT_CONFIG.FISCAL_YEAR_START).toBe('2026-09');
    expect(FIRST_APP_MONTH).toBe('2026-09');
    expect(FIRST_APP_MONTH_LABEL).toBe('Sep-26');
    expect(OPENING_SURPLUS).toBe(612);
    expect(MAINTENANCE_MIN_DATE).toBe('2026-09-01');
    expect(DEFAULT_CONFIG).not.toHaveProperty('AVAILABLE_BALANCE');
    expect(DEFAULT_CONFIG).not.toHaveProperty('LATE_FEE');
  });

  it('keeps sample data off', () => {
    expect(isSampleDataEnabled()).toBe(false);
    expect(isSampleDataEnabled({ SAMPLE_DATA: 'Y' })).toBe(false);
  });
});

describe('society disclaimer', () => {
  it('is cooperative and does not blame members', () => {
    expect(SOCIETY_DISCLAIMER).toMatch(/volunteers/i);
    expect(SOCIETY_DISCLAIMER).toMatch(/support one another/i);
    expect(SOCIETY_DISCLAIMER).not.toMatch(/IMPORTANT NOTE/i);
  });

  it('explains the report without blaming any family', () => {
    expect(REPORT_NOTE_TITLE).toMatch(/how to read this report/i);
    const note = REPORT_NOTE_LINES.join(' ');
    expect(note).toMatch(/no family is being singled out/i);
    expect(note).not.toMatch(/not final/i);
    expect(note).not.toMatch(/IMPORTANT NOTE/i);
  });
});

describe('app version', () => {
  it('is a semver string', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('society workbook', () => {
  it('is APP-TPT-Tracker in TPT-APP-Tracker', () => {
    expect(SHEET_FILE_NAME).toBe('APP-TPT-Tracker');
    expect(DRIVE_ROOT_FOLDER).toBe('TPT-APP-Tracker');
    expect(isSocietySheetName('APP-TPT-Tracker')).toBe(true);
    expect(isSocietySheetName('The Pride of Tirumala-APP')).toBe(false);
    expect(isSocietySheetName('TPT-MaintenanceTracker')).toBe(false);
    expect(isSocietySheetName('APP-TPT-Tracker-old')).toBe(false);
  });
});
