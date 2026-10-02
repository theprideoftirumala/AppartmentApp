/**
 * Figures for the Analysis page.
 * Headline money comes from ledgerMath. Category, flat, and payment-mode
 * series are sums of the Maintenance and Expenses rows for the selected month.
 * Nothing here forecasts or fills in a month that has no rows.
 */

import { categoryChartRows, collectionCounts, stillDueHighlights } from './expertReport';
import { asMoney, buildLedger, openingSurplusFromConfig, pdfMoneySummary } from './ledgerMath';
import { ytdRowsThroughMonth } from './reportViewModel';

const STATUS_LABELS = [
  ['PAID', 'Paid'],
  ['PARTIAL', 'Partial'],
  ['PENDING', 'Pending'],
  ['WAIVED', 'Waived'],
];

export function analysisForMonth({
  ledger,
  maintenance = [],
  expenses = [],
  month,
  config,
} = {}) {
  const books = ledger || buildLedger({
    opening: openingSurplusFromConfig(config),
    maintenance,
    expenses,
  });
  const money = pdfMoneySummary(books, month);
  const ytd = ytdRowsThroughMonth(books, month).map((row) => ({
    month: row.month,
    collection: row.totalCollection,
    expenses: row.totalExpenses,
    net: row.netBalance,
    running: row.cumulativeBalance,
  }));
  const monthMaintenance = (maintenance || []).filter((row) => row.month === month);
  const monthExpenses = (expenses || []).filter((row) => row.month === month);
  const spentFromRows = monthExpenses.reduce((sum, row) => sum + asMoney(row.amount), 0);

  return {
    month,
    money,
    ytd,
    categories: categoryChartRows(monthExpenses, spentFromRows).map((row) => ({
      key: row.name,
      label: row.name,
      amount: row.total,
      count: row.count,
      pct: row.pct,
    })),
    modes: paymentModeRows(monthExpenses),
    flats: flatRows(monthMaintenance),
    statuses: statusSlices(monthMaintenance),
    counts: collectionCounts(monthMaintenance),
    stillDue: stillDueHighlights(monthMaintenance),
    water: waterSpend(monthExpenses),
    spendChange: monthChange(ytd, month, 'expenses'),
    collectionChange: monthChange(ytd, month, 'collection'),
    expenseCount: monthExpenses.length,
  };
}

function monthChange(ytd, month, field) {
  const index = ytd.findIndex((row) => row.month === month);
  if (index <= 0) return null;
  const current = ytd[index][field];
  const previous = ytd[index - 1][field];
  return {
    previousMonth: ytd[index - 1].month,
    previous,
    current,
    delta: current - previous,
  };
}

function paymentModeRows(expenses) {
  const totals = new Map();
  for (const row of expenses) {
    const mode = String(row.paymentMode || '').trim() || 'Not recorded';
    totals.set(mode, (totals.get(mode) || 0) + asMoney(row.amount));
  }
  return [...totals.entries()]
    .map(([mode, amount]) => ({ key: mode, label: mode, amount }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

function flatRows(maintenance) {
  return maintenance
    .filter((row) => row.flat)
    .map((row) => {
      const due = asMoney(row.amountDue);
      const paid = asMoney(row.amountPaid);
      const fromSheet = Number(row.stillDue);
      const stillDue = Number.isFinite(fromSheet) ? fromSheet : Math.max(0, due - paid);
      return {
        flat: String(row.flat),
        due,
        paid,
        stillDue,
        status: String(row.status || 'PENDING').toUpperCase(),
      };
    })
    .sort((a, b) => a.flat.localeCompare(b.flat, undefined, { numeric: true }));
}

function statusSlices(maintenance) {
  const counts = { PAID: 0, PARTIAL: 0, PENDING: 0, WAIVED: 0 };
  let other = 0;
  for (const row of maintenance) {
    const status = String(row.status || 'PENDING').toUpperCase();
    if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
    else other += 1;
  }
  const slices = STATUS_LABELS.map(([key, label]) => ({ key, label, value: counts[key] }));
  if (other) slices.push({ key: 'OTHER', label: 'Other', value: other });
  return slices.filter((slice) => slice.value > 0);
}

function waterSpend(expenses) {
  const rows = expenses.filter((row) => /water/i.test(String(row.category || '')));
  return {
    amount: rows.reduce((sum, row) => sum + asMoney(row.amount), 0),
    count: rows.length,
  };
}
