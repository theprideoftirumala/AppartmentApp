/**
 * Month labels used on Maintenance, Expenses, Monthly Summary, and PDFs.
 * First books month is Sep-26. Labels stay text: MMM-YY.
 */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function columnLetter(indexZero) {
  let n = Number(indexZero) + 1;
  if (!Number.isFinite(n) || n < 1) return 'A';
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function formatMonthLabel(year, monthIndexZero) {
  const yearNum = Number(year);
  const month = Number(monthIndexZero);
  if (!Number.isFinite(yearNum) || month < 0 || month > 11) return '';
  return `${MONTH_NAMES[month]}-${String(yearNum).slice(-2)}`;
}

export function parseMonthLabel(label) {
  const text = String(label || '').trim();
  const match = text.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (!match) return null;
  const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === match[1].toLowerCase());
  if (month < 0) return null;
  const year = 2000 + Number(match[2]);
  return { year, month, label: `${MONTH_NAMES[month]}-${match[2]}` };
}

export function coerceMonthLabel(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!Number.isNaN(date.getTime())) {
      return formatMonthLabel(date.getUTCFullYear(), date.getUTCMonth());
    }
  }
  const parsed = parseMonthLabel(value);
  if (parsed) return parsed.label;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime()) && String(value).length >= 8) {
    return formatMonthLabel(date.getFullYear(), date.getMonth());
  }
  return String(value).trim();
}

export function monthLabelToYearMonth(label) {
  const parsed = parseMonthLabel(coerceMonthLabel(label));
  if (!parsed) return '';
  return `${parsed.year}-${String(parsed.month + 1).padStart(2, '0')}`;
}

export function sortMonthLabels(labels) {
  const unique = [...new Set((labels || []).map(coerceMonthLabel).filter(Boolean))];
  return unique.sort((a, b) => monthLabelToYearMonth(a).localeCompare(monthLabelToYearMonth(b)));
}

export function nextSequentialMonthLabel(months) {
  const sorted = sortMonthLabels(months);
  const last = sorted[sorted.length - 1] || 'Sep-26';
  return nextMonthLabel(last);
}

export function nextMonthLabel(label) {
  const parsed = parseMonthLabel(coerceMonthLabel(label));
  if (!parsed) return '';
  const nextMonth = parsed.month + 1;
  if (nextMonth > 11) return formatMonthLabel(parsed.year + 1, 0);
  return formatMonthLabel(parsed.year, nextMonth);
}

export function generateMonthSequence(startLabel, count = 12) {
  const first = coerceMonthLabel(startLabel);
  if (!first) return [];
  const out = [first];
  for (let i = 1; i < count; i += 1) {
    out.push(nextMonthLabel(out[out.length - 1]));
  }
  return out;
}

export function workingMonthsFromRows(maintenanceMonths = [], expenseMonths = [], firstLabel = 'Sep-26') {
  const fromData = sortMonthLabels([...maintenanceMonths, ...expenseMonths]);
  if (!fromData.length) return [firstLabel];
  const start = firstLabel;
  const startYm = monthLabelToYearMonth(start);
  const filtered = fromData.filter((label) => monthLabelToYearMonth(label) >= startYm);
  if (!filtered.includes(start)) return [start, ...filtered];
  return filtered.length ? filtered : [start];
}

export function pickDefaultWorkingMonth(months, currentLabel) {
  const list = Array.isArray(months) ? months.filter(Boolean) : [];
  if (!list.length) return currentLabel || 'Sep-26';
  if (currentLabel && list.includes(currentLabel)) return currentLabel;
  return list[list.length - 1];
}

export function monthIndexKey(label) {
  return monthLabelToYearMonth(label);
}
