import { describe, expect, it } from 'vitest';
import { ytdRowsFromTabs } from './ytdFromTabs';

describe('ytdRowsFromTabs', () => {
  it('sums Aug-26 Maintenance paid and does not invent Sep collection', () => {
    const rows = ytdRowsFromTabs(
      [
        { month: 'Aug-26', amountPaid: 3000, status: 'PAID' },
        { month: 'Aug-26', amountPaid: 27000, status: 'PAID' },
        { month: 'Sep-26', amountPaid: 0, status: 'PENDING' },
      ],
      [{ month: 'Aug-26', amount: 0 }],
    );
    expect(rows[0]).toMatchObject({
      month: 'Aug-26',
      totalCollection: 30000,
      totalExpenses: 0,
      netBalance: 30000,
      collectionPct: '100%',
    });
    expect(rows[1]).toMatchObject({
      month: 'Sep-26',
      totalCollection: 0,
      collectionPct: '0%',
    });
    expect(rows[1].cumulativeBalance).toBe(30000);
  });
});
