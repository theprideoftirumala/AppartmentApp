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
  // Receipts, backups, and copies of the society workbook this account can access.
  'https://www.googleapis.com/auth/drive.file',
  // Lets members LIST The Pride of Tirumala-APP when it was shared with them.
  'https://www.googleapis.com/auth/drive.metadata.readonly',
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
export const APP_VERSION = '1.9.2';

/**
 * Bump this when GOOGLE_SCOPES change so existing sessions re-consent.
 * v2 added drive.metadata.readonly so shared workbooks are listable.
 */
export const OAUTH_SCOPE_VERSION = '2';

export const FLATS = ['101', '102', '201', '202', '301', '302', '401', '402', '501', '502'];

/**
 * Turn features on or off without hunting through pages.
 * Late fee and Misc Funds stay in the Google Sheet for old rows, but the app no longer collects them.
 */
export const FEATURES = {
  LATE_FEE: false,
  MISC_FUNDS: false,
  VOICE_EXPENSES: true,
  CAMERA_EXPENSES: true,
  ACTIVITY_FUNDS: true,
  LOGIN_BACKUP: true,
  SAMPLE_DATA: false,
  PAYEES: true,
  SURPLUS_DEFICIT: false,
};

export function isYesFlag(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'y' || v === 'yes' || v === 'true' || v === '1';
}

/** Sample live-tab data is off unless Settings → Configuration sets SAMPLE_DATA to Y. */
export function isSampleDataEnabled(config) {
  if (!FEATURES.SAMPLE_DATA) return false;
  const raw = config?.SAMPLE_DATA ?? DEFAULT_CONFIG.SAMPLE_DATA;
  return isYesFlag(raw);
}

/**
 * Shown at the bottom of the website and on every generated PDF.
 * Volunteer-toned: cooperative, not blaming members.
 */
export const SOCIETY_DISCLAIMER =
  'These accounts are kept by resident volunteers on behalf of the society, alongside their own work. Figures may be updated as bills arrive. Please bear with us and support one another — we will help as soon as we can. The Google Sheet is the source of truth.';

/** AVAILABLE_BALANCE is not listed here — the app copies the Summary tab green cell. */
export const DEFAULT_CONFIG = {
  APARTMENT_NAME: 'The Pride of Tirumala',
  MONTHLY_MAINTENANCE: 3000,
  CORPUS_FUND: 0,
  DEFICIT_LAST_YEAR: 0,
  FISCAL_YEAR_START: '2020-11',
  TREASURER_FLAT: '401',
  PRESIDENT_FLAT: '102',
  MAX_USERS: 20,
  MAX_OWNERS: 2,
  WATCHMAN_NAME: '',
  WATCHMAN_PHONE: '',
  WATCHMAN_SALARY: 8500,
  WATCHMAN_SHIFT: 'Night (8PM - 8AM)',
  APARTMENT_ADDRESS: 'PLNo 49&48&47, Road No 20, Alkapur, Neknampur, 500089',
  SAMPLE_DATA: 'N',
};

/** First live app month. History import ends the month before. August 2026 is included. */
export const LIVE_APP_START = '2026-08';
export const FIRST_LIVE_MONTH_LABEL = 'Aug-26';

// ─── Google Drive Folder Names ──────────────────────────────────
export const DRIVE_ROOT_FOLDER = 'TPT-AppartmentApp';
export const DRIVE_EXPENSES_FOLDER = 'expenses-evidence';
export const DRIVE_BACKUPS_FOLDER = 'backups';
export const DRIVE_ACTIVITY_FOLDER = 'activity-funds';
/** Live society workbook in Drive. Do not create a second file. */
export const SHEET_FILE_NAME = 'The Pride of Tirumala-APP';
/** Aug 2026+ books. Founding owner may create this file. Never named TPT-MaintenanceTracker. */
export const LIVE_SHEET_FILE_NAME = 'The Pride of Tirumala-LIVE';
export const SOCIETY_SHEET_ALIASES = [
  'The Pride of Tirumala-APP',
  'The Pride of Tirumala-APP.xlsx',
];
export const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
export const EXCEL_SHEET_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
/** History tabs already in The Pride of Tirumala-APP.xlsx — never overwrite. */
export const LEGACY_SHEET_TABS = [
  'Summary',
  'Exp - Detailed',
  'Borewell Exp',
  'Motor repair oct',
  'Notes',
];
export const ACTIVITY_FILE_PREFIX = 'TPT-Activity-';
export const SHEET_SAMPLE_SUFFIX = '-SAMPLE';

export function normalizeSocietySheetName(name) {
  return String(name || '').trim().toLowerCase().replace(/\.xlsx$/i, '');
}

/** True for The Pride of Tirumala-APP with or without .xlsx. */
export function isSocietySheetName(name) {
  const normalized = normalizeSocietySheetName(name);
  if (!normalized) return false;
  if (normalized.endsWith('-old')) return false;
  return SOCIETY_SHEET_ALIASES.some((alias) => normalizeSocietySheetName(alias) === normalized);
}

