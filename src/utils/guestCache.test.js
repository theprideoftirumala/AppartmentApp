import { describe, expect, it } from 'vitest';
import { isGuestDashboardSnapshot, toGuestDashboardSnapshot } from './guestCache';

describe('toGuestDashboardSnapshot', () => {
  it('drops phones, emails, contacts, remarks, and receipt links', () => {
    const slim = toGuestDashboardSnapshot({
      config: {
        APARTMENT_NAME: 'The Pride of Tirumala',
        MONTHLY_MAINTENANCE: 3000,
        OPENING_SURPLUS: 612,
      },
      totals: { currentBalance: 11712, availableStatus: 'SURPLUS' },
      maintenance: [{
        month: 'Sep-26',
        flat: '101',
        amountPaid: 3000,
        remarks: 'paid in cash',
        upiRef: 'secret',
        status: 'PAID',
      }],
      expenses: [{
        description: 'Watchman salary',
        remarks: 'internal',
        receiptLink: 'https://drive.google.com/file/d/x',
        amount: 8500,
        category: 'Watchman Salary',
        month: 'Sep-26',
      }],
      flats: [{ flat: '101', ownerName: 'Asha', phone: '+919876543210', email: 'a@b.com' }],
      contacts: [{ name: 'Plumber', phone: '9876543210' }],
      reminders: [{ id: '1', title: 'Backup', description: 'private note', nextDue: '2026-09-30', status: 'Active' }],
    });

    expect(slim.guest).toBe(true);
    expect(slim.flats[0]).toEqual({ flat: '101' });
    expect(slim.contacts).toEqual([]);
    expect(slim.maintenance[0].remarks).toBeUndefined();
    expect(slim.expenses[0].description).toBeUndefined();
    expect(slim.expenses[0].receiptLink).toBeUndefined();
    expect(slim.reminders[0].description).toBeUndefined();
    expect(JSON.stringify(slim)).not.toContain('Asha');
    expect(JSON.stringify(slim)).not.toContain('9876543210');
    expect(isGuestDashboardSnapshot(slim)).toBe(true);
  });
});
