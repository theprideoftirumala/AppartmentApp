/**
 * Guide copy and sample rows written into the Google Sheet.
 * The workbook is the source of truth — these texts must stay readable
 * to a treasurer who never opens this app.
 */

import { FLATS, SHEET_NAMES } from '../config/constants';

export const GUIDE_ROWS = [
  ['START HERE', 'This Google Sheet IS the apartment cash book. The website only reads and writes these tabs. You can do everything here with a calculator and these tabs.', 'Keep the first (header) row. Do not rename tabs. Do not insert columns in the middle of a table. Add new rows at the bottom.'],
  ['Plain-English money words', 'Collection = money received from flats. Expenses = money spent. Misc funds = extra collections (festival, levy). Net = Collection + Misc − Expenses. Surplus = leftover (positive). Deficit = shortfall (negative).', 'Opening balance lives in Configuration as DEFICIT_LAST_YEAR (negative means the society started in the red).'],
  ['Who paid this month?', 'Open the Pending Dues tab. Type the month in the yellow cell (example Aug-26). You will see each flat, how much is still due, and a “Who to remind” list.', 'To record a payment, edit the Maintenance tab (or use the app). Pending Dues updates by itself — do not type in that grey table.'],
  ['Surplus or deficit this month?', 'Open Monthly Summary. Column Status says SURPLUS or DEFICIT. Net Balance is this month’s leftover or shortfall. Cumulative adds months together plus the opening balance.', 'Those numbers are formulas. Do not type over columns B–I. Only add a month name in column A if it is missing (or click Sync Sheet in the app).'],
  ['Two setup modes', 'SAMPLE fills live tabs with pretend data so you can practise. FRESH leaves live tabs empty for real society use.', 'After testing: Settings → Create Fresh Production Sheet. The sample workbook is renamed and kept in Drive as an archive.'],
  ['Tab: Guide', 'This help tab. Safe to read. The app may refresh this wording when the treasurer opens the site.', 'Share this sheet with residents as Viewer if they only need to read numbers.'],
  ['Tab: Configuration', 'Key / Value / Description. The app reads Key and Value. Description is for humans.', 'Change MONTHLY_MAINTENANCE here to change the amount for every flat. Use plain numbers, no ₹ or commas (write 3000 not ₹3,000).'],
  ['Tab: Flats', 'One row per flat (101–502). Owner name, phone, email, and committee role.', 'Committee Role is a label (Member / Treasurer / President). Treasurer and President flats must also be set in Configuration.'],
  ['Tab: Maintenance', 'One row per flat per month. This is the payment register. Status must be exactly PAID, PENDING, PARTIAL, or WAIVED.', 'Month: MMM-YY (Sep-26). Date: YYYY-MM-DD (2026-09-15). Amounts: plain numbers. Column K (Still Due) is a formula = due − paid. Do not type in K.'],
  ['Tab: Pending Dues', 'A simple lookup: change the yellow month cell and see who still owes money.', 'Safe for residents to open. If a number looks wrong, fix the matching row on Maintenance — not here.'],
  ['Tab: Expenses', 'Every payment out of the maintenance fund. ID is usually EXP-… from the app. You may add a row by hand if needed.', 'Category should match a known category (see Sample Data). Bill Attached is Y or N. Receipt link must be a Google Drive URL. Amount is a plain number.'],
  ['Tab: Misc Funds', 'Extra money collected besides monthly maintenance (festival, special levy, donation).', 'Include the Flat that paid. Month must match Maintenance month labels (Sep-26).'],
  ['Tab: Emergency Contacts', 'Plumber, lift, hospital, police, etc.', 'You can add rows anytime. Category helps grouping. Phone is 10-digit Indian mobile where possible.'],
  ['Tab: Reminders', 'Recurring society tasks. Status Active = shown in the app. Inactive = hidden.', 'Next Due and Last Completed use YYYY-MM-DD. Frequency: Daily, Weekly, Monthly, Quarterly, Half-Yearly, Yearly, One-Time.'],
  ['Tab: Access Control', 'Who may open the website. Email + Role + Status. Only Active rows can sign in.', 'Role is Owner (can edit) or Reader (view only). Max 20 users, max 2 Owners. Email must be the Google account they sign in with.'],
  ['Tab: Audit Log', 'Automatic history of app writes. Do not edit or delete rows.', 'If something looks wrong, filter by User or Action to see who changed it.'],
  ['Tab: Water Tanker Log', 'Each tanker delivery. Cost here is for the log; also add a matching Expenses row if paid from the fund.', 'Litres and Cost are plain numbers.'],
  ['Tab: Monthly Summary', 'One row per month. Collection, misc, expenses, net, running total, collection %, pending flats, SURPLUS or DEFICIT.', 'Columns B–I are live formulas from Maintenance, Expenses, and Misc Funds. Type only the month in column A if you add a row by hand.'],
  ['Tab: Watchman Details', 'Staff record for the current / past watchman. Status Active or Inactive.', 'Salary is a number. Photo link must be a Google Drive URL if used. Do not share ID numbers widely.'],
  ['Tab: Sample Data', 'Copy-paste examples only. Live numbers live in the named tabs above.', 'Safe to keep. Does not affect dashboard totals.'],
  ['How to add a payment by hand', 'On Maintenance, find the row for that month + flat (or add a new row). Fill Amount Paid, Payment Date, Mode, and set Status to PAID, PARTIAL, or PENDING.', 'Still Due (column K) and Pending Dues update automatically. Do not start a cell with = + - or @ unless you intend a formula.'],
  ['How to add an expense by hand', 'On Expenses, add a row at the bottom. Leave ID as EXP-HAND-1 (or any unique text). Fill Date, Month, Description, Category, Amount.', 'The app can also add several expenses in one go. Either way, Monthly Summary expenses update via formula.'],
  ['Manual edit rules', 'Dates: YYYY-MM-DD. Months: Sep-26. Amounts: 3000 (no ₹, no commas). Statuses: exact spelling and capitals.', 'Never type over formula cells (Maintenance column K, Monthly Summary B–I, Pending Dues grey table). Leave unused cells blank.'],
  ['If the website stops', 'This sheet still works. File → Version history can undo mistakes. Settings → Backup copies the whole file to Drive/backups.', 'To reconnect the app: run Setup again. It finds TPT-MaintenanceTracker in Drive. Nothing is deleted.'],
];

