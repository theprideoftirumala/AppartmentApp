import { describe, expect, it } from 'vitest';
import {
  categoryFromMemo,
  dateToMonthLabel,
  expenseRowsFromDetailedGrid,
  isHistoryMonth,
  isLiveAppMonth,
  maintenanceRowsFromSummaryGrid,
  parseSheetDate,
  toAppMonthLabel,
} from './legacySheetImport';

describe('toAppMonthLabel', () => {
  it('reads the Summary tab month headers', () => {
    expect(toAppMonthLabel("Nov'20")).toBe('Nov-20');
    expect(toAppMonthLabel("July '25")).toBe('Jul-25');
    expect(toAppMonthLabel("August '26")).toBe('Aug-26');
    expect(toAppMonthLabel("Sep'26")).toBe('Sep-26');
    expect(toAppMonthLabel('')).toBe('');
  });
});

describe('parseSheetDate', () => {
  it('reads ISO, d/m/y, and Excel serial dates', () => {
    expect(parseSheetDate('2026-08-28')).toBe('2026-08-28');
    expect(parseSheetDate('28/8/2026')).toBe('2026-08-28');
    expect(dateToMonthLabel('2026-08-28')).toBe('Aug-26');
  });
});

describe('history import', () => {
  it('copies flat collections and drops names and carry-forward', () => {
    const rows = maintenanceRowsFromSummaryGrid([
      ['Flat number', 'Name of the owner', "Nov'20", "Sep'26"],
      ['Carry Forward', '', 100, ''],
      ['101', 'Someone', 2000, ''],
      ['102.0', 'Someone else', 2000, 3000],
    ]);
    expect(rows).toEqual([
      ['Nov-20', '101', 2000, 2000, '', '', '', 'PAID', 0, 'From Summary tab'],
      ['Nov-20', '102', 2000, 2000, '', '', '', 'PAID', 0, 'From Summary tab'],
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/Someone/i);
  });

  it('skips Sep 2026 onward so the live start date is not imported', () => {
    expect(toAppMonthLabel("Sep'26")).toBe('Sep-26');
    const rows = maintenanceRowsFromSummaryGrid([
      ['Flat number', 'Name', "August '26", "Sep'26"],
      ['101', 'Someone', 2500, 3000],
    ]);
    expect(rows).toEqual([
      ['Aug-26', '101', 2500, 2500, '', '', '', 'PAID', 0, 'From Summary tab'],
    ]);
  });

  it('copies Exp-Detailed lines without inventing amounts', () => {
    const rows = expenseRowsFromDetailedGrid([
      ['28/8/2026', 1100, 'water tanker'],
      ['', '', 'note only'],
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe('EXP-HIST-1');
    expect(rows[0][3]).toBe('water tanker');
    expect(rows[0][4]).toBe('Water Tankers');
    expect(rows[0][5]).toBe(1100);
    expect(expenseRowsFromDetailedGrid([
      ['15/9/2026', 3000, 'after handover'],
    ])).toEqual([]);
  });

  it('treats Aug-26 as history and Sep-26 as live', () => {
    expect(isHistoryMonth('Aug-26')).toBe(true);
    expect(isLiveAppMonth('Sep-26')).toBe(true);
    expect(isHistoryMonth('Sep-26')).toBe(false);
  });

  it('maps common memos to categories', () => {
    expect(categoryFromMemo('15 days salary')).toBe('Watchman Salary');
    expect(categoryFromMemo('unknown item')).toBe('Sundry');
  });
});
