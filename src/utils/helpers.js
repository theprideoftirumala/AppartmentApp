/**
 * @fileoverview Utility functions for the TPT Apartment Expense Tracker.
 *
 * All functions are pure and side-effect-free unless otherwise noted.
 * Security note: sanitizeForSheet() MUST be applied to every user-supplied
 * string before it is written to a Google Sheet cell to prevent CSV/formula
 * injection attacks (OWASP A03 Injection).
 */

import { STORAGE_KEYS } from '../config/constants';

// ─── Security ────────────────────────────────────────────────

/**
 * Sanitize a value before writing it to a Google Sheet cell.
 *
 * Google Sheets evaluates any cell value starting with =, +, -, @, TAB, or CR
 * as a formula. An attacker who can inject a value like
 *   =HYPERLINK("https://evil.com","Click me")
 * into a cell could execute arbitrary Sheet formulas or exfiltrate data.
 *
 * This function:
 *   1. Converts the input to a string.
 *   2. Strips leading formula-injection characters (=, +, -, @, \t, \r).
 *   3. Trims whitespace.
 *   4. Returns '' for null/undefined inputs.
 *
 * @param {*} value - The raw user-supplied or data value.
 * @returns {string} A safe string ready for insertion into a Sheet cell.
 */
export function sanitizeForSheet(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Strip any character that Google Sheets treats as a formula prefix
  return str.replace(/^[=+\-@\t\r]+/, '').trim();
}

/**
 * Sanitize then truncate — use this for every user-supplied sheet cell.
 */
export function sheetText(value, max = 300) {
  return truncateForSheet(sanitizeForSheet(value), max);
}

/**
 * Coerce to a finite number string so formulas cannot reach the sheet.
 */
export function sheetNumber(value) {
  const n = Number(value);
  return String(Number.isFinite(n) ? n : 0);
}

/**
 * Normalize emails for ACL comparisons (case-insensitive, trimmed).
 */
export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Escape a value for use inside a Google Drive `q` query string.
 */
export function escapeDriveQuery(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Only allow Google Drive / Docs https links as receipt URLs.
 */
export function sanitizeDriveUrl(url) {
  if (!url) return '';
  const str = String(url).trim();
  if (!/^https:\/\/(drive|docs)\.google\.com\//i.test(str)) return '';
  return str;
}

/**
 * Spreadsheet IDs are alphanumeric with hyphens/underscores.
 */
export function isValidSpreadsheetId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{10,80}$/.test(id);
}

export function bindSpreadsheet(id, email) {
  if (isValidSpreadsheetId(id)) {
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, id);
  }
  if (email) {
    localStorage.setItem(STORAGE_KEYS.BOUND_EMAIL, normalizeEmail(email));
  }
}

/** Drop a stale/private spreadsheet id so the next login cannot reuse it. */
export function unbindSpreadsheet() {
  localStorage.removeItem(STORAGE_KEYS.SPREADSHEET_ID);
  localStorage.removeItem(STORAGE_KEYS.BOUND_EMAIL);
}

/**
 * Safe JSON.parse — returns fallback instead of throwing.
 */
export function parseJsonSafe(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export const ALLOWED_RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

export function isAllowedReceiptFile(file) {
  if (!file) return false;
  if (file.size > 5 * 1024 * 1024) return false;
  if (ALLOWED_RECEIPT_TYPES.includes(file.type)) return true;
  const ext = String(file.name || '').split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf'].includes(ext);
}

/**
 * Validate that a string is within the allowed max length before writing to the sheet.
 * Silently truncates rather than throwing so form submissions are not blocked.
 *
 * @param {string} value
 * @param {number} [max=500]
 * @returns {string}
 */
export function truncateForSheet(value, max = 500) {
  if (!value) return '';
  return String(value).substring(0, max);
}

// ─── Currency ────────────────────────────────────────────────

/**
 * Format a number as Indian Rupees (e.g. ₹30,000).
 * Returns '₹0' for null/undefined/NaN inputs.
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/**
 * Mask a phone for PDFs and shared reports: 98******01
 * Do not use this for emergency-call buttons in the live app.
 */
export function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '—';
  if (digits.length <= 4) return '*'.repeat(digits.length);
  const keepStart = digits.length >= 10 ? 2 : 1;
  const keepEnd = 2;
  const hidden = Math.max(4, digits.length - keepStart - keepEnd);
  return `${digits.slice(0, keepStart)}${'*'.repeat(hidden)}${digits.slice(-keepEnd)}`;
}