export const SAMPLE_CATALOG_ROWS = [
  ['HOW TO USE THIS TAB', 'Rows below are examples. Copy a row into the matching live tab if you want to type data by hand.', 'During SAMPLE setup the live tabs are already filled. During FRESH setup the live tabs stay empty and this tab is your template.'],
  ['Configuration example', 'MONTHLY_MAINTENANCE | 3000 | Monthly maintenance amount each flat pays (₹)', 'Key in column A of Configuration, value in B, description in C'],
  ['Flats example', '101 | Sample Owner 101 | 9876500101 | owner101@example.com | | | | Member', 'One row per flat. Keep Flat numbers 101, 102, 201, 202, 301, 302, 401, 402, 501, 502'],
  ['Maintenance example', 'Sep-26 | 101 | 3000 | 3000 | 2026-09-05 | UPI | UPI123456 | PAID | 0 | Paid on time', 'Status must be PAID, PENDING, PARTIAL, or WAIVED'],
  ['Expenses example', 'EXP-SAMPLE-1 | 2026-09-08 | Sep-26 | Watchman salary September | Watchman Salary | 12000 | Bank Transfer | Y | Treasurer | | Monthly salary', 'Amount is a number. Bill Attached is Y or N'],
  ['Misc Funds example', 'MISC-SAMPLE-1 | 2026-09-20 | Sep-26 | 202 | 500 | Ganesh festival contribution | UPI | Treasurer | Optional note', 'Extra collection, not monthly maintenance'],
  ['Emergency Contacts example', 'Plumbing | Sample Plumber | On-call | 9876500991 | | Near gate | Available 8am–8pm', 'Phone is 10-digit Indian mobile'],
  ['Reminders example', 'REM-SAMPLE-1 | Lift Maintenance Check | Call AMC vendor | Monthly | 2026-09-30 | | Treasurer | Active | System | 2026-09-01', 'Frequency must be one of the allowed list'],
  ['Access Control example', 'treasurer@example.com | Owner | 401 | System | 2026-09-01 | Active', 'Use the real Gmail the person signs in with'],
  ['Water Tanker example', '2026-09-12 | Sample Water Supply | 6000 | 1800 | Flat 102 | Summer shortage', 'Also add an Expenses row if paid from the fund'],
  ['Monthly Summary example', 'Sep-26 in column A only. Columns B–I are formulas (Collection, Misc, Expenses, Net, Cumulative, %, Pending, SURPLUS/DEFICIT).', 'Do not paste numbers into B–I. Type the month, or click Sync Sheet in the app.'],
  ['Pending Dues example', 'Put Aug-26 in the yellow cell B3. The 10-flat table and “Who to remind” fill from Maintenance.', 'If Still Due looks wrong, fix Amount Due / Amount Paid on the Maintenance tab.'],
  ['Watchman example', 'Sample Watchman | 9876500888 | | Staff quarters | 12000 | Night (8PM - 8AM) | 2026-04-01 | Aadhaar | XXXX | Sample Contact | 9876500777 | | Active | Night shift', 'Do not put real ID numbers in the sample sheet'],
];

