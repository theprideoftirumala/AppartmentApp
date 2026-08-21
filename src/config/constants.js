/**
 * Application Constants & Configuration
 * The Pride of Tirumala — Apartment Expense Tracker
 * 
 * All configurable values are centralized here.
 * Google Sheet "Configuration" sheet can override these at runtime.
 */

// ─── Google OAuth & API ──────────────────────────────────────────
export const GOOGLE_CLIENT_ID = '91050465180-vqn4p4qk0rq5ihstdquu95vjpegjcbld.apps.googleusercontent.com';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
];

// ─── Apartment Configuration ────────────────────────────────────
export const APP_NAME = 'The Pride of Tirumala';
export const APP_SHORT_NAME = 'TPT Tracker';
export const APP_VERSION = '1.0.0';

export const FLATS = ['101', '102', '201', '202', '301', '302', '401', '402', '501', '502'];

export const DEFAULT_CONFIG = {
  APARTMENT_NAME: 'The Pride of Tirumala',
  MONTHLY_MAINTENANCE: 3000,
  CORPUS_FUND: 0,
  DEFICIT_LAST_YEAR: -5200,
  FISCAL_YEAR_START: '2026-09',
  TREASURER_FLAT: '401',
  PRESIDENT_FLAT: '102',
  LATE_FEE: 100,
  LATE_FEE_AFTER_DAY: 15,
  EMERGENCY_RESERVE: 15000,
  MAX_USERS: 20,
  MAX_OWNERS: 2,
  WATCHMAN_NAME: '',
  WATCHMAN_PHONE: '',
  WATCHMAN_SALARY: 0,
  WATCHMAN_SHIFT: 'Night (8PM - 8AM)',
};

// ─── Google Drive Folder Names ──────────────────────────────────
export const DRIVE_ROOT_FOLDER = 'TPT-AppartmentApp';
export const DRIVE_EXPENSES_FOLDER = 'expenses-evidence';
export const DRIVE_BACKUPS_FOLDER = 'backups';
export const SHEET_FILE_NAME = 'TPT-MaintenanceTracker';

// ─── Google Sheets Structure ────────────────────────────────────
export const SHEET_NAMES = {
  CONFIGURATION: 'Configuration',
  FLATS: 'Flats',
  MAINTENANCE: 'Maintenance',
  EXPENSES: 'Expenses',
  MISC_FUNDS: 'Misc Funds',
  EMERGENCY_CONTACTS: 'Emergency Contacts',
  REMINDERS: 'Reminders',
  ACCESS_CONTROL: 'Access Control',
  AUDIT_LOG: 'Audit Log',
  WATER_TANKER: 'Water Tanker Log',
  MONTHLY_SUMMARY: 'Monthly Summary',
  WATCHMAN_DETAILS: 'Watchman Details',
};

export const SHEET_HEADERS = {
  [SHEET_NAMES.CONFIGURATION]: ['Key', 'Value', 'Description'],
  [SHEET_NAMES.FLATS]: [
    'Flat', 'Owner Name', 'Phone', 'Email',
    'Member2 Name', 'Member2 Phone', 'Member2 Email', 'Role',
  ],
  [SHEET_NAMES.MAINTENANCE]: [
    'Month', 'Flat', 'Amount Due', 'Amount Paid', 'Payment Date',
    'Payment Mode', 'UPI Ref', 'Status', 'Late Fee', 'Remarks',
  ],
  [SHEET_NAMES.EXPENSES]: [
    'ID', 'Date', 'Month', 'Description', 'Category', 'Amount',
    'Payment Mode', 'Bill/Receipt', 'Approved By', 'Receipt Drive Link', 'Remarks',
  ],
  [SHEET_NAMES.EMERGENCY_CONTACTS]: [
    'Category', 'Name', 'Role', 'Phone', 'Alt Phone', 'Address', 'Notes',
  ],
  [SHEET_NAMES.REMINDERS]: [
    'ID', 'Title', 'Description', 'Frequency', 'Next Due',
    'Last Completed', 'Assigned To', 'Status', 'Created By', 'Created Date',
  ],
  [SHEET_NAMES.ACCESS_CONTROL]: [
    'Email', 'Role', 'Flat', 'Added By', 'Added Date', 'Status',
  ],
  [SHEET_NAMES.AUDIT_LOG]: [
    'Timestamp', 'User', 'Action', 'Details',
  ],
  [SHEET_NAMES.WATER_TANKER]: [
    'Date', 'Vendor', 'Litres', 'Cost', 'Ordered By', 'Remarks',
  ],
  [SHEET_NAMES.MONTHLY_SUMMARY]: [
    'Month', 'Total Collection', 'Total Expenses', 'Net Balance',
    'Cumulative Balance', 'Collection %', 'Pending Flats',
  ],
  [SHEET_NAMES.WATCHMAN_DETAILS]: [
    'Name', 'Phone', 'Alt Phone', 'Address', 'Salary', 'Shift Timing',
    'Join Date', 'ID Proof Type', 'ID Proof Number', 'Emergency Contact',
    'Emergency Phone', 'Photo Drive Link', 'Status', 'Remarks',
  ],
  [SHEET_NAMES.MISC_FUNDS]: [
    'ID', 'Date', 'Month', 'Flat', 'Amount', 'Description',
    'Payment Mode', 'Collected By', 'Remarks',
  ],
};

