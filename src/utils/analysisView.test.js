import { describe, expect, it } from 'vitest';
import { OPENING_SURPLUS, buildLedger, pdfMoneySummary } from './ledgerMath';
import {
  SAMPLE_OCT_EXPENSES,
  SAMPLE_OCT_PAYMENTS,
  SAMPLE_SEP_EXPENSES,
  SAMPLE_SEP_PAYMENTS,
} from './workbookCsv';
import { analysisForMonth } from './analysisView';

function payments(rows) {
  return rows.map((row) => ({
    month: row[0],
    flat: row[1],
    amountDue: Number(row[2]),
    amountPaid: Number(row[3]),
    status: row[7],
  }));
}

function bills(rows) {
  return rows.map((row) => ({
    month: row[2],
    description: row[3],
    category: row[4],
    amount: Number(row[5]),
    paymentMode: row[6],
  }));
}

function books() {
  const maintenance = payments([...SAMPLE_SEP_PAYMENTS, ...SAMPLE_OCT_PAYMENTS]);
  const expenses = bills([...SAMPLE_SEP_EXPENSES, ...SAMPLE_OCT_EXPENSES]);
  const ledger = buildLedger({ opening: OPENING_SURPLUS, maintenance, expenses });
  return { maintenance, expenses, ledger };
}

describe('analysisForMonth', () => {
  it('matches the cash-book figures for September and stops year-to-date there', () => {
    const { maintenance, expenses, ledger } = books();
    const view = analysisForMonth({ ledger, maintenance, expenses, month: 'Sep-26' });
    const money = pdfMoneySummary(ledger, 'Sep-26');

    expect(view.money).toEqual(money);
    expect(view.money.monthCollection).toBe(25500);
    expect(view.money.monthExpenses).toBe(14400);
    expect(view.money.availableBalance).toBe(11712);
    expect(view.ytd.map((row) => row.month)).toEqual(['Sep-26']);
    expect(view.spendChange).toBeNull();
    expect(view.collectionChange).toBeNull();
    expect(view.categories.map((row) => [row.label, row.amount])).toEqual([
      ['Watchman Salary', 12000],
      ['Common Electricity', 2400],
    ]);
    expect(view.modes).toEqual([
      { key: 'Bank Transfer', label: 'Bank Transfer', amount: 12000 },
      { key: 'UPI', label: 'UPI', amount: 2400 },
    ]);
    expect(view.counts).toMatchObject({ paid: 8, pending: 1, partial: 1, total: 10 });
    expect(view.stillDue.total).toBe(4500);
    expect(view.stillDue.rows).toHaveLength(2);
    expect(view.flats.find((row) => row.flat === '501')).toMatchObject({ paid: 0, due: 3000, stillDue: 3000 });
    expect(view.flats.find((row) => row.flat === '502')).toMatchObject({ paid: 1500, status: 'PARTIAL' });
    expect(view.water).toEqual({ amount: 0, count: 0 });
    expect(view.flats.some((row) => row.ownerName)).toBe(false);
  });

  it('compares October only with the previous month that is on the books', () => {
    const { maintenance, expenses, ledger } = books();
    const view = analysisForMonth({ ledger, maintenance, expenses, month: 'Oct-26' });

    expect(view.money.monthCollection).toBe(15000);
    expect(view.money.monthExpenses).toBe(20000);
    expect(view.money.monthNet).toBe(-5000);
    expect(view.money.monthStatus).toBe('DEFICIT');
    expect(view.money.availableBalance).toBe(6712);
    expect(view.ytd.map((row) => row.month)).toEqual(['Sep-26', 'Oct-26']);
    expect(view.spendChange).toEqual({
      previousMonth: 'Sep-26',
      previous: 14400,
      current: 20000,
      delta: 5600,
    });
    expect(view.collectionChange.delta).toBe(15000 - 25500);
    expect(view.categories.map((row) => row.label)).toEqual(['Watchman Salary', 'Lift Service']);
    expect(view.counts.paid).toBe(5);
    expect(view.counts.pending).toBe(5);
  });

  it('counts a water category only when the expense category says water', () => {
    const view = analysisForMonth({
      maintenance: [],
      expenses: [
        { month: 'Sep-26', category: 'Water Tankers', amount: 1400, paymentMode: 'UPI' },
        { month: 'Sep-26', category: 'Watchman Salary', amount: 12000, paymentMode: 'Cash', description: 'water cooler repair' },
        { month: 'Oct-26', category: 'Water Charges', amount: 900, paymentMode: 'UPI' },
      ],
      month: 'Sep-26',
      config: { OPENING_SURPLUS: 612 },
    });
    expect(view.water).toEqual({ amount: 1400, count: 1 });
    expect(view.modes.find((row) => row.label === 'UPI').amount).toBe(1400);
  });

  it('returns empty series for a month with no rows', () => {
    const view = analysisForMonth({
      maintenance: [],
      expenses: [],
      month: 'Sep-26',
      config: { OPENING_SURPLUS: 612 },
    });
    expect(view.money.openingSurplus).toBe(612);
    expect(view.money.monthCollection).toBe(0);
    expect(view.money.monthExpenses).toBe(0);
    expect(view.categories).toEqual([]);
    expect(view.modes).toEqual([]);
    expect(view.flats).toEqual([]);
    expect(view.statuses).toEqual([]);
    expect(view.stillDue.total).toBe(0);
    expect(view.water).toEqual({ amount: 0, count: 0 });
  });
});
