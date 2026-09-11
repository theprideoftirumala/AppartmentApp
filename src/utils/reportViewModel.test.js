import { describe, expect, it } from 'vitest';
import { OPENING_SURPLUS, buildLedger } from './ledgerMath';
import {
  SAMPLE_OCT_EXPENSES,
  SAMPLE_OCT_PAYMENTS,
  SAMPLE_SEP_EXPENSES,
  SAMPLE_SEP_PAYMENTS,
  expensesFromCsvRows,
  maintenanceFromCsvRows,
} from './workbookCsv';
import { SHEET_HEADERS, SHEET_NAMES } from '../config/constants';
import { shareReportText, stillDueResidentCopy, ytdRowsThroughMonth } from './reportViewModel';

function sampleLedger() {
  return buildLedger({
    opening: OPENING_SURPLUS,
    maintenance: maintenanceFromCsvRows([
      SHEET_HEADERS[SHEET_NAMES.MAINTENANCE],
      ...SAMPLE_SEP_PAYMENTS,
      ...SAMPLE_OCT_PAYMENTS,
    ]),
    expenses: expensesFromCsvRows([
      SHEET_HEADERS[SHEET_NAMES.EXPENSES],
      ...SAMPLE_SEP_EXPENSES,
      ...SAMPLE_OCT_EXPENSES,
    ]),
  });
}

describe('ytdRowsThroughMonth', () => {
  it('keeps only Sep when Sep is selected after Oct exists', () => {
    const rows = ytdRowsThroughMonth(sampleLedger(), 'Sep-26');
    expect(rows.map((row) => row.month)).toEqual(['Sep-26']);
  });

  it('includes Sep and Oct when Oct is selected', () => {
    const rows = ytdRowsThroughMonth(sampleLedger(), 'Oct-26');
    expect(rows.map((row) => row.month)).toEqual(['Sep-26', 'Oct-26']);
  });
});

describe('shareReportText', () => {
  it('labels this-month net and available separately', () => {
    const text = shareReportText({
      month: 'Oct-26',
      totalCollection: 15000,
      totalExpenses: 20000,
      netBalance: -5000,
      monthStatus: 'DEFICIT',
      cumulativeBalance: 6712,
      availableStatus: 'SURPLUS',
    });
    expect(text).toContain('This month: DEFICIT');
    expect(text).toContain('Available after Oct-26: SURPLUS');
    expect(text).not.toMatch(/Balance: ₹-5,000/);
    expect(text).toContain('The Google Sheet is the source of truth');
  });
});

describe('stillDueResidentCopy', () => {
  it('states the total without naming a flat', () => {
    const copy = stillDueResidentCopy({
      total: 3000,
      rows: [{ flat: '202', stillDue: 3000 }],
    });
    expect(copy).toContain('₹3,000');
    expect(copy).toContain('1 flat');
    expect(copy).not.toContain('202');
  });
});
