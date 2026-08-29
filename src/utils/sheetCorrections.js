/**
 * Compare app totals with Google Sheet formula cells.
 * The sheet is the source of truth. Messages tell the treasurer what to fix
 * by hand — they do not invent amounts.
 */

export function amountsDiffer(left, right, epsilon = 0.05) {
  if (left == null || right == null) return false;
  const a = Number(left);
  const b = Number(right);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) > epsilon;
}

export function dashboardCorrectionMessages({
  liveSnap,
  appBalance,
  monthCollection,
  monthExpenses,
  sheetStillDue,
  computedStillDue,
  monthLabel,
} = {}) {
  const month = monthLabel || 'this month';
  const messages = [];
  if (liveSnap?.running != null && amountsDiffer(liveSnap.running, appBalance)) {
    messages.push(
      'Live Summary running available balance does not match the app total (opening + Aug 2026+ collections − expenses). The Google Sheet formulas are the source of truth. Check month labels (example Aug-26) on Maintenance and Expenses. Do not type amounts on Live Summary.',
    );
  }
  if (liveSnap?.collection != null && amountsDiffer(liveSnap.collection, monthCollection)) {
    messages.push(
      `Live Summary collection for ${month} does not match Maintenance Amount Paid. Edit Maintenance in the app or in the sheet, then refresh. Do not type the collection on Live Summary.`,
    );
  }
  if (liveSnap?.expenses != null && amountsDiffer(liveSnap.expenses, monthExpenses)) {
    messages.push(
      `Live Summary expenses for ${month} do not match the Expenses tab. Check category names and month labels. Sundry is line items, not a second monthly total.`,
    );
  }
  if (sheetStillDue != null && amountsDiffer(sheetStillDue, computedStillDue)) {
    messages.push(
      'Maintenance column K (Still Due) does not match Amount Due − Amount Paid. Column K is a formula — do not type over it. Settings → Backups → Refresh sheet layout if K is blank.',
    );
  }
  return messages;
}