// ─── Maintenance Constraints ───────────────────────────────────
export const MAINTENANCE_MIN_DATE = '2026-09-01';

// ─── Expense Categories ─────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Watchman Salary',
  'Common Electricity',
  'Generator Fuel',
  'WiFi Bill',
  'Water Bill (BWSSB)',
  'Water Tankers',
  'Lift Maintenance',
  'Generator Maintenance',
  'CCTV Maintenance',
  'Plumbing',
  'Electrical Repairs',
  'Cleaning / Housekeeping',
  'Pest Control',
  'Painting / Civil Work',
  'Festival / Events',
  'Legal / Administrative',
  'Insurance',
  'Bank Charges',
  'Miscellaneous',
];

// ─── Payment Modes ──────────────────────────────────────────────
export const PAYMENT_MODES = ['UPI', 'Cash', 'Bank Transfer', 'Cheque', 'Online'];

// ─── Maintenance Statuses ───────────────────────────────────────
export const MAINTENANCE_STATUS = {
  PAID: 'PAID',
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  WAIVED: 'WAIVED',
};

// ─── Reminder Frequencies ───────────────────────────────────────
export const REMINDER_FREQUENCIES = [
  'Daily',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Half-Yearly',
  'Yearly',
  'One-Time',
];

// ─── User Roles ─────────────────────────────────────────────────
export const USER_ROLES = {
  OWNER: 'Owner',
  READER: 'Reader',
};

// ─── Emergency Contact Categories ───────────────────────────────
export const EMERGENCY_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Lift / Elevator',
  'Generator',
  'CCTV',
  'WiFi / Internet',
  'Water Tanker',
  'Pest Control',
  'Medical / Hospital',
  'Fire Department',
  'Police',
  'Ambulance',
  'Gas Emergency',
  'Building Management',
  'Watchman',
  'Other',
];

// ─── Months (Fiscal Year Sept-Aug) ──────────────────────────────
export const FISCAL_MONTHS = [
  'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb',
  'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
];

/**
 * Generate month labels for a fiscal year
 * @param {string} startMonth - Format: "2026-09"
 * @returns {string[]} Array of month labels like ["Sep-26", "Oct-26", ...]
 */
export function generateFiscalMonths(startMonth = '2026-09') {
  const [startYear, startMon] = startMonth.split('-').map(Number);
  const months = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (startMon - 1 + i) % 12;
    const year = startYear + Math.floor((startMon - 1 + i) / 12);
    const shortYear = String(year).slice(-2);
    months.push(`${monthNames[monthIndex]}-${shortYear}`);
  }
  return months;
}

// ─── Default Reminders ──────────────────────────────────────────
export const DEFAULT_REMINDERS = [
  {
    title: 'Take Monthly Data Backup',
    description: 'Take a backup of the Google Sheet before month end. Go to Settings > Backups > Create Backup.',
    frequency: 'Monthly',
    assignedTo: 'Treasurer',
    nextDueType: 'end_of_month',
  },
  {
    title: 'Export Expenses PDF - Month End',
    description: 'Export monthly expenses PDF report and share in the WhatsApp group. Go to Reports > Export PDF.',
    frequency: 'Monthly',
    assignedTo: 'Treasurer',
    nextDueType: 'end_of_month',
  },
  {
    title: 'Share Expenses PDF - New Month',
    description: "Share previous month's expenses PDF summary in the WhatsApp group on the 1st of every month.",
    frequency: 'Monthly',
    assignedTo: 'Treasurer',
    nextDueType: 'start_of_month',
  },
  {
    title: 'Lift Maintenance Check',
    description: 'Call lift maintenance person for monthly inspection',
    frequency: 'Monthly',
  },
  {
    title: 'Generator Servicing',
    description: 'Schedule monthly generator servicing and fuel check',
    frequency: 'Monthly',
  },
  {
    title: 'Water Tank Cleaning',
    description: 'Schedule overhead water tank cleaning',
    frequency: 'Quarterly',
  },
  {
    title: 'Pest Control',
    description: 'Schedule pest control for common areas',
    frequency: 'Quarterly',
  },
  {
    title: 'CCTV Check',
    description: 'Verify all CCTV cameras are working properly',
    frequency: 'Monthly',
  },
  {
    title: 'Maintenance Collection Reminder',
    description: 'Send WhatsApp reminder for maintenance payment',
    frequency: 'Monthly',
  },
  {
    title: 'Fire Extinguisher Inspection',
    description: 'Check fire extinguisher validity and pressure',
    frequency: 'Half-Yearly',
  },
];

// ─── Local Storage Keys ─────────────────────────────────────────
export const STORAGE_KEYS = {
  SPREADSHEET_ID: 'tpt_spreadsheet_id',
  ROOT_FOLDER_ID: 'tpt_root_folder_id',
  USER_DATA: 'tpt_user_data',
  THEME: 'tpt_theme',
  SETUP_COMPLETE: 'tpt_setup_complete',
  CACHED_CONFIG: 'tpt_cached_config',
  CACHED_DASHBOARD: 'tpt_cached_dashboard',
  LAST_SYNC: 'tpt_last_sync',
  GUEST_PIN_HASH: 'tpt_guest_pin_hash',
  GUEST_SESSION: 'tpt_guest_session',
};
