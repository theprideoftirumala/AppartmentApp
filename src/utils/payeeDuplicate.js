/**
 * Same 10-digit phone, or same UPI ID, is the same payee. UPI IDs are never invented.
 */

import { indianMobileDigits } from './upiPay';

function normalizeUpi(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function payeeFingerprint(payee = {}) {
  const upi = normalizeUpi(payee.upiId);
  if (upi) return `upi:${upi}`;
  return `name:${normalizeName(payee.name)}|phone:${digits(payee.phone)}`;
}

export function firstDuplicatePayee(candidate, existing = []) {
  if (!normalizeName(candidate?.name) && !normalizeUpi(candidate?.upiId) && !digits(candidate?.phone)) {
    return null;
  }
  const mobile = indianMobileDigits(candidate?.phone);
  if (mobile) {
    const samePhone = existing.find((row) => indianMobileDigits(row.phone) === mobile);
    if (samePhone) return samePhone;
  }
  const key = payeeFingerprint(candidate);
  if (key === 'name:|phone:') return null;
  return existing.find((row) => payeeFingerprint(row) === key) || null;
}
