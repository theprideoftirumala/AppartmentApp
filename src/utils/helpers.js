/**
 * Utility Functions — Formatters, validators, helpers
 */

/**
 * Format number as Indian Rupees
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/**
 * Format date for display
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
export function getFiscalMonthOptions(startMonth = '2026-09', years = 12) {
  const [startYear, startMon] = startMonth.split('-').map(Number);
  const months = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      const monthIndex = (startMon - 1 + m) % 12;
      const year = startYear + y + Math.floor((startMon - 1 + m) / 12);
      const shortYear = String(year).slice(-2);
      months.push(`${monthNames[monthIndex]}-${shortYear}`);
    }
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
