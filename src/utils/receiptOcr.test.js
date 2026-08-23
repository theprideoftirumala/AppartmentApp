import { describe, expect, it } from 'vitest';
import { EXPENSE_CATEGORIES } from '../config/constants';
import { parseReceiptText } from './receiptOcr';

describe('parseReceiptText', () => {
  it('fills amount and category from a BESCOM-style bill', () => {
    const line = parseReceiptText('BESCOM electricity bill\nRs. 2,400\nDate 12/09/2026', EXPENSE_CATEGORIES);
    expect(line.amount).toBe('2400');
    expect(line.category).toBe('Common Electricity');
    expect(line.date).toBe('2026-09-12');
  });

  it('picks the largest rupee figure when many numbers are present', () => {
    const line = parseReceiptText('Bill no 18 tanker 800 litres Total 1800', EXPENSE_CATEGORIES);
    expect(line.amount).toBe('1800');
    expect(line.category).toBe('Water Tankers');
  });
});
