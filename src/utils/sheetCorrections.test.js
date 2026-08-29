import { describe, expect, it } from 'vitest';
import { amountsDiffer, dashboardCorrectionMessages } from './sheetCorrections';

describe('amountsDiffer', () => {
  it('ignores rounding under five paise', () => {
    expect(amountsDiffer(100, 100.04)).toBe(false);
    expect(amountsDiffer(100, 100.06)).toBe(true);
  });

  it('does not compare missing values', () => {
    expect(amountsDiffer(null, 10)).toBe(false);
  });
});

describe('dashboardCorrectionMessages', () => {
  it('is silent when sheet formulas match the app totals', () => {
    expect(dashboardCorrectionMessages({
      liveSnap: { running: 500, collection: 3000, expenses: 1000 },
      appBalance: 500,
      monthCollection: 3000,
      monthExpenses: 1000,
      sheetStillDue: 0,
      computedStillDue: 0,
      monthLabel: 'Sep-26',
    })).toEqual([]);
  });

  it('asks for a Maintenance check when collection formulas disagree', () => {
    const messages = dashboardCorrectionMessages({
      liveSnap: { running: 500, collection: 0, expenses: 0 },
      appBalance: 500,
      monthCollection: 3000,
      monthExpenses: 0,
      monthLabel: 'Sep-26',
    });
    expect(messages.length).toBe(1);
    expect(messages[0]).toMatch(/Maintenance Amount Paid/);
    expect(messages[0]).not.toMatch(/₹/);
  });
});
