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

/** Summary row 10 headers + flat rows 12–21. Drops owner names and the carry-forward / surplus row. */
export function maintenanceRowsFromSummaryGrid(grid) {
  const rows = grid || [];
  if (!rows.length) return [];
  const headers = rows[0] || [];
  const months = headers.slice(2).map((cell, index) => ({
    index: index + 2,
    label: toAppMonthLabel(cell),
  })).filter((item) => isHistoryMonth(item.label));

  const out = [];
  for (const row of rows.slice(1)) {
    const first = String(row[0] ?? '').trim();
    if (/carry\s*forward/i.test(first)) continue;
    const flat = first.replace(/\.0$/, '');
    if (!/^\d{3}$/.test(flat)) continue;
    for (const month of months) {
      const raw = row[month.index];
      if (raw === '' || raw == null) continue;
      const paid = Number(raw);
      if (!Number.isFinite(paid) || paid === 0) continue;
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
