/**
 * Read-only view of the manually kept I&E workbook (Summary + Exp - Detailed).
 * Includes every month on that file, including Aug 2026+. Does not write.
 */

import {
  availableBalanceFromSummaryGrid,
  categoryFromMemo,
  categoryFromSummaryLabel,
  dateToMonthLabel,
  findFlatNumber,
  parsePaidAmount,
  parseSheetDate,
  toAppMonthLabel,
} from './legacySheetImport';

function firstLabel(row) {
  for (const cell of (row || []).slice(0, 4)) {
    const text = String(cell ?? '').replace(/\s+/g, ' ').trim();
    if (text && !/^\d+(\.\d+)?$/.test(text)) return text;
  }
  return '';
}

function hasLeadingFlatNumber(row) {
  for (const cell of (row || []).slice(0, 2)) {
    const flat = String(cell ?? '').trim().replace(/\.0$/, '');
    if (/^\d{3}$/.test(flat)) return true;
  }
  return false;
}

function skipImportedExpenseLabel(label) {
  return /carry\s*forward|surplus|deficit|^totals?\b|contribution|available\s*balance|late\s*fee|^income$|^collection|^expenses?$/i.test(label);
}

export function spreadsheetIdFromInput(raw) {
  const text = String(raw || '').trim();
  const fromUrl = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (fromUrl && fromUrl[1].length >= 20) return fromUrl[1];
  if (/^[a-zA-Z0-9_-]{20,80}$/.test(text)) return text;
  return '';
}

export function findMonthHeaderRow(grid = []) {
  let best = { rowIndex: -1, months: [] };
  (grid || []).forEach((row, rowIndex) => {
    if (!row) return;
    const months = (row || []).map((cell, index) => ({
      index,
      label: toAppMonthLabel(cell),
    })).filter((item) => item.label);
    if (months.length > best.months.length) best = { rowIndex, months };
  });
  return best;
}

export function lastUpdatedFromSummaryGrid(grid = []) {
  for (const row of grid || []) {
    if (!row) continue;
    for (let i = 0; i < row.length; i += 1) {
      if (!/last\s*updated/i.test(String(row[i] ?? ''))) continue;
      const next = String(row[i + 1] ?? row[i + 2] ?? '').trim();
      if (next) return next;
    }
  }
  return '';
}

export function collectionsFromImportedSummary(grid = []) {
  const { rowIndex, months } = findMonthHeaderRow(grid);
  if (rowIndex < 0 || !months.length) return [];
  const out = [];
  for (const row of (grid || []).slice(rowIndex + 1)) {
    if (/carry\s*forward|surplus|deficit|^total\b|contribution/i.test((row || []).slice(0, 4).join(' '))) continue;
    const flat = findFlatNumber(row);
    if (!flat) continue;
    for (const month of months) {
      const paid = parsePaidAmount(row[month.index]);
      out.push({
        month: month.label,
        flat,
        amount: paid,
      });
    }
  }
  return out;
}

export function expensesFromImportedDetailed(grid = []) {
  const out = [];
  (grid || []).forEach((row, index) => {
    const date = parseSheetDate(row?.[0]);
    const amount = Number(row?.[1]);
    const memo = String(row?.[2] ?? '').trim();
    if (!date || !Number.isFinite(amount) || amount === 0) return;
    out.push({
      id: `IMP-DET-${index + 1}`,
      date,
      month: dateToMonthLabel(date),
      description: memo || 'Expense',
      category: categoryFromMemo(memo),
      amount,
      source: 'Exp - Detailed',
    });
  });
  return out;
}

export function expensesFromImportedSummary(grid = []) {
  const { rowIndex, months } = findMonthHeaderRow(grid);
  if (rowIndex < 0 || !months.length) return [];
  const out = [];
  let n = 1;
  for (const row of (grid || []).slice(rowIndex + 1)) {
    if (hasLeadingFlatNumber(row)) continue;
    const label = firstLabel(row);
    if (!label || skipImportedExpenseLabel(label)) continue;
    const category = /sundry/i.test(label) ? 'Sundry' : (categoryFromSummaryLabel(label) || '');
    if (!category) continue;
    for (const month of months) {
      const amount = parsePaidAmount(row[month.index]);
      if (amount === 0) continue;
      out.push({
        id: `IMP-SUM-${n}`,
        date: '',
        month: month.label,
        description: label,
        category,
        amount,
        source: 'Summary',
      });
      n += 1;
    }
  }
  return out;
}

export function mergeImportedExpenses(detailed = [], summary = []) {
  const detailedKeys = new Set(
    detailed.map((row) => `${row.month}|${row.category}|${row.amount}`),
  );
  const extra = summary.filter((row) => !detailedKeys.has(`${row.month}|${row.category}|${row.amount}`));
  return [...detailed, ...extra];
}

export function monthLabelsFromImported(collections = [], expenses = []) {
  const labels = [
    ...collections.map((row) => row.month),
    ...expenses.map((row) => row.month),
  ].filter(Boolean);
  return [...new Set(labels)];
}

export function collectionTotalForMonth(collections = [], month) {
  return (collections || [])
    .filter((row) => row.month === month)
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

export function expensesForMonth(expenses = [], month) {
  return (expenses || []).filter((row) => row.month === month);
}

export function expenseTotalForMonth(expenses = [], month) {
  return expensesForMonth(expenses, month).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

export function pickImportedMonth(months = [], preferred) {
  if (preferred && months.includes(preferred)) return preferred;
  return months[months.length - 1] || preferred || '';
}

export function importedExpenseCsv(rows = [], month) {
  const header = 'Date,Month,Description,Category,Amount,Source';
  const lines = (rows || []).map((row) => [
    row.date || '',
    row.month || month || '',
    `"${String(row.description || '').replace(/"/g, '""')}"`,
    `"${String(row.category || '').replace(/"/g, '""')}"`,
    Number(row.amount) || 0,
    row.source || '',
  ].join(','));
  return [header, ...lines].join('\n');
}

export function buildImportedWorkbookView({
  fileName = '',
  fileId = '',
  modifiedTime = '',
  summaryGrid = [],
  detailedGrid = [],
} = {}) {
  const collections = collectionsFromImportedSummary(summaryGrid);
  const expenses = mergeImportedExpenses(
    expensesFromImportedDetailed(detailedGrid),
    expensesFromImportedSummary(summaryGrid),
  );
  const months = monthLabelsFromImported(collections, expenses);
  return {
    fileName,
    fileId,
    modifiedTime,
    lastUpdated: lastUpdatedFromSummaryGrid(summaryGrid) || modifiedTime,
    availableBalance: availableBalanceFromSummaryGrid(summaryGrid),
    months,
    collections,
    expenses,
    readOnly: true,
  };
}
