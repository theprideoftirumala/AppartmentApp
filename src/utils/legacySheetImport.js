/**
 * Parse The Pride of Tirumala-APP history tabs into app rows.
 * Owner names are dropped. Late-fee / surplus rows are not imported.
 * Months from Sep 2026 onward stay off the import (live app months).
 */

import { LIVE_APP_START } from '../config/constants';

const MONTH_ALIASES = {
  jan: 'Jan', january: 'Jan',
  feb: 'Feb', february: 'Feb',
  mar: 'Mar', march: 'Mar',
  apr: 'Apr', april: 'Apr',
  may: 'May',
  jun: 'Jun', june: 'Jun',
  jul: 'Jul', july: 'Jul',
  aug: 'Aug', august: 'Aug',
  sep: 'Sep', sept: 'Sep', september: 'Sep',
  oct: 'Oct', october: 'Oct',
  nov: 'Nov', november: 'Nov',
  dec: 'Dec', december: 'Dec',
};

const CATEGORY_RULES = [
  [/watchman|salary|srinu/i, 'Watchman Salary'],
  [/diesel|desiel|generator/i, 'Generator Fuel'],
  [/electric|eb |current bill/i, 'Common Electricity'],
  [/water tanker|tanker/i, 'Water Tankers'],
  [/water|bwssb/i, 'Water Charges'],
  [/garbage|trash/i, 'Garbage'],
  [/lift|elevator/i, 'Lift Service'],
  [/plumb/i, 'Plumbing'],
  [/pest|mosquito|masquito/i, 'Pest Control'],
  [/clean|muggu|housekeep/i, 'Cleaning'],
  [/wifi|internet|broadband/i, 'Internet'],
  [/repair|motor|bore/i, 'Repairs & Maintenance'],
];