/** Live Google Sheet only — not the .xlsx, not The Pride of Tirumala-APP-old. */
export function isLiveSocietySheetName(name) {
  const raw = String(name || '').trim();
  if (!raw || /\.xlsx$/i.test(raw)) return false;
  return normalizeSocietySheetName(raw) === normalizeSocietySheetName(SHEET_FILE_NAME);
}

export function isLiveWorkbookName(name) {
  return String(name || '').trim() === LIVE_SHEET_FILE_NAME;
}

export function isGoogleSpreadsheetMime(mimeType) {
  return mimeType === GOOGLE_SHEET_MIME;
}

// ─── Google Sheets Structure ────────────────────────────────────
// Order here is the tab order in a newly created workbook.
export const SHEET_NAMES = {
  GUIDE: 'Guide',
  CONFIGURATION: 'Configuration',
  HANDOVER_SUMMARY: 'Handover Summary',
  FLATS: 'Flats',
  MAINTENANCE: 'Maintenance',
  PENDING_DUES: 'Pending Dues',
  EXPENSES: 'Expenses',
  PAYEES: 'Payees',
  EMERGENCY_CONTACTS: 'Emergency Contacts',
  SOCIETY_NOTES: 'Society Notes',
  REMINDERS: 'Reminders',
  ACCESS_CONTROL: 'Access Control',
  AUDIT_LOG: 'Audit Log',
  WATER_TANKER: 'Water Tanker Log',
  MONTHLY_SUMMARY: 'Monthly Summary',
  LIVE_SUMMARY: 'Live Summary',
  WATCHMAN_DETAILS: 'Watchman Details',
  ACTIVITY_FUNDS: 'Activity Funds',
  MISC_FUNDS: 'Misc Funds',
};

export const CONFIG_DESCRIPTIONS = {
  APARTMENT_NAME: 'Name of the apartment complex (shown on dashboard and PDF reports)',
  MONTHLY_MAINTENANCE: 'Monthly maintenance amount each flat pays (₹). Example: 3000',
  CORPUS_FUND: 'One-time corpus fund balance (₹). Edit here; the app reads this value.',
  DEFICIT_LAST_YEAR: 'Do not add an extra opening amount. History from Summary and Exp-Detailed is already in Maintenance and Expenses.',
  AVAILABLE_BALANCE: 'Copied from the green Available balance cell on the Summary tab. Do not type a fixed number in the app source.',
  APARTMENT_ADDRESS: 'Postal address of the apartment',
  FISCAL_YEAR_START: 'First month on the books as YYYY-MM. History starts 2020-11.',
  TREASURER_FLAT: 'Flat number of the current Treasurer (must match a row in the Flats tab)',
  PRESIDENT_FLAT: 'Flat number of the current President (must match a row in the Flats tab)',
  MAX_USERS: 'Maximum email addresses allowed in Access Control',
  MAX_OWNERS: 'Maximum Owner-role users (people who can edit)',
  WATCHMAN_NAME: 'Default watchman display name (optional; detailed records live in Watchman Details)',
  WATCHMAN_PHONE: 'Default watchman phone (optional)',
  WATCHMAN_SALARY: 'Default monthly watchman salary in ₹ (optional)',
  WATCHMAN_SHIFT: 'Default shift timing text (optional)',
  SAMPLE_DATA: 'Y to allow loading pretend test rows. N keeps live tabs for real collections only.',
};