/**
 * Mask an ID / Aadhaar-style number: show only the last 4 characters.
 */
export function maskIdNumber(value) {
  const s = String(value || '').trim();
  if (!s) return '—';
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, s.length - 4))}${s.slice(-4)}`;
}

/**
 * Format a date string for display (e.g. "05 Sep 2026").
 * Returns '-' for empty/invalid inputs.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get current month label (e.g., "Sep-26")
 */
export function getCurrentMonthLabel() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const shortYear = String(now.getFullYear()).slice(-2);
  return `${months[now.getMonth()]}-${shortYear}`;
}

/**
 * Get current year-month (e.g., "2026-09")
 */
export function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculate days until a date
 */
export function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

/**
 * Get relative time string
 */
export function getRelativeTime(dateStr) {
  const days = daysUntil(dateStr);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.ceil(days / 30)} months`;
}

/**
 * Validate email address
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone number (Indian format)
 */
export function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone?.replace(/[\s-+]/g, ''));
}

/**
 * Generate unique ID
 */
export function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/**
 * Debounce function
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Calculate collection percentage
 */
export function getCollectionPercentage(maintenance) {
  if (!maintenance || maintenance.length === 0) return 0;
  const paid = maintenance.filter(r => r.status === 'PAID').length;
  return Math.round((paid / maintenance.length) * 100);
}

/**
 * Group expenses by category
 */
export function groupExpensesByCategory(expenses) {
  const groups = {};
  expenses.forEach(exp => {
    const cat = exp.category || 'Uncategorized';
    if (!groups[cat]) groups[cat] = { total: 0, count: 0, items: [] };
    groups[cat].total += exp.amount;
    groups[cat].count += 1;
    groups[cat].items.push(exp);
  });
  return groups;
}

/**
 * Get status color class
 */
export function getStatusColor(status) {
  switch (status?.toUpperCase()) {
    case 'PAID': return 'success';
    case 'PENDING': return 'danger';
    case 'PARTIAL': return 'warning';
    case 'WAIVED': return 'info';
    default: return 'muted';
  }
}

/**
 * Calculate next due date based on frequency
 */
export function calculateNextDue(lastCompleted, frequency) {
  const base = lastCompleted ? new Date(lastCompleted) : new Date();
  const next = new Date(base);

  switch (frequency) {
    case 'Daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'Weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'Monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'Quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'Half-Yearly':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'Yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      return '';
  }

  return next.toISOString().split('T')[0];
}

/**
 * Get month options for the fiscal year
 */
export function getFiscalMonthOptions(startMonth = '2020-11', extraFutureMonths = 6) {
  const [startYear, startMon] = startMonth.split('-').map(Number);
  if (!startYear || !startMon) return [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = [];
  const cursor = new Date(startYear, startMon - 1, 1);
  const end = new Date();
  end.setMonth(end.getMonth() + extraFutureMonths);
  end.setDate(1);
  while (cursor <= end) {
    months.push(`${monthNames[cursor.getMonth()]}-${String(cursor.getFullYear()).slice(-2)}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

/**
 * Convert file size to readable format
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get the last day of the current month as YYYY-MM-DD
 */
export function getLastDayOfCurrentMonth() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
}

/**
 * Get the first day of next month as YYYY-MM-DD
 */
export function getFirstDayOfNextMonth() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return firstDay.toISOString().split('T')[0];
}

// ─── Robustness ───────────────────────────────────────────────

/**
 * Retry an async function up to `maxAttempts` times with exponential back-off.
 *
 * Strategy:
 *   - Attempt 1: immediate
 *   - Attempt 2: wait `delayMs` ms
 *   - Attempt 3: wait `delayMs * 2` ms
 *   ... and so on.
 *
 * Auth errors (HTTP 401/403) are NOT retried — they should surface immediately
 * so the user is prompted to re-authenticate or is shown the Access Denied screen.
 *
 * @param {() => Promise<*>} fn           - The async function to call.
 * @param {number}           [maxAttempts=3]
 * @param {number}           [delayMs=800] - Base delay in milliseconds.
 * @returns {Promise<*>} Result of `fn` on the first successful call.
 * @throws The last error if all attempts fail.
 */
export async function withRetry(fn, maxAttempts = 3, delayMs = 800) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const code = err?.result?.error?.code;
      // Do not retry authentication / authorisation failures
      if (code === 401 || code === 403) throw err;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError;
}
