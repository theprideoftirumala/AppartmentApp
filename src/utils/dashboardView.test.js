import { describe, expect, it } from 'vitest';
import { dashboardAvailableBalance, flatStatusClass } from './dashboardView';

describe('flatStatusClass', () => {
  it('does not throw when a new sheet row has no status', () => {
    expect(flatStatusClass(undefined)).toBe('pending');
    expect(flatStatusClass(null)).toBe('pending');
    expect(flatStatusClass('PAID')).toBe('paid');
  });
});

describe('dashboardAvailableBalance', () => {
  it('uses the ledger total after the sheet is created', () => {
    expect(dashboardAvailableBalance({ currentBalance: 612 }, { OPENING_SURPLUS: 612 })).toBe(612);
    expect(dashboardAvailableBalance({ currentBalance: 11712 }, {})).toBe(11712);
  });

  it('falls back to opening surplus when totals are empty', () => {
    expect(dashboardAvailableBalance({}, {})).toBe(612);
    expect(dashboardAvailableBalance(undefined, undefined)).toBe(612);
  });
});
