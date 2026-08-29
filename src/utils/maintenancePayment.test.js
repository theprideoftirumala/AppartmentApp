import { describe, expect, it } from 'vitest';
import {
  maintenancePaymentRow,
  paidPaymentDefaults,
  sameMaintenanceKey,
  uniqueFlats,
  unpaidFlats,
} from './maintenancePayment';

describe('paidPaymentDefaults', () => {
  it('defaults status to PAID and paid amount to monthly due', () => {
    const defaults = paidPaymentDefaults({ MONTHLY_MAINTENANCE: 3000 }, '2026-08-29');
    expect(defaults.status).toBe('PAID');
    expect(defaults.amountDue).toBe(3000);
    expect(defaults.amountPaid).toBe(3000);
    expect(defaults.paymentMode).toBe('UPI');
    expect(defaults.paymentDate).toBe('2026-08-29');
  });
});

describe('unpaidFlats', () => {
  it('skips PAID and WAIVED flats', () => {
    expect(unpaidFlats([
      { flat: '101', status: 'PENDING' },
      { flat: '102', status: 'PAID' },
      { flat: '201', status: 'PARTIAL' },
      { flat: '202', status: 'WAIVED' },
    ])).toEqual(['101', '201']);
  });
});

describe('sameMaintenanceKey', () => {
  it('matches a date-looking month and a numeric flat to Aug-26 / 402', () => {
    expect(sameMaintenanceKey('Aug-26', 402, 'Aug-26', '402')).toBe(true);
    expect(sameMaintenanceKey('Sep-26', '101', 'Aug-26', '101')).toBe(false);
  });
});

describe('maintenancePaymentRow', () => {
  it('writes PAID and never a late-fee amount', () => {
    const row = maintenancePaymentRow('Aug-26', '101', paidPaymentDefaults({ MONTHLY_MAINTENANCE: 3000 }, '2026-08-29'));
    expect(row[0]).toBe('Aug-26');
    expect(row[1]).toBe('101');
    expect(row[7]).toBe('PAID');
    expect(row[8]).toBe('0');
    expect(uniqueFlats(['101', '101', ' 102 '])).toEqual(['101', '102']);
  });
});
