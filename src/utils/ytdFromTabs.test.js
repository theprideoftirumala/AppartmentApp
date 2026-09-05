import { describe, expect, it } from 'vitest';
import { ytdRowsFromTabs } from './ytdFromTabs';

describe('ytdRowsFromTabs', () => {
  it('adds opening surplus 612 to Sep-26 running balance', () => {
    const rows = ytdRowsFromTabs(
      [
        { month: 'Sep-26', amountPaid: 25500, status: 'PAID' },
        { month: 'Oct-26', amountPaid: 15000, status: 'PAID' },
      ],
      [
        { month: 'Sep-26', amount: 14400 },
        { month: 'Oct-26', amount: 20000 },
      ],
      612,
    );
    expect(rows[0]).toMatchObject({
      month: 'Sep-26',
      totalCollection: 25500,
      totalExpenses: 14400,
      netBalance: 11100,
      cumulativeBalance: 11712,
      status: 'SURPLUS',
    });
    expect(rows[1]).toMatchObject({
      month: 'Oct-26',
      netBalance: -5000,
      cumulativeBalance: 6712,
      status: 'DEFICIT',
    });
  });
});
