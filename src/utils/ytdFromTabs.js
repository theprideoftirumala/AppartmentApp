import { buildLedger, ytdRowsFromLedger } from './ledgerMath';

/**
 * Year-to-date rows from Maintenance and Expenses.
 * Opening surplus is added so running balance matches the Balance tab.
 */
export function ytdRowsFromTabs(maintenance = [], expenses = [], opening = 612) {
  return ytdRowsFromLedger(buildLedger({ opening, maintenance, expenses }));
}
