/**
 * Cash-book math for The Pride of Tirumala.
 *
 * Opening surplus is ₹612 (cash in hand after Aug 2026, into Sep-26).
 * Each month starts with the previous month's available surplus or deficit.
 * This month: collected − spent = surplus (positive) or deficit (negative).
 * Running / available after the month = that opening + collected − spent.
 */

import { coerceMonthLabel, previousMonthLabel, sortMonthLabels } from './months';

export const OPENING_SURPLUS = 612;
export const FIRST_BOOKS_MONTH = 'Sep-26';

export function asMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function openingSurplusFromConfig(config) {
  const n = Number(config?.OPENING_SURPLUS);
  return Number.isFinite(n) ? n : OPENING_SURPLUS;
}

export function monthNet(collection, expenses) {
  return asMoney(collection) - asMoney(expenses);
}

export function cashStatus(amount) {
  const n = asMoney(amount);
  if (n > 0) return 'SURPLUS';
  if (n < 0) return 'DEFICIT';
  return 'BALANCED';
}

export function availableBalance(opening, totalCollection, totalExpenses) {
  return asMoney(opening) + asMoney(totalCollection) - asMoney(totalExpenses);
}

/**
 * Build month-by-month ledger from typed Maintenance and Expenses rows.
 * Does not invent amounts. Months before Sep-26 are ignored.
 */
export function buildLedger({
  opening = OPENING_SURPLUS,
  maintenance = [],
  expenses = [],
  extraMonths = [],
} = {}) {
  const startOpening = asMoney(opening);
  const months = sortMonthLabels([
    FIRST_BOOKS_MONTH,
    ...extraMonths,
    ...maintenance.map((row) => coerceMonthLabel(row.month) || row.month),
    ...expenses.map((row) => coerceMonthLabel(row.month) || row.month),
  ]).filter((label) => {
    const ym = String(label);
    return ym === FIRST_BOOKS_MONTH || sortMonthLabels([FIRST_BOOKS_MONTH, label])[0] === FIRST_BOOKS_MONTH;
  });

  let running = startOpening;
  let totalCollection = 0;
  let totalExpenses = 0;

  const rows = months.map((month) => {
    const paid = maintenance.filter((row) => (coerceMonthLabel(row.month) || row.month) === month);
    const spent = expenses.filter((row) => (coerceMonthLabel(row.month) || row.month) === month);
    const collection = paid.reduce((sum, row) => sum + asMoney(row.amountPaid), 0);
    const monthExpenses = spent.reduce((sum, row) => sum + asMoney(row.amount), 0);
    const net = monthNet(collection, monthExpenses);
    running += net;
    totalCollection += collection;
    totalExpenses += monthExpenses;
    const paidCount = paid.filter((row) => String(row.status || '').toUpperCase() === 'PAID').length;
    return {
      month,
      collection,
      expenses: monthExpenses,
      net,
      running,
      status: cashStatus(net),
      runningStatus: cashStatus(running),
      collectionPct: paid.length ? `${Math.round((paidCount / paid.length) * 100)}%` : '0%',
      pendingFlats: paid
        .filter((row) => {
          const status = String(row.status || '').toUpperCase();
          return status && status !== 'PAID' && status !== 'WAIVED';
        })
        .map((row) => row.flat)
        .filter(Boolean)
        .join(', '),
    };
  });

  const available = availableBalance(startOpening, totalCollection, totalExpenses);
  return {
    opening: startOpening,
    months: rows,
    totalCollection,
    totalExpenses,
    available,
    status: cashStatus(available),
  };
}

export function ledgerMonth(ledger, monthLabel) {
  return ledger?.months?.find((row) => row.month === monthLabel) || null;
}

/**
 * Cash in hand at the start of this month: books opening for Sep-26,
 * otherwise the previous month's available surplus or deficit.
 */
export function monthOpening(ledger, monthLabel) {
  const start = asMoney(ledger?.opening);
  const months = ledger?.months || [];
  if (!monthLabel) return start;
  const idx = months.findIndex((row) => row.month === monthLabel);
  if (idx === 0) return start;
  if (idx > 0) return asMoney(months[idx - 1].running);
  const prior = [...months].reverse().find((row) => {
    const ordered = sortMonthLabels([row.month, monthLabel]);
    return ordered[0] === row.month && row.month !== monthLabel;
  });
  return prior ? asMoney(prior.running) : start;
}

export function openingCardLabel(amount) {
  const status = cashStatus(amount);
  if (status === 'SURPLUS') return 'Opening surplus';
  if (status === 'DEFICIT') return 'Opening deficit';
  return 'Opening';
}

/**
 * Numbers the monthly PDF must print: opening, this month, running available.
 */
export function pdfMoneySummary(ledger, monthLabel) {
  const month = ledgerMonth(ledger, monthLabel);
  const opening = monthOpening(ledger, monthLabel);
  const collection = asMoney(month?.collection);
  const expenses = asMoney(month?.expenses);
  const net = month ? asMoney(month.net) : monthNet(collection, expenses);
  const available = month ? asMoney(month.running) : opening + net;
  return {
    openingSurplus: opening,
    openingStatus: cashStatus(opening),
    openingFromMonth: previousMonthLabel(monthLabel) || 'Aug-26',
    monthCollection: collection,
    monthExpenses: expenses,
    monthNet: net,
    monthStatus: month?.status || cashStatus(net),
    availableBalance: available,
    availableStatus: month?.runningStatus || cashStatus(available),
  };
}

export function ytdRowsFromLedger(ledger) {
  return (ledger?.months || []).map((row) => ({
    month: row.month,
    totalCollection: row.collection,
    totalExpenses: row.expenses,
    netBalance: row.net,
    cumulativeBalance: row.running,
    status: row.status,
    runningStatus: row.runningStatus,
    collectionPct: row.collectionPct,
    pendingFlats: row.pendingFlats,
  }));
}
