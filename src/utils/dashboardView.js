/**
 * Safe Dashboard view helpers. A freshly created APP-TPT-Tracker has no
 * Sep-26 rows yet — render must not throw on missing status or totals.
 */

import { sheetOpeningSurplus } from './helpers';

export function flatStatusClass(status) {
  return String(status || 'pending').toLowerCase();
}

/** Ledger available balance after create; falls back to opening ₹612. */
export function dashboardAvailableBalance(totals, config) {
  const n = Number(totals?.currentBalance);
  if (Number.isFinite(n)) return n;
  return sheetOpeningSurplus(config);
}
