import { describe, expect, it } from 'vitest';
import {
  categoryChartRows,
  collectionCounts,
  compareBarPercents,
  stillDueHighlights,
  ytdChartRows,
} from './expertReport';

describe('collectionCounts', () => {
  it('counts paid flats and collection percent for a new month', () => {
    expect(collectionCounts([
      { status: 'PAID' },
      { status: 'PAID' },
      { status: 'PENDING' },
    ])).toEqual({ paid: 2, pending: 1, partial: 0, total: 3, pct: 67 });
  });

  it('is zero on an empty sheet', () => {
    expect(collectionCounts([])).toEqual({ paid: 0, pending: 0, partial: 0, total: 0, pct: 0 });
  });
});

describe('categoryChartRows', () => {
  it('sorts categories by amount and computes share', () => {
    const rows = categoryChartRows([
      { category: 'Water', amount: 2000 },
      { category: 'Salary', amount: 8000 },
    ], 10000);
    expect(rows[0]).toMatchObject({ name: 'Salary', total: 8000, pct: 80 });
    expect(rows[1]).toMatchObject({ name: 'Water', pct: 20 });
  });
});

describe('compareBarPercents', () => {
  it('scales the larger amount to 100%', () => {
    expect(compareBarPercents(30000, 15000)).toEqual({ collectionPct: 100, expensesPct: 50 });
  });
});

describe('stillDueHighlights', () => {
  it('lists flats that still owe and the total', () => {
    const out = stillDueHighlights([
      { flat: '202', amountDue: 3000, amountPaid: 0, stillDue: 3000, status: 'PENDING' },
      { flat: '101', amountDue: 3000, amountPaid: 3000, stillDue: 0, status: 'PAID' },
    ]);
    expect(out.rows).toEqual([{ flat: '202', stillDue: 3000, status: 'PENDING' }]);
    expect(out.total).toBe(3000);
  });
});

describe('ytdChartRows', () => {
  it('builds bar heights from year-to-date rows', () => {
    const rows = ytdChartRows([
      { month: 'Sep-26', totalCollection: 25500, totalExpenses: 14400, netBalance: 11100, cumulativeBalance: 11712 },
    ]);
    expect(rows[0].month).toBe('Sep-26');
    expect(rows[0].collectionH).toBe(100);
    expect(rows[0].expensesH).toBe(56);
  });
});
