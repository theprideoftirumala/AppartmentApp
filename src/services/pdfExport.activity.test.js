import { describe, expect, it } from 'vitest';
import { mapActivityExpenses } from './pdfExport';

describe('mapActivityExpenses', () => {
  it('maps activity rows into the monthly expense columns', () => {
    const rows = mapActivityExpenses([
      { date: '2026-09-12', description: 'Idol', amount: 2500, paidBy: '401', paymentMode: 'UPI' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe('Paid by 401');
    expect(rows[0].amount).toBe(2500);
    expect(rows[0].billReceipt).toBe('N');
  });
});