export function toAppMonthLabel(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const match = text.match(/^([A-Za-z]+)\s*'?(\d{2})$/);
  if (!match) return '';
  const month = MONTH_ALIASES[match[1].toLowerCase()];
  return month ? `${month}-${match[2]}` : '';
}

export function dateToMonthLabel(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const [year, month] = isoDate.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[month - 1]}-${String(year).slice(-2)}`;
}

const MONTH_NUMBER = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

export function monthLabelToYearMonth(label) {
  const match = String(label || '').match(/^([A-Za-z]{3})-(\d{2})$/);
  if (!match) return '';
  const month = MONTH_NUMBER[match[1]];
  return month ? `20${match[2]}-${month}` : '';
}

/** Nov-20 through Aug-26. Sep-26 and later are live app months, not history. */
export function isHistoryMonth(label) {
  const ym = monthLabelToYearMonth(label);
  return Boolean(ym) && ym < LIVE_APP_START;
}

export function isLiveAppMonth(label) {
  const ym = monthLabelToYearMonth(label);
  return Boolean(ym) && ym >= LIVE_APP_START;
}

export function parseSheetDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return utc.toISOString().slice(0, 10);
  }
  return '';
}

export function categoryFromMemo(memo) {
  const text = String(memo || '');
  const found = CATEGORY_RULES.find(([pattern]) => pattern.test(text));
  return found ? found[1] : 'Sundry';
}

export function parsePaidAmount(raw) {
  if (raw === '' || raw == null) return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const amount = Number(String(raw).replace(/[,₹\s]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

export function findFlatNumber(row) {
  for (const cell of (row || []).slice(0, 4)) {
    const flat = String(cell ?? '').trim().replace(/\.0$/, '');
    if (/^\d{3}$/.test(flat)) return flat;
  }
  return '';
}

/** Flat cells sit in A/B. Later 3-digit amounts (859, 100) are not flats. */
function hasLeadingFlatNumber(row) {
  for (const cell of (row || []).slice(0, 2)) {
    const flat = String(cell ?? '').trim().replace(/\.0$/, '');
    if (/^\d{3}$/.test(flat)) return true;
  }
  return false;
}

function isSkipSummaryRow(row) {
  const text = (row || []).slice(0, 4).map((cell) => String(cell ?? '')).join(' ');
  return /carry\s*forward|surplus|deficit|^total\b|contribution/i.test(text);
}

function firstLabel(row) {
  for (const cell of (row || []).slice(0, 4)) {
    const text = String(cell ?? '').replace(/\s+/g, ' ').trim();
    if (text && !/^\d+(\.\d+)?$/.test(text)) return text;
  }
  return '';
}

function isSkipExpenseLabel(text) {
  return /carry\s*forward|surplus|deficit|^totals?\b|contribution|available\s*balance|late\s*fee|^expenses?$|^income$|^collection/i.test(text);
}

const SUMMARY_CATEGORY_RULES = [
  [/sundry/i, 'Sundry'],
  [/watchman|salary/i, 'Watchman Salary'],
  [/generator|diesel|desiel/i, 'Generator Fuel'],
  [/electric/i, 'Common Electricity'],
  [/water/i, 'Water Charges'],
  [/garbage|wastage/i, 'Garbage'],
  [/lift|elevator/i, 'Lift Service'],
  [/pest/i, 'Pest Control'],
  [/clean|housekeep/i, 'Cleaning'],
  [/internet|wifi|broadband/i, 'Internet'],
  [/\br\s*&\s*m\b|repair/i, 'Repairs & Maintenance'],
  [/service/i, 'Repairs & Maintenance'],
];

export function categoryFromSummaryLabel(label) {
  const text = String(label || '').trim();
  if (!text || isSkipExpenseLabel(text)) return '';
  const found = SUMMARY_CATEGORY_RULES.find(([pattern]) => pattern.test(text));
  return found ? found[1] : '';
}

function lastDayOfMonth(label) {
  const ym = monthLabelToYearMonth(label);
  if (!ym) return '';
  const [year, month] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(year, month, 0));
  return last.toISOString().slice(0, 10);
}

/** Green Available-balance cell on the Summary header (label + number to the right). */
export function availableBalanceFromSummaryGrid(grid) {
  for (const row of grid || []) {
    for (let i = 0; i < row.length; i += 1) {
      if (!/available\s*balance/i.test(String(row[i] ?? ''))) continue;
      for (const candidate of [row[i + 1], row[i + 2]]) {
        const amount = Number(String(candidate ?? '').replace(/[,₹\s]/g, ''));
        if (Number.isFinite(amount) && amount > 0) return amount;
      }
    }
  }
  return null;
}

/** Summary month headers + one row per flat. Drops owner names, carry-forward, surplus, and late-fee rows. */
export function maintenanceRowsFromSummaryGrid(grid) {
  const rows = grid || [];
  if (!rows.length) return [];
  const headers = rows[0] || [];
  const months = headers.map((cell, index) => ({
    index,
    label: toAppMonthLabel(cell),
  })).filter((item) => isHistoryMonth(item.label));

  const out = [];
  for (const row of rows.slice(1)) {
    if (isSkipSummaryRow(row)) continue;
    const flat = findFlatNumber(row);
    if (!flat) continue;
    for (const month of months) {
      const paid = parsePaidAmount(row[month.index]);
      if (paid === 0) continue;
      out.push([
        month.label,
        flat,
        paid,
        paid,
        '',
        '',
        '',
        'PAID',
        0,
        'From Summary tab',
      ]);
    }
  }
  return out;
}

export function expenseRowsFromDetailedGrid(grid) {
  const out = [];
  let n = 1;
  for (const row of grid || []) {
    const date = parseSheetDate(row?.[0]);
    const amount = Number(row?.[1]);
    const memo = String(row?.[2] ?? '').trim();
    if (!date || date >= `${LIVE_APP_START}-01` || !Number.isFinite(amount) || amount === 0) continue;
    out.push([
      `EXP-HIST-${n}`,
      date,
      dateToMonthLabel(date),
      memo || 'Expense',
      categoryFromMemo(memo),
      amount,
      '',
      'N',
      '',
      '',
      'From Exp - Detailed',
    ]);
    n += 1;
  }
  return out;
}

/**
 * Monthly category totals from the Summary expense block, including Sundry.
 * Skips flats, contribution, total, surplus/deficit. Live months stay off.
 */
export function expenseRowsFromSummaryGrid(grid) {
  const rows = grid || [];
  if (!rows.length) return [];
  const headers = rows[0] || [];
  const months = headers.map((cell, index) => ({
    index,
    label: toAppMonthLabel(cell),
  })).filter((item) => isHistoryMonth(item.label));

  const out = [];
  let n = 1;
  for (const row of rows.slice(1)) {
    if (hasLeadingFlatNumber(row)) continue;
    const label = firstLabel(row);
    const category = categoryFromSummaryLabel(label);
    if (!category) continue;
    for (const month of months) {
      const amount = parsePaidAmount(row[month.index]);
      if (amount === 0) continue;
      out.push([
        `EXP-SUM-${n}`,
        lastDayOfMonth(month.label),
        month.label,
        label,
        category,
        amount,
        '',
        'N',
        '',
        '',
        'From Summary tab',
      ]);
      n += 1;
    }
  }
  return out;
}

function monthAmount(row) {
  return Number(row?.[5]) || 0;
}

function monthOf(row) {
  return String(row?.[2] || '');
}

function categoryOf(row) {
  return String(row?.[4] || '');
}

function sumBy(rows, keyFn) {
  const totals = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    totals.set(key, (totals.get(key) || 0) + monthAmount(row));
  }
  return totals;
}

function amountsClose(a, b) {
  return Math.abs(Number(a) - Number(b)) < 1;
}

/**
 * Keep Exp-Detailed line items. Add a Summary category (including Sundry)
 * only when that month/category is not already covered by detailed lines.
 */
export function mergeHistoryExpenses(detailedRows, summaryRows) {
  const detailed = detailedRows || [];
  const summary = summaryRows || [];
  const detailedMonthSum = sumBy(detailed, monthOf);
  const summaryMonthSum = sumBy(summary, monthOf);
  const detailedCategorySum = sumBy(detailed, (row) => `${monthOf(row)}|${categoryOf(row)}`);
  const detailedExact = new Set(
    detailed.map((row) => `${monthOf(row)}|${categoryOf(row)}|${monthAmount(row)}`),
  );

  const extra = [];
  for (const row of summary) {
    const month = monthOf(row);
    const category = categoryOf(row);
    const amount = monthAmount(row);
    if (detailedExact.has(`${month}|${category}|${amount}`)) continue;
    if (amountsClose(detailedCategorySum.get(`${month}|${category}`) || 0, amount)) continue;
    if (
      detailedMonthSum.has(month)
      && amountsClose(detailedMonthSum.get(month), summaryMonthSum.get(month) || 0)
    ) {
      continue;
    }
    extra.push(row);
  }
  return [...detailed, ...extra];
}

export function importedExpenseFingerprint(row) {
  return `${String(row?.[1] || '').trim()}|${monthAmount(row)}|${String(row?.[3] || '').trim().toLowerCase()}`;
}

export function isImportedExpenseRow(row) {
  const id = String(row?.[0] || '');
  const source = String(row?.[10] || '');
  return /^EXP-(HIST|SUM)-/i.test(id) || /From (Exp - Detailed|Summary)/i.test(source);
}

/** Indexes of imported rows that duplicate another imported line or a Summary rollup. */
export function leftoverDuplicateImportIndexes(rows) {
  const list = rows || [];
  const seen = new Set();
  const drop = new Set();
  const detailed = [];
  const summary = [];
  list.forEach((row, index) => {
    if (!isImportedExpenseRow(row)) return;
    const key = importedExpenseFingerprint(row);
    if (seen.has(key)) {
      drop.add(index);
      return;
    }
    seen.add(key);
    const id = String(row?.[0] || '');
    const source = String(row?.[10] || '');
    if (/From Exp - Detailed/i.test(source) || /^EXP-HIST-/i.test(id)) detailed.push(row);
    else if (/From Summary/i.test(source) || /^EXP-SUM-/i.test(id)) summary.push({ row, index });
  });
  const keepSummary = new Set(mergeHistoryExpenses(detailed, summary.map((item) => item.row)).slice(detailed.length));
  for (const item of summary) {
    if (!keepSummary.has(item.row)) drop.add(item.index);
  }
  return [...drop].sort((a, b) => a - b);
}
