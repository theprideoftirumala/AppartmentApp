/**
 * Local stand-in for APP-TPT-Tracker.
 * Same tabs, headers, and sample rows the Drive sheet uses.
 * Tests evaluate ledger math from these CSVs without Google APIs.
 */

import { FIRST_APP_MONTH_LABEL, FLATS, OPENING_SURPLUS, SHEET_HEADERS, SHEET_NAMES } from '../config/constants';
import { guideRows } from '../data/workbookGuide';
import { balanceStaticRows, monthlySummaryFormulaRow, pendingDuesStaticRows } from '../services/sheetFormulas';

export const SAMPLE_SEP_PAYMENTS = [
  ['Sep-26', '101', '3000', '3000', '2026-09-05', 'UPI', 'UPI101', 'PAID', '0', 'Paid', ''],
  ['Sep-26', '102', '3000', '3000', '2026-09-04', 'UPI', 'UPI102', 'PAID', '0', '', ''],
  ['Sep-26', '201', '3000', '3000', '2026-09-08', 'UPI', 'UPI201', 'PAID', '0', '', ''],
  ['Sep-26', '202', '3000', '3000', '2026-09-10', 'UPI', 'UPI202', 'PAID', '0', '', ''],
  ['Sep-26', '301', '3000', '3000', '2026-09-06', 'Cash', '', 'PAID', '0', '', ''],
  ['Sep-26', '302', '3000', '3000', '2026-09-12', 'UPI', 'UPI302', 'PAID', '0', '', ''],
  ['Sep-26', '401', '3000', '3000', '2026-09-03', 'UPI', 'UPI401', 'PAID', '0', '', ''],
  ['Sep-26', '402', '3000', '3000', '2026-09-09', 'UPI', 'UPI402', 'PAID', '0', '', ''],
  ['Sep-26', '501', '3000', '0', '', '', '', 'PENDING', '0', 'Reminder sent', ''],
  ['Sep-26', '502', '3000', '1500', '2026-09-18', 'UPI', 'UPI502', 'PARTIAL', '0', 'Balance next week', ''],
];

export const SAMPLE_SEP_EXPENSES = [
  ['EXP-1', '2026-09-08', 'Sep-26', 'Watchman salary September', 'Watchman Salary', '12000', 'Bank Transfer', 'Y', 'Treasurer', '', 'Monthly'],
  ['EXP-2', '2026-09-15', 'Sep-26', 'Common electricity', 'Common Electricity', '2400', 'UPI', 'Y', 'Treasurer', '', ''],
];

export const SAMPLE_OCT_PAYMENTS = [
  ['Oct-26', '101', '3000', '3000', '2026-10-04', 'UPI', 'UPI1010', 'PAID', '0', '', ''],
  ['Oct-26', '102', '3000', '3000', '2026-10-03', 'UPI', 'UPI1020', 'PAID', '0', '', ''],
  ['Oct-26', '201', '3000', '0', '', '', '', 'PENDING', '0', '', ''],
  ['Oct-26', '202', '3000', '3000', '2026-10-07', 'UPI', 'UPI2020', 'PAID', '0', '', ''],
  ['Oct-26', '301', '3000', '3000', '2026-10-06', 'Cash', '', 'PAID', '0', '', ''],
  ['Oct-26', '302', '3000', '0', '', '', '', 'PENDING', '0', '', ''],
  ['Oct-26', '401', '3000', '3000', '2026-10-02', 'UPI', 'UPI4010', 'PAID', '0', '', ''],
  ['Oct-26', '402', '3000', '0', '', '', '', 'PENDING', '0', '', ''],
  ['Oct-26', '501', '3000', '0', '', '', '', 'PENDING', '0', '', ''],
  ['Oct-26', '502', '3000', '0', '', '', '', 'PENDING', '0', '', ''],
];

export const SAMPLE_OCT_EXPENSES = [
  ['EXP-3', '2026-10-08', 'Oct-26', 'Watchman salary October', 'Watchman Salary', '12000', 'Bank Transfer', 'Y', 'Treasurer', '', ''],
  ['EXP-4', '2026-10-20', 'Oct-26', 'Lift AMC', 'Lift Service', '8000', 'UPI', 'Y', 'Treasurer', '', ''],
];

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function parseCsv(text) {
  return String(text || '')
    .split(/\r?\n/)
    .filter((line) => line.length)
    .map((line) => {
      const cells = [];
      let current = '';
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (quoted) {
          if (ch === '"' && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else if (ch === '"') {
            quoted = false;
          } else {
            current += ch;
          }
        } else if (ch === '"') {
          quoted = true;
        } else if (ch === ',') {
          cells.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      cells.push(current);
      return cells;
    });
}

export function maintenanceFromCsvRows(rows) {
  return rows.slice(1).filter((row) => row[0]).map((row) => ({
    month: row[0],
    flat: row[1],
    amountDue: Number(row[2]) || 0,
    amountPaid: Number(row[3]) || 0,
    status: row[7] || 'PENDING',
  }));
}

export function expensesFromCsvRows(rows) {
  return rows.slice(1).filter((row) => row[0]).map((row) => ({
    month: row[2],
    amount: Number(row[5]) || 0,
    description: row[3],
    category: row[4],
  }));
}

export function buildLocalWorkbookTabs() {
  const flats = FLATS.map((flat) => [flat, '', '', '', '', '', '', 'Member']);
  return {
    [SHEET_NAMES.GUIDE]: [SHEET_HEADERS[SHEET_NAMES.GUIDE], ...guideRows()],
    [SHEET_NAMES.BALANCE]: balanceStaticRows(),
    [SHEET_NAMES.CONFIGURATION]: [
      SHEET_HEADERS[SHEET_NAMES.CONFIGURATION],
      ['OPENING_SURPLUS', String(OPENING_SURPLUS), 'Carry-forward into Sep 2026'],
      ['MONTHLY_MAINTENANCE', '3000', 'Monthly rate'],
      ['FISCAL_YEAR_START', '2026-09', 'First books month'],
    ],
    [SHEET_NAMES.FLATS]: [SHEET_HEADERS[SHEET_NAMES.FLATS], ...flats],
    [SHEET_NAMES.MAINTENANCE]: [
      SHEET_HEADERS[SHEET_NAMES.MAINTENANCE],
      ...SAMPLE_SEP_PAYMENTS,
      ...SAMPLE_OCT_PAYMENTS,
    ],
    [SHEET_NAMES.EXPENSES]: [
      SHEET_HEADERS[SHEET_NAMES.EXPENSES],
      ...SAMPLE_SEP_EXPENSES,
      ...SAMPLE_OCT_EXPENSES,
    ],
    [SHEET_NAMES.MONTHLY_SUMMARY]: [
      SHEET_HEADERS[SHEET_NAMES.MONTHLY_SUMMARY],
      [FIRST_APP_MONTH_LABEL, ...monthlySummaryFormulaRow(2)],
      ['Oct-26', ...monthlySummaryFormulaRow(3)],
    ],
    [SHEET_NAMES.PENDING_DUES]: pendingDuesStaticRows(FIRST_APP_MONTH_LABEL),
  };
}

export function buildLocalWorkbookCsv() {
  const tabs = buildLocalWorkbookTabs();
  return Object.fromEntries(Object.entries(tabs).map(([name, rows]) => [name, rowsToCsv(rows)]));
}
