/**
 * Labels copied from the existing Summary tab expense block (screenshot of
 * The Pride of Tirumala-APP). Not invented. Maps to Expenses tab categories
 * so Live Summary totals are formulas (no typed duplicates).
 */

export const LIVE_SUMMARY_TAB = 'Live Summary';

/** Same wording as Summary rows 31–42. */
export const LIVE_SUMMARY_EXPENSE_ROWS = [
  { label: 'Cleaning', category: 'Cleaning' },
  { label: 'Generator charges (fuel and service)', category: 'Generator Fuel' },
  { label: 'Lift Service', category: 'Lift Service' },
  // Old Summary had a separate typed "Service charges" row. Live books log those amounts as Repairs & Maintenance (R&M). Formula is 0 so the same expense is not counted twice.
  { label: 'Service charges', category: 'Repairs & Maintenance', sumCategory: '' },
  { label: 'R&M', category: 'Repairs & Maintenance' },
  { label: 'Garbage/wastage', category: 'Garbage' },
  { label: 'Electricity bill', category: 'Common Electricity' },
  { label: 'Internet', category: 'Internet' },
  { label: 'Salary - Watchmen', category: 'Watchman Salary' },
  { label: 'Water charges', category: 'Water Charges' },
  { label: 'Pest Control', category: 'Pest Control' },
  { label: 'Sundry expenses', category: 'Sundry' },
];
