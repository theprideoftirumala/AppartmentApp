import { describe, expect, it } from 'vitest';
import {
  assessDataHealth,
  findDuplicateExpenseFingerprints,
  findDuplicateMaintenanceKeys,
  flatsStillDue,
  maintenanceKey,
} from './dataHealth';

describe('maintenanceKey', () => {
  it('normalizes month and flat', () => {
    expect(maintenanceKey('Sep-26', '101')).toBe('Sep-26|101');
  });
});

describe('findDuplicateMaintenanceKeys', () => {
  it('finds two rows for the same month and flat', () => {
    const dups = findDuplicateMaintenanceKeys([
      { month: 'Oct-26', flat: '101', amountPaid: 3000 },
      { month: 'Oct-26', flat: '102', amountPaid: 3000 },
      { month: 'Oct-26', flat: '101', amountPaid: 3000 },
    ]);
    expect(dups).toHaveLength(1);
    expect(dups[0].key).toBe('Oct-26|101');
    expect(dups[0].count).toBe(2);
  });
});

describe('findDuplicateExpenseFingerprints', () => {
  it('finds the same bill twice', () => {
    const dups = findDuplicateExpenseFingerprints([
      { date: '2026-10-02', description: 'Water tanker', amount: 2500 },
      { date: '2026-10-02', description: 'Water tanker', amount: 2500 },
    ]);
    expect(dups).toHaveLength(1);
  });
});

describe('flatsStillDue', () => {
  it('includes partial payments that still owe', () => {
    const rows = flatsStillDue([
      { flat: '101', status: 'PENDING', amountDue: 3000, amountPaid: 0, stillDue: 3000 },
      { flat: '102', status: 'PARTIAL', amountDue: 3000, amountPaid: 1000, stillDue: 2000 },
      { flat: '201', status: 'PAID', amountDue: 3000, amountPaid: 3000, stillDue: 0 },
    ]);
    expect(rows.map((row) => row.flat)).toEqual(['101', '102']);
  });
});

describe('assessDataHealth', () => {
  it('is healthy on a clean month', () => {
    const health = assessDataHealth({
      maintenance: [{ month: 'Sep-26', flat: '101', amountDue: 3000, amountPaid: 3000, status: 'PAID' }],
      expenses: [{ date: '2026-09-02', description: 'Salary', amount: 8500 }],
    });
    expect(health.blocking).toBe(false);
    expect(health.issues).toEqual([]);
  });

  it('blocks publish when maintenance keys duplicate', () => {
    const health = assessDataHealth({
      maintenance: [
        { month: 'Sep-26', flat: '101', amountPaid: 3000 },
        { month: 'Sep-26', flat: '101', amountPaid: 3000 },
      ],
    });
    expect(health.blocking).toBe(true);
    expect(health.issues[0].code).toBe('DUP_MAINT');
  });
});
