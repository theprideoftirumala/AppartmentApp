import { describe, expect, it } from 'vitest';
import {
  buildImportedWorkbookView,
  expensesForMonth,
  importedExpenseCsv,
  pickImportedMonth,
  spreadsheetIdFromInput,
} from './importedIandE';

describe('spreadsheetIdFromInput', () => {
  it('reads an id from a Docs URL and ignores junk', () => {
    expect(spreadsheetIdFromInput('https://docs.google.com/spreadsheets/d/1ImportedIandEExampleId0123456789abcd/edit')).toBe('1ImportedIandEExampleId0123456789abcd');
    expect(spreadsheetIdFromInput('not-a-sheet')).toBe('');
  });
});

describe('buildImportedWorkbookView', () => {
  it('reads Aug-26 collections and expenses from the I&E Summary shape', () => {
    const summary = Array.from({ length: 22 }, () => []);
    summary[1] = ['Last updated:', '8/30/2026', '', 'Available balance:', 612.54];
    summary[9] = ['Flat', 'Owner', "August '26", "Sep '26"];
    summary[10] = ['101', '', 3000, 0];
    summary[11] = ['102', '', 3000, 0];
    summary[20] = ['Cleaning', '', 1500, 0];
    summary[21] = ['Watchman Salary', '', 8500, 0];
    const detailed = [
      ['2026-08-05', 1500, 'Housekeeping'],
      ['2026-09-02', 200, 'Muggu powder'],
    ];
    const view = buildImportedWorkbookView({
      fileName: 'Backup - I&E Summary',
      fileId: 'abc',
      summaryGrid: summary,
      detailedGrid: detailed,
    });
    expect(view.availableBalance).toBe(612.54);
    expect(view.months).toContain('Aug-26');
    expect(view.collections.filter((row) => row.month === 'Aug-26' && row.amount === 3000)).toHaveLength(2);
    expect(view.expenses.some((row) => row.month === 'Aug-26' && row.amount === 1500)).toBe(true);
    expect(pickImportedMonth(view.months, 'Sep-26')).toBe('Sep-26');
    const csv = importedExpenseCsv(expensesForMonth(view.expenses, 'Aug-26'), 'Aug-26');
    expect(csv).toContain('Housekeeping');
    expect(csv).toContain('1500');
  });
});
