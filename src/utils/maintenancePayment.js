/**
 * Defaults and row matching for Maintenance payments.
 * Late fee is not collected in the app. New saves default to PAID.
 */

import { coerceMonthLabel } from './months';
import { sheetNumber, sheetText } from './helpers';

export function paidPaymentDefaults(config = {}, today = new Date().toISOString().split('T')[0]) {
  const due = Number(config.MONTHLY_MAINTENANCE) || 3000;
  return {
    amountDue: due,
    amountPaid: due,
    paymentDate: today,
    paymentMode: 'UPI',
    upiRef: '',
    status: 'PAID',
    remarks: '',
  };
}

export function unpaidFlats(records = []) {
  return (records || [])
    .filter((row) => row.status !== 'PAID' && row.status !== 'WAIVED')
    .map((row) => String(row.flat || '').trim())
    .filter(Boolean);
}

export function sameMaintenanceKey(rowMonth, rowFlat, month, flat) {
  const left = coerceMonthLabel(rowMonth) || String(rowMonth || '').trim();
  const right = coerceMonthLabel(month) || String(month || '').trim();
  return left === right && String(rowFlat || '').trim() === String(flat || '').trim();
}

export function uniqueFlats(flats = []) {
  return [...new Set((flats || []).map((flat) => String(flat || '').trim()).filter(Boolean))];
}

export function maintenancePaymentRow(month, flat, data = {}) {
  return [
    sheetText(month, 12),
    sheetText(flat, 8),
    sheetNumber(data.amountDue),
    sheetNumber(data.amountPaid),
    sheetText(data.paymentDate, 12),
    sheetText(data.paymentMode, 40),
    sheetText(data.upiRef, 80),
    sheetText(data.status || 'PAID', 16),
    sheetNumber(0),
    sheetText(data.remarks, 300),
  ];
}
