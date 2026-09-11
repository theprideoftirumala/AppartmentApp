/**
 * Numbers and chart series for the monthly expert report.
 * Audit log, watchman, and misc funds stay out of this view.
 */

import { groupExpensesByCategory } from './helpers';

export function collectionCounts(maintenance = []) {
  const paid = maintenance.filter((row) => String(row.status || '').toUpperCase() === 'PAID').length;
  const pending = maintenance.filter((row) => String(row.status || '').toUpperCase() === 'PENDING').length;
  const partial = maintenance.filter((row) => String(row.status || '').toUpperCase() === 'PARTIAL').length;
  const total = maintenance.length;
  const pct = total ? Math.round((paid / total) * 100) : 0;
  return { paid, pending, partial, total, pct };
}

export function categoryChartRows(expenses = [], totalExpenses = 0) {
  const groups = groupExpensesByCategory(expenses);
  const total = Number(totalExpenses) || 0;
  return Object.entries(groups)
    .map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
      pct: total > 0 ? Math.round((data.total / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function compareBarPercents(collection, expenses) {
  const collected = Number(collection) || 0;
  const spent = Number(expenses) || 0;
  const max = Math.max(collected, spent, 1);
  return {
    collectionPct: Math.round((collected / max) * 100),
    expensesPct: Math.round((spent / max) * 100),
  };
}

export function stillDueHighlights(maintenance = []) {
  const rows = (maintenance || [])
    .map((row) => {
      const fromSheet = Number(row.stillDue);
      const fallback = Math.max(0, (Number(row.amountDue) || 0) - (Number(row.amountPaid) || 0));
      const stillDue = Number.isFinite(fromSheet) ? fromSheet : fallback;
      return { flat: row.flat, stillDue, status: row.status };
    })
    .filter((row) => row.stillDue > 0)
    .sort((a, b) => String(a.flat).localeCompare(String(b.flat)));
  return {
    rows,
    total: rows.reduce((sum, row) => sum + row.stillDue, 0),
  };
}

export function ytdChartRows(summaries = []) {
  const amounts = summaries.flatMap((row) => [
    Number(row.totalCollection) || 0,
    Number(row.totalExpenses) || 0,
  ]);
  const max = Math.max(1, ...amounts);
  return summaries.map((row) => {
    const collection = Number(row.totalCollection) || 0;
    const expenses = Number(row.totalExpenses) || 0;
    return {
      month: row.month,
      collection,
      expenses,
      net: Number(row.netBalance) || 0,
      running: Number(row.cumulativeBalance) || 0,
      collectionH: Math.round((collection / max) * 100),
      expensesH: Math.round((expenses / max) * 100),
      collectionPct: row.collectionPct,
    };
  });
}
