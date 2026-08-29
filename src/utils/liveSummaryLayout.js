/**
 * Live Summary grid (Sep 2026+). Collection and expense cells are formulas
 * from Maintenance and Expenses so the tab can be maintained in Sheets
 * without typing the same amount twice.
 */

import { FLATS, LIVE_APP_START } from '../config/constants';
import { LIVE_SUMMARY_EXPENSE_ROWS } from '../config/liveWorkbook';
import { monthLabelToYearMonth } from './legacySheetImport';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export function liveMonthHeaders(startYm = LIVE_APP_START, count = 12) {
  const match = String(startYm || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return [];
  let year = Number(match[1]);
  let month = Number(match[2]);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(`${MONTH_NAMES[month - 1]}-${String(year).slice(-2)}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out.filter((label) => monthLabelToYearMonth(label) >= LIVE_APP_START);
}

export const LIVE_SUMMARY_LAYOUT = {
  titleRow: 1,
  openingLabelRow: 2,
  openingValueCell: 'B2',
  helpRow: 3,
  headerRow: 5,
  firstFlatRow: 6,
  collectionTotalRow: 16,
  expenseHeaderRow: 18,
  firstExpenseRow: 19,
  totalExpenseRow: 31,
  surplusRow: 32,
  runningRow: 33,
  firstMonthCol: 2,
};

export function liveSummaryStaticAndFormulaGrid(openingBalance, months = liveMonthHeaders()) {
  const layout = LIVE_SUMMARY_LAYOUT;
  const lastFlat = layout.firstFlatRow + FLATS.length - 1;
  const lastExpense = layout.firstExpenseRow + LIVE_SUMMARY_EXPENSE_ROWS.length - 1;
  const monthCount = months.length;
  const lastCol = columnLetter(layout.firstMonthCol + monthCount - 1);

  const rows = [];
  const formulas = {};

  rows[layout.titleRow - 1] = [
    'The Pride of Tirumala — live books from Sep 2026. Same shape as the old Summary tab.',
  ];
  rows[layout.openingLabelRow - 1] = [
    'Opening available balance (copied from the old Summary green cell at create). Do not type a made-up number.',
    Number.isFinite(Number(openingBalance)) ? Number(openingBalance) : 0,
  ];
  rows[layout.helpRow - 1] = [
    'Grey formula cells update from Maintenance (collections) and Expenses (line items). Type those tabs in the app or in this Google Sheet. Do not type collection or expense amounts on this tab — that would duplicate. To add a month, copy the last month column.',
  ];
  rows[3] = [];

  const header = ['Flat', 'Owner', ...months];
  rows[layout.headerRow - 1] = header;

  FLATS.forEach((flat, i) => {
    const r = layout.firstFlatRow + i;
    const row = [flat, ''];
    months.forEach((_, m) => {
      const col = columnLetter(layout.firstMonthCol + m);
      row.push('');
      formulas[`${col}${r}`] = `=IFERROR(SUMIFS(Maintenance!D:D,Maintenance!A:A,${col}$${layout.headerRow},Maintenance!B:B,$A${r}),0)`;
    });
    formulas[`B${r}`] = `=IFERROR(VLOOKUP(A${r},Flats!A:B,2,FALSE),"")`;
    rows[r - 1] = row;
  });

  const collectionRow = ['Collection total', ''];
  months.forEach((_, m) => {
    const col = columnLetter(layout.firstMonthCol + m);
    collectionRow.push('');
    formulas[`${col}${layout.collectionTotalRow}`] = `=SUM(${col}${layout.firstFlatRow}:${col}${lastFlat})`;
  });
  rows[layout.collectionTotalRow - 1] = collectionRow;

  rows[16] = [];
  rows[layout.expenseHeaderRow - 1] = ['Expenses (formulas from the Expenses tab — including Sundry line items, not a second Sundry total)'];

  LIVE_SUMMARY_EXPENSE_ROWS.forEach((item, i) => {
    const r = layout.firstExpenseRow + i;
    const row = [item.label, item.category];
    months.forEach((_, m) => {
      const col = columnLetter(layout.firstMonthCol + m);
      row.push('');
      const lookup = item.sumCategory === undefined ? item.category : item.sumCategory;
      const cat = String(lookup || '').replace(/"/g, '""');
      formulas[`${col}${r}`] = cat
        ? `=IFERROR(SUMIFS(Expenses!F:F,Expenses!C:C,${col}$${layout.headerRow},Expenses!E:E,"${cat}"),0)`
        : '=0';
    });
    rows[r - 1] = row;
  });

  const totalExp = ['Total expenses', ''];
  months.forEach((_, m) => {
    const col = columnLetter(layout.firstMonthCol + m);
    totalExp.push('');
    formulas[`${col}${layout.totalExpenseRow}`] = `=SUM(${col}${layout.firstExpenseRow}:${col}${lastExpense})`;
  });
  rows[layout.totalExpenseRow - 1] = totalExp;

  const surplus = ['Monthly surplus (deficit)', 'Collection minus expenses for that month only'];
  months.forEach((_, m) => {
    const col = columnLetter(layout.firstMonthCol + m);
    surplus.push('');
    formulas[`${col}${layout.surplusRow}`] = `=N(${col}${layout.collectionTotalRow})-N(${col}${layout.totalExpenseRow})`;
  });
  rows[layout.surplusRow - 1] = surplus;

  const running = ['Running available balance', 'Opening + each month surplus (deficit)'];
  months.forEach((_, m) => {
    const col = columnLetter(layout.firstMonthCol + m);
    running.push('');
    if (m === 0) {
      formulas[`${col}${layout.runningRow}`] = `=N($B$2)+N(${col}${layout.surplusRow})`;
    } else {
      const prev = columnLetter(layout.firstMonthCol + m - 1);
      formulas[`${col}${layout.runningRow}`] = `=N(${prev}${layout.runningRow})+N(${col}${layout.surplusRow})`;
    }
  });
  rows[layout.runningRow - 1] = running;

  const width = 2 + monthCount;
  const values = [];
  for (let i = 0; i < layout.runningRow; i += 1) {
    const row = rows[i] || [];
    const padded = [...row];
    while (padded.length < width) padded.push('');
    values.push(padded.slice(0, width));
  }

  return { values, formulas, lastCol, months };
}

export function liveSummaryColumnForMonth(headersRow, monthLabel) {
  const headers = headersRow || [];
  const index = headers.findIndex((cell) => String(cell || '').trim() === String(monthLabel || '').trim());
  return index >= 0 ? index : -1;
}
