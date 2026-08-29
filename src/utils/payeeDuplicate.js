/**
 * Same UPI ID, or same name+phone, is the same payee. UPI IDs are never invented.
 */

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
  const key = payeeFingerprint(candidate);
  if (key === 'name:|phone:') return null;
  return existing.find((row) => payeeFingerprint(row) === key) || null;
}
