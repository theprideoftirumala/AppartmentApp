/**
 * Same description + amount + date is treated as the same expense.
 */

function normalizeDescription(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export function expenseFingerprint({ date, description, amount } = {}) {
  return `${String(date || '').trim()}|${normalizeDescription(description)}|${normalizeAmount(amount)}`;
}

export function firstDuplicateExpense(candidates = [], existing = []) {
  const seen = new Set(existing.map((row) => expenseFingerprint(row)));
  for (const item of candidates) {
    if (!normalizeDescription(item?.description)) continue;
    const key = expenseFingerprint(item);
    if (seen.has(key)) return item;
    seen.add(key);
  }
  return null;
}

export function duplicateExpenseMessage(item) {
  const amount = Number(item?.amount);
  const money = Number.isFinite(amount) ? amount : 0;
  return `Duplicate: "${item?.description}" for ₹${money} on ${item?.date} already exists.`;
}