export const SHEET_HEADERS = {
  [SHEET_NAMES.GUIDE]: ['Topic', 'What it means', 'How to use / edit'],
  [SHEET_NAMES.CONFIGURATION]: ['Key', 'Value', 'Description'],
  [SHEET_NAMES.FLATS]: [
    'Flat', 'Owner Name', 'Phone', 'Email',
    'Member 2 Name', 'Member 2 Phone', 'Member 2 Email', 'Committee Role',
  ],
  [SHEET_NAMES.MAINTENANCE]: [
    'Month (MMM-YY)', 'Flat', 'Amount Due (₹)', 'Amount Paid (₹)', 'Payment Date (YYYY-MM-DD)',
    'Payment Mode', 'UPI / Ref No', 'Status (PAID/PENDING/PARTIAL/WAIVED)', 'Late Fee (₹)', 'Remarks',
    'Still Due (₹) — auto formula, do not type here',
  ],
  [SHEET_NAMES.PENDING_DUES]: [
    'What this is', 'What to do', 'Notes',
  ],
  [SHEET_NAMES.EXPENSES]: [
    'ID', 'Date (YYYY-MM-DD)', 'Month (MMM-YY)', 'Description', 'Category', 'Amount (₹)',
    'Payment Mode', 'Bill Attached (Y/N)', 'Approved By', 'Receipt Drive Link', 'Remarks',
  ],
  [SHEET_NAMES.EMERGENCY_CONTACTS]: [
    'Category', 'Name', 'Role', 'Phone', 'Alt Phone', 'Address', 'Notes',
  ],
  [SHEET_NAMES.REMINDERS]: [
    'ID', 'Title', 'Description', 'Frequency', 'Next Due (YYYY-MM-DD)',
    'Last Completed (YYYY-MM-DD)', 'Assigned To', 'Status (Active/Inactive)', 'Created By', 'Created Date',
  ],
  [SHEET_NAMES.ACCESS_CONTROL]: [
    'Email', 'Role (Owner/Reader)', 'Flat', 'Added By', 'Added Date (YYYY-MM-DD)', 'Status (Active/Inactive)',
  ],
  [SHEET_NAMES.AUDIT_LOG]: [
    'Timestamp (ISO)', 'User Email', 'Action', 'Details',
  ],
  [SHEET_NAMES.WATER_TANKER]: [
    'Date (YYYY-MM-DD)', 'Vendor', 'Litres', 'Cost (₹)', 'Ordered By', 'Remarks',
  ],
  [SHEET_NAMES.MONTHLY_SUMMARY]: [
    'Month (MMM-YY)', 'Collection (₹)', 'Misc Funds (₹)', 'Expenses (₹)', 'Net Balance (₹)',
    'Cumulative (₹)', 'Collection %', 'Pending Flats', 'Status (SURPLUS/DEFICIT)',
  ],
  [SHEET_NAMES.WATCHMAN_DETAILS]: [
    'Name', 'Phone', 'Alt Phone', 'Address', 'Salary (₹)', 'Shift Timing',
    'Join Date (YYYY-MM-DD)', 'ID Proof Type', 'ID Proof Number', 'Emergency Contact',
    'Emergency Phone', 'Photo Drive Link', 'Status', 'Remarks',
  ],
  [SHEET_NAMES.MISC_FUNDS]: [
    'ID', 'Date (YYYY-MM-DD)', 'Month (MMM-YY)', 'Flat', 'Amount (₹)', 'Description',
    'Payment Mode', 'Collected By', 'Remarks',
  ],
  [SHEET_NAMES.HANDOVER_SUMMARY]: [
    'Month', 'Carry in (₹)', 'Collection (₹)', 'Expenses (₹)', 'Month surplus (₹)',
    'Cleaning', 'Generator', 'Lift', 'Service', 'Repairs', 'Garbage',
    'Electricity', 'Internet', 'Watchman', 'Water', 'Pest Control', 'Sundry',
  ],
  [SHEET_NAMES.PAYEES]: [
    'Payee key', 'Category', 'Display name', 'Phone', 'UPI ID', 'Default amount (₹)', 'Notes',
  ],
  [SHEET_NAMES.SOCIETY_NOTES]: ['Topic', 'What we know', 'Value from old workbook'],
  [SHEET_NAMES.ACTIVITY_FUNDS]: [
    'Activity ID', 'Name', 'Spreadsheet ID', 'Status (Open/Closed)',
    'Created Date (YYYY-MM-DD)', 'Created By', 'Target Amount (₹)', 'Notes',
  ],
};

/** Tabs inside each optional activity workbook (Ganesh, motor, etc.). */
export const ACTIVITY_TABS = {
  GUIDE: 'Guide',
  CONFIGURATION: 'Configuration',
  MEMBERS: 'Members',
  EXPENSES: 'Expenses',
  SUMMARY: 'Summary',
};

export const ACTIVITY_TAB_HEADERS = {
  [ACTIVITY_TABS.GUIDE]: ['Topic', 'What it means', 'How to use'],
  [ACTIVITY_TABS.CONFIGURATION]: ['Key', 'Value', 'Description'],
  [ACTIVITY_TABS.MEMBERS]: [
    'Flat', 'Name', 'Opted In (Y/N)', 'Amount Due (₹)', 'Amount Paid (₹)',
    'Payment Date (YYYY-MM-DD)', 'Payment Mode', 'Remarks',
  ],
  [ACTIVITY_TABS.EXPENSES]: [
    'Date (YYYY-MM-DD)', 'Description', 'Amount (₹)', 'Paid By', 'Payment Mode', 'Remarks',
  ],
  [ACTIVITY_TABS.SUMMARY]: ['Metric', 'Value', 'Notes'],
};

// ─── Maintenance Constraints ───────────────────────────────────
export const MAINTENANCE_MIN_DATE = '2020-11-01';

// ─── Expense Categories ─────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Watchman Salary',
  'Cleaning',
  'Generator Fuel',
  'Lift Service',
  'Repairs & Maintenance',
  'Garbage',
  'Common Electricity',
  'Internet',
  'Water Charges',
  'Water Tankers',
  'Pest Control',
  'Plumbing',
  'Electrical Repairs',
  'Sundry',
  'Festival / Events',
  'Legal / Administrative',
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
export function generateFiscalMonths(startMonth = '2026-08') {
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
  BOUND_EMAIL: 'tpt_bound_email',
  OAUTH_SCOPE_VERSION: 'tpt_oauth_scope_version',
  LOGIN_BACKUP_DONE: 'tpt_login_backup_done',
  LIVE_SPREADSHEET_ID: 'tpt_live_spreadsheet_id',
};
