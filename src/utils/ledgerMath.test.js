import { describe, expect, it } from 'vitest';
import {
  FIRST_BOOKS_MONTH,
  OPENING_SURPLUS,
  availableBalance,
  buildLedger,
  cashStatus,
  monthNet,
  pdfMoneySummary,
} from './ledgerMath';
import {
  SAMPLE_OCT_EXPENSES,
  SAMPLE_OCT_PAYMENTS,
  SAMPLE_SEP_EXPENSES,
  SAMPLE_SEP_PAYMENTS,
  expensesFromCsvRows,
  maintenanceFromCsvRows,
} from './workbookCsv';
import { SHEET_HEADERS, SHEET_NAMES } from '../config/constants';

function sampleMaintenance() {
  return maintenanceFromCsvRows([
    SHEET_HEADERS[SHEET_NAMES.MAINTENANCE],
    ...SAMPLE_SEP_PAYMENTS,
    ...SAMPLE_OCT_PAYMENTS,
  ]);
}

function sampleExpenses() {
  return expensesFromCsvRows([
    SHEET_HEADERS[SHEET_NAMES.EXPENSES],
    ...SAMPLE_SEP_EXPENSES,
    ...SAMPLE_OCT_EXPENSES,
  ]);
}

describe('ledger math', () => {
  it('starts with carry-forward surplus 612', () => {
    expect(OPENING_SURPLUS).toBe(612);
    expect(FIRST_BOOKS_MONTH).toBe('Sep-26');
    expect(availableBalance(612, 0, 0)).toBe(612);
    expect(cashStatus(612)).toBe('SURPLUS');
  });

  it('treats collected minus spent as surplus or deficit', () => {
    expect(monthNet(24000, 14400)).toBe(9600);
    expect(cashStatus(9600)).toBe('SURPLUS');
    expect(cashStatus(-5000)).toBe('DEFICIT');
    expect(cashStatus(0)).toBe('BALANCED');
  });

  it('computes Sep-26 and Oct-26 from the local CSV sample', () => {
    const ledger = buildLedger({
      opening: OPENING_SURPLUS,
      maintenance: sampleMaintenance(),
      expenses: sampleExpenses(),
    });

    expect(ledger.opening).toBe(612);
    expect(ledger.months[0].month).toBe('Sep-26');
    expect(ledger.months[0].collection).toBe(25500);
    expect(ledger.months[0].expenses).toBe(14400);
    expect(ledger.months[0].net).toBe(11100);
    expect(ledger.months[0].status).toBe('SURPLUS');
    expect(ledger.months[0].running).toBe(11712);

    expect(ledger.months[1].month).toBe('Oct-26');
    expect(ledger.months[1].collection).toBe(15000);
    expect(ledger.months[1].expenses).toBe(20000);
    expect(ledger.months[1].net).toBe(-5000);
    expect(ledger.months[1].status).toBe('DEFICIT');
    expect(ledger.months[1].running).toBe(6712);
    expect(ledger.available).toBe(6712);
    expect(ledger.status).toBe('SURPLUS');
  });

  it('prints opening, month result, and available balance for the PDF', () => {
    const ledger = buildLedger({
      opening: OPENING_SURPLUS,
      maintenance: sampleMaintenance(),
      expenses: sampleExpenses(),
    });
    const pdf = pdfMoneySummary(ledger, 'Sep-26');
    expect(pdf.openingSurplus).toBe(612);
    expect(pdf.monthStatus).toBe('SURPLUS');
    expect(pdf.availableBalance).toBe(11712);
    expect(pdf.availableStatus).toBe('SURPLUS');
  });

  it('ignores months before Sep-26', () => {
    const ledger = buildLedger({
      opening: 612,
      maintenance: [{ month: 'Aug-26', amountPaid: 30000, status: 'PAID' }],
      expenses: [],
    });
    expect(ledger.totalCollection).toBe(0);
    expect(ledger.available).toBe(612);
    expect(ledger.months[0].month).toBe('Sep-26');
  });
});
