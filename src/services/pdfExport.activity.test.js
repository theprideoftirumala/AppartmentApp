import { describe, expect, it } from 'vitest';
import { generateActivityReport, mapActivityExpenses } from './pdfExport';

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

  it('does not print the monthly water quote on an activity fund PDF', async () => {
    const doc = await generateActivityReport({
      activity: { name: 'Ganesh', status: 'Open', target: 500, notes: '' },
      detail: { collected: 500, spent: 0, balance: 500, expenses: [], members: [] },
    });
    const text = [...String(doc.output()).matchAll(/\(((?:\\\)|[^)])*)\) Tj/g)]
      .map((match) => match[1])
      .join('\n');
    expect(text).not.toContain('When the well is dry');
    expect(text).not.toContain('Thomas Fuller');
  });
});
