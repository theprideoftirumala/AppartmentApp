import { describe, expect, it } from 'vitest';
import {
  availableBalanceFromSummaryGrid,
  categoryFromMemo,
  categoryFromSummaryLabel,
  parsePaidAmount,
  dateToMonthLabel,
  expenseRowsFromDetailedGrid,
  expenseRowsFromSummaryGrid,
  findFlatNumber,
  isHistoryMonth,
  isLiveAppMonth,
  leftoverDuplicateImportIndexes,
  maintenanceRowsFromSummaryGrid,
  mergeHistoryExpenses,
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

  it('reads a flat number from column A or B and skips surplus', () => {
    expect(findFlatNumber(['101', 'Rama Rao'])).toBe('101');
    expect(findFlatNumber(['', '502', 'Nanaji'])).toBe('502');
    const rows = maintenanceRowsFromSummaryGrid([
      ['S.No', 'Flat', 'Owner', "Mar '26"],
      ['', 'Carry Forward', '', 28487],
      ['1', '502', 'Someone', 3000],
    ]);
    expect(rows).toEqual([
      ['Mar-26', '502', 3000, 3000, '', '', '', 'PAID', 0, 'From Summary tab'],
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/Someone|Nanaji|Rama/i);
  });

  it('reads formatted collection cells from Summary', () => {
    expect(parsePaidAmount('3,000')).toBe(3000);
    expect(parsePaidAmount(3000)).toBe(3000);
    const rows = maintenanceRowsFromSummaryGrid([
      ['Flat number', 'Name of the owner', "May '26"],
      ['101', 'Someone', '3,000'],
    ]);
    expect(rows[0][3]).toBe(3000);
  });

  it('reads the Summary Available balance cell', () => {
    expect(availableBalanceFromSummaryGrid([
      ['Last updated', '8/29/2026'],
      ['Available balance', '1,732.54'],
    ])).toBe(1732.54);
  });

  it('maps common memos to categories', () => {
    expect(categoryFromMemo('15 days salary')).toBe('Watchman Salary');
    expect(categoryFromMemo('unknown item')).toBe('Sundry');
  });

  it('reads Summary expense categories including Sundry and skips totals', () => {
    expect(categoryFromSummaryLabel('Sundry expenses')).toBe('Sundry');
    expect(categoryFromSummaryLabel('Salary - Watchmen')).toBe('Watchman Salary');
    expect(categoryFromSummaryLabel('Total expenses')).toBe('');
    const rows = expenseRowsFromSummaryGrid([
      ['Flat', 'Name', "Sep '24", "Sep '26"],
      ['101', 'Someone', 3000, 3000],
      ['Cleaning', '', 2000, 100],
      ['Sundry expenses', '', 859, 50], // 859 is an amount, not flat 859
      ['Total expenses', '', 2859, 150],
      ['(deficit) balance', '', 1713, 0],
    ]);
    expect(rows).toEqual([
      ['EXP-SUM-1', '2024-09-30', 'Sep-24', 'Cleaning', 'Cleaning', 2000, '', 'N', '', '', 'From Summary tab'],
      ['EXP-SUM-2', '2024-09-30', 'Sep-24', 'Sundry expenses', 'Sundry', 859, '', 'N', '', '', 'From Summary tab'],
    ]);
  });

  it('keeps Exp-Detailed lines and does not add matching Summary totals', () => {
    const detailed = expenseRowsFromDetailedGrid([
      ['30/9/2024', 2000, 'cleaning'],
      ['30/9/2024', 859, 'misc hardware'],
    ]);
    const summary = expenseRowsFromSummaryGrid([
      ['', '', "Sep '24"],
      ['Cleaning', '', 2000],
      ['Sundry expenses', '', 859],
    ]);
    const merged = mergeHistoryExpenses(detailed, summary);
    expect(merged).toHaveLength(2);
    expect(merged.every((row) => row[10] === 'From Exp - Detailed')).toBe(true);
  });

  it('adds a Summary Sundry row only when Exp-Detailed does not cover it', () => {
    const detailed = expenseRowsFromDetailedGrid([
      ['30/9/2024', 2000, 'cleaning'],
    ]);
    const summary = expenseRowsFromSummaryGrid([
      ['', '', "Sep '24"],
      ['Cleaning', '', 2000],
      ['Sundry expenses', '', 859],
    ]);
    const merged = mergeHistoryExpenses(detailed, summary);
    expect(merged).toHaveLength(2);
    expect(merged[0][3]).toBe('cleaning');
    expect(merged[1][3]).toBe('Sundry expenses');
    expect(merged[1][5]).toBe(859);
  });

  it('flags imported Summary rollups that duplicate detailed lines', () => {
    const rows = [
      ['EXP-HIST-1', '2024-09-30', 'Sep-24', 'cleaning', 'Cleaning', 2000, '', 'N', '', '', 'From Exp - Detailed'],
      ['EXP-SUM-1', '2024-09-30', 'Sep-24', 'Cleaning', 'Cleaning', 2000, '', 'N', '', '', 'From Summary tab'],
      ['EXP-APP-1', '2024-09-30', 'Sep-24', 'new live item', 'Sundry', 10, '', 'N', '', '', ''],
    ];
    expect(leftoverDuplicateImportIndexes(rows)).toEqual([1]);
  });
});
