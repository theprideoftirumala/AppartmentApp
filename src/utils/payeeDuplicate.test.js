import { describe, expect, it } from 'vitest';
import { firstDuplicatePayee, payeeFingerprint } from './payeeDuplicate';

describe('firstDuplicatePayee', () => {
  it('matches an existing UPI ID', () => {
    const found = firstDuplicatePayee(
      { name: 'Watchman', upiId: 'a@okaxis' },
      [{ name: 'Srinu', upiId: 'A@okaxis' }],
    );
    expect(found.upiId).toBe('A@okaxis');
  });

  it('allows a new payee with a different UPI', () => {
    expect(firstDuplicatePayee(
      { name: 'Plumber', upiId: 'b@okaxis' },
      [{ name: 'Watchman', upiId: 'a@okaxis' }],
    )).toBeNull();
  });
});

describe('payeeFingerprint', () => {
  it('does not invent a UPI', () => {
    expect(payeeFingerprint({ name: 'Lift', phone: '9876543210' })).toBe('name:lift|phone:9876543210');
  });
});
