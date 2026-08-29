import { coerceMonthLabel, sortMonthLabels } from './liveSummaryLayout';

/**
 * Year-to-date rows from Maintenance and Expenses tabs.
 * Does not invent amounts — only sums what is already on those tabs.
 */
export function ytdRowsFromTabs(maintenance = [], expenses = []) {
  const months = sortMonthLabels([
    ...maintenance.map((row) => coerceMonthLabel(row.month) || row.month),
    ...expenses.map((row) => coerceMonthLabel(row.month) || row.month),
  ]);
  let cumulative = 0;
  return months.map((month) => {
    const paid = maintenance.filter((row) => (coerceMonthLabel(row.month) || row.month) === month);
    const spent = expenses.filter((row) => (coerceMonthLabel(row.month) || row.month) === month);
    const totalCollection = paid.reduce((sum, row) => sum + (Number(row.amountPaid) || 0), 0);
    const totalExpenses = spent.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const netBalance = totalCollection - totalExpenses;
    cumulative += netBalance;
    const paidCount = paid.filter((row) => String(row.status || '').toUpperCase() === 'PAID').length;
    const collectionPct = paid.length ? `${Math.round((paidCount / paid.length) * 100)}%` : '0%';
    return {
      month,
      totalCollection,
      totalExpenses,
      netBalance,
      cumulativeBalance: cumulative,
      collectionPct,
    };
  });
}
