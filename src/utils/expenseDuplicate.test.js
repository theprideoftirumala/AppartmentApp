import { describe, expect, it } from 'vitest';
import { duplicateExpenseMessage, expenseFingerprint, firstDuplicateExpense } from './expenseDuplicate';

describe('expenseFingerprint', () => {
  it('treats spacing and case as the same description', () => {
    expect(expenseFingerprint({ date: '2026-09-01', description: 'Water  Tanker', amount: 2500 }))
      .toBe(expenseFingerprint({ date: '2026-09-01', description: 'water tanker', amount: '2500.00' }));
  });
});

describe('firstDuplicateExpense', () => {
  it('finds a match against existing rows', () => {
    const existing = [{ date: '2026-09-01', description: 'Water tanker', amount: 2500 }];
    const found = firstDuplicateExpense(
      [{ date: '2026-09-01', description: 'Water Tanker', amount: 2500 }],
      existing,
    );
    expect(found.description).toBe('Water Tanker');
  });

  it('finds two identical lines in the same batch', () => {
    const found = firstDuplicateExpense([
      { date: '2026-09-01', description: 'Watchman salary', amount: 12000 },
      { date: '2026-09-01', description: 'Watchman salary', amount: 12000 },
    ]);
    expect(found.description).toBe('Watchman salary');
  });

  it('allows the same description on a different date', () => {
    const found = firstDuplicateExpense(
      [{ date: '2026-10-01', description: 'Water tanker', amount: 2500 }],
      [{ date: '2026-09-01', description: 'Water tanker', amount: 2500 }],
    );
    expect(found).toBeNull();
  });
});

describe('duplicateExpenseMessage', () => {
  it('names the conflicting row', () => {
    expect(duplicateExpenseMessage({ date: '2026-09-01', description: 'Water tanker', amount: 2500 }))
      .toBe('Duplicate: "Water tanker" for ₹2500 on 2026-09-01 already exists.');
  });
});
