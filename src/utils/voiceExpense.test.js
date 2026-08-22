import { describe, expect, it } from 'vitest';
import { EXPENSE_CATEGORIES } from '../config/constants';
import { parseExpensesFromSpeech, parseOneExpense } from './voiceExpense';

describe('parseOneExpense', () => {
  it('fills amount, category, and UPI by default', () => {
    const line = parseOneExpense('watchman salary 12000', EXPENSE_CATEGORIES);
    expect(line.amount).toBe('12000');
    expect(line.category).toBe('Watchman Salary');
    expect(line.paymentMode).toBe('UPI');
    expect(line.description.toLowerCase()).toContain('watchman');
  });

  it('detects cash and electricity', () => {
    const line = parseOneExpense('electricity 2400 cash', EXPENSE_CATEGORIES);
    expect(line.amount).toBe('2400');
    expect(line.category).toBe('Common Electricity');
    expect(line.paymentMode).toBe('Cash');
  });

  it('returns empty amount when none is spoken', () => {
    const line = parseOneExpense('plumbing repair', EXPENSE_CATEGORIES);
    expect(line.amount).toBe('');
    expect(line.category).toBe('Plumbing');
  });
});

describe('parseExpensesFromSpeech', () => {
  it('splits multiple expenses on and/then/also', () => {
    const lines = parseExpensesFromSpeech(
      'watchman salary 12000 and electricity 2400 then water tanker 800',
      EXPENSE_CATEGORIES,
    );
    expect(lines).toHaveLength(3);
    expect(lines[0].amount).toBe('12000');
    expect(lines[1].amount).toBe('2400');
    expect(lines[2].amount).toBe('800');
    expect(lines[2].category).toBe('Water Tankers');
  });

  it('returns an empty list for blank speech', () => {
    expect(parseExpensesFromSpeech('   ', EXPENSE_CATEGORIES)).toEqual([]);
  });
});