function sampleFlats() {
  const names = [
    ['Sample Owner 101', '9876500101', 'owner101@example.com', 'Member'],
    ['Sample Owner 102', '9876500102', 'owner102@example.com', 'President'],
    ['Sample Owner 201', '9876500201', 'owner201@example.com', 'Member'],
    ['Sample Owner 202', '9876500202', 'owner202@example.com', 'Member'],
    ['Sample Owner 301', '9876500301', 'owner301@example.com', 'Member'],
    ['Sample Owner 302', '9876500302', 'owner302@example.com', 'Member'],
    ['Sample Owner 401', '9876500401', 'owner401@example.com', 'Treasurer'],
    ['Sample Owner 402', '9876500402', 'owner402@example.com', 'Member'],
    ['Sample Owner 501', '9876500501', 'owner501@example.com', 'Member'],
    ['Sample Owner 502', '9876500502', 'owner502@example.com', 'Member'],
  ];
  return FLATS.map((flat, i) => {
    const [owner, phone, email, role] = names[i];
    return [flat, owner, phone, email, '', '', '', role];
  });
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthLabel(date) {
  return `${MONTHS_SHORT[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
}

function formatYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const PAID_HEAVY = {
  '101': ['3000', '3000', '05', 'UPI', 'UPI900101', 'PAID', '0', 'Paid on time'],
  '102': ['3000', '3000', '04', 'UPI', 'UPI900102', 'PAID', '0', ''],
  '201': ['3000', '3000', '08', 'Bank Transfer', 'NEFT201', 'PAID', '0', ''],
  '202': ['3000', '3000', '10', 'UPI', 'UPI900202', 'PAID', '0', ''],
  '301': ['3000', '3000', '06', 'Cash', '', 'PAID', '0', 'Collected at door'],
  '302': ['3000', '3000', '12', 'UPI', 'UPI900302', 'PAID', '0', ''],
  '401': ['3000', '3000', '03', 'UPI', 'UPI900401', 'PAID', '0', 'Treasurer'],
  '402': ['3000', '3000', '09', 'UPI', 'UPI900402', 'PAID', '0', ''],
  '501': ['3000', '0', '', '', '', 'PENDING', '0', 'Reminder sent'],
  '502': ['3000', '1500', '18', 'UPI', 'UPI900502', 'PARTIAL', '100', 'Promised balance next week'],
};

const MIXED_COLLECTION = {
  '101': ['3000', '3000', '04', 'UPI', 'UPI100101', 'PAID', '0', ''],
  '102': ['3000', '3000', '03', 'UPI', 'UPI100102', 'PAID', '0', ''],
  '201': ['3000', '0', '', '', '', 'PENDING', '0', ''],
  '202': ['3000', '3000', '07', 'UPI', 'UPI100202', 'PAID', '0', ''],
  '301': ['3000', '3000', '06', 'Cash', '', 'PAID', '0', ''],
  '302': ['3000', '0', '', '', '', 'PENDING', '0', ''],
  '401': ['3000', '3000', '02', 'UPI', 'UPI100401', 'PAID', '0', ''],
  '402': ['3000', '3000', '08', 'Bank Transfer', 'NEFT402', 'PAID', '0', ''],
  '501': ['3000', '0', '', '', '', 'PENDING', '0', ''],
  '502': ['3000', '3000', '11', 'UPI', 'UPI100502', 'PAID', '0', ''],
};

function patternToRows(label, yearMonth, pattern) {
  return FLATS.map((flat) => {
    const [due, paid, day, mode, ref, status, late, remarks] = pattern[flat];
    const date = paid !== '0' && day ? `${yearMonth}-${day}` : '';
    return [label, flat, due, paid, date, mode, ref, status, late, remarks];
  });
}

function sampleMaintenance(refDate = new Date()) {
  const current = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const prev = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
  const seen = new Set();
  const rows = [];
  const add = (label, yearMonth, pattern) => {
    if (seen.has(label)) return;
    seen.add(label);
    rows.push(...patternToRows(label, yearMonth, pattern));
  };
  // Current + previous month so the dashboard is not empty when testing today.
  add(formatMonthLabel(prev), formatYearMonth(prev), PAID_HEAVY);
  add(formatMonthLabel(current), formatYearMonth(current), MIXED_COLLECTION);
  add('Sep-26', '2026-09', PAID_HEAVY);
  add('Oct-26', '2026-10', MIXED_COLLECTION);
  return rows;
}

function sampleExpenses(refDate = new Date()) {
  const current = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const currentLabel = formatMonthLabel(current);
  const ym = formatYearMonth(current);
  const catalog = [
    ['EXP-SAMPLE-1', '2026-09-05', 'Sep-26', 'Watchman salary — September', 'Watchman Salary', '12000', 'Bank Transfer', 'N', 'Treasurer', '', 'Monthly salary'],
    ['EXP-SAMPLE-2', '2026-09-08', 'Sep-26', 'BESCOM common area bill', 'Common Electricity', '2400', 'Online', 'Y', 'Treasurer', '', 'Sep cycle'],
    ['EXP-SAMPLE-3', '2026-09-12', 'Sep-26', 'Water tanker — 6000 L', 'Water Tankers', '1800', 'UPI', 'N', 'Flat 102', '', 'Summer shortage'],
    ['EXP-SAMPLE-4', '2026-09-18', 'Sep-26', 'Lift AMC visit', 'Lift Maintenance', '1500', 'UPI', 'Y', 'Treasurer', '', 'Monthly inspection'],
    ['EXP-SAMPLE-5', '2026-09-22', 'Sep-26', 'Generator diesel 20 L', 'Generator Fuel', '1800', 'Cash', 'N', 'Treasurer', '', ''],
    ['EXP-SAMPLE-6', '2026-10-05', 'Oct-26', 'Watchman salary — October', 'Watchman Salary', '12000', 'Bank Transfer', 'N', 'Treasurer', '', 'Monthly salary'],
    ['EXP-SAMPLE-7', '2026-10-09', 'Oct-26', 'Common area cleaning', 'Cleaning / Housekeeping', '800', 'Cash', 'N', 'Treasurer', '', 'Staircase + lobby'],
    ['EXP-SAMPLE-8', '2026-10-14', 'Oct-26', 'Plumbing — terrace leak', 'Plumbing', '950', 'UPI', 'Y', 'Flat 102', '', 'Emergency call'],
  ];
  if (currentLabel === 'Sep-26' || currentLabel === 'Oct-26') return catalog;
  return [
    [`EXP-SAMPLE-NOW-1`, `${ym}-05`, currentLabel, `Watchman salary — ${currentLabel}`, 'Watchman Salary', '12000', 'Bank Transfer', 'N', 'Treasurer', '', 'Sample current month'],
    [`EXP-SAMPLE-NOW-2`, `${ym}-08`, currentLabel, 'BESCOM common area bill', 'Common Electricity', '2100', 'Online', 'Y', 'Treasurer', '', 'Sample current month'],
    [`EXP-SAMPLE-NOW-3`, `${ym}-12`, currentLabel, 'Water tanker — 6000 L', 'Water Tankers', '1800', 'UPI', 'N', 'Flat 102', '', 'Sample current month'],
    ...catalog,
  ];
}

function sampleReminders(refDate = new Date()) {
  const today = refDate.toISOString().split('T')[0];
  const soon = new Date(refDate);
  soon.setDate(soon.getDate() + 3);
  const soonStr = soon.toISOString().split('T')[0];
  return [
    ['REM-SAMPLE-1', 'Lift Maintenance Check', 'Call AMC vendor for monthly inspection', 'Monthly', soonStr, '', 'Treasurer', 'Active', 'System', today],
    ['REM-SAMPLE-2', 'Take Monthly Data Backup', 'Create a Drive backup of the tracker', 'Monthly', soonStr, '', 'Treasurer', 'Active', 'System', today],
    ['REM-SAMPLE-3', 'Maintenance Collection Reminder', 'WhatsApp reminder for pending flats', 'Monthly', today, '', 'Treasurer', 'Active', 'System', today],
  ];
}

export function buildSampleLiveRows(refDate = new Date()) {
  const current = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const prev = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
  const currentLabel = formatMonthLabel(current);
  const prevLabel = formatMonthLabel(prev);
  const summaryMonths = [prevLabel, currentLabel];
  if (!summaryMonths.includes('Sep-26')) summaryMonths.push('Sep-26');
  if (!summaryMonths.includes('Oct-26')) summaryMonths.push('Oct-26');
  const summaries = summaryMonths.map((label) => [label]);

  return {
    [SHEET_NAMES.FLATS]: sampleFlats(),
    [SHEET_NAMES.MAINTENANCE]: sampleMaintenance(refDate),
    [SHEET_NAMES.EXPENSES]: sampleExpenses(refDate),
    [SHEET_NAMES.MISC_FUNDS]: [
      ['MISC-SAMPLE-NOW', `${formatYearMonth(current)}-15`, currentLabel, '202', '500', 'Sample extra collection', 'UPI', 'Treasurer', 'Test row'],
      ['MISC-SAMPLE-1', '2026-09-20', 'Sep-26', '202', '500', 'Ganesh festival contribution', 'UPI', 'Treasurer', 'Voluntary'],
      ['MISC-SAMPLE-2', '2026-10-02', 'Oct-26', '401', '1000', 'Diwali lighting share', 'Cash', 'Treasurer', ''],
    ],
    [SHEET_NAMES.EMERGENCY_CONTACTS]: [
      ['Plumbing', 'Sample Plumber', 'On-call', '9876500991', '9876500992', 'Near main gate', '8am–8pm'],
      ['Electrical', 'Sample Electrician', 'On-call', '9876500981', '', '', 'Emergency nights ok'],
      ['Lift / Elevator', 'Sample Lift AMC', 'Technician', '9876500971', '', 'Vendor workshop', 'Monthly AMC'],
      ['Medical / Hospital', 'Sample Clinic', 'Duty doctor', '9876500961', '108', '1 km from gate', '24x7'],
      ['Police', 'Sample Police Station', 'Control room', '100', '', '', 'Dial 100'],
      ['Watchman', 'Sample Watchman', 'Night shift', '9876500888', '', 'Staff quarters', '8PM–8AM'],
    ],
    [SHEET_NAMES.REMINDERS]: sampleReminders(refDate),
    [SHEET_NAMES.WATER_TANKER]: [
      [`${formatYearMonth(current)}-12`, 'Sample Water Supply', '6000', '1800', 'Flat 102', 'Sample current month'],
      ['2026-09-12', 'Sample Water Supply', '6000', '1800', 'Flat 102', 'Summer shortage'],
      ['2026-10-16', 'Sample Water Supply', '6000', '1800', 'Treasurer', 'Tank low'],
    ],
    [SHEET_NAMES.WATCHMAN_DETAILS]: [
      ['Sample Watchman', '9876500888', '', 'Staff quarters', '12000', 'Night (8PM - 8AM)', '2026-04-01', 'Aadhaar', 'SAMPLE-NOT-REAL', 'Sample Contact', '9876500777', '', 'Active', 'Night shift — sample row'],
    ],
    [SHEET_NAMES.MONTHLY_SUMMARY]: summaries,
  };
}
