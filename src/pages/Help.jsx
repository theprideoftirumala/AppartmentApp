/**
 * Help Page — How to use the TPT Expense Tracker
 * Available to every signed-in member.
 */

import { useState } from 'react';
import {
    HelpCircle, BookOpen, Workflow, AlertCircle, ChevronDown, ChevronRight,
    FileBarChart, Bell, Phone, Shield
} from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { FOUNDING_OWNER_EMAIL, maskEmail } from '../config/accessPolicy';

/** Masked in Help copy so personal inboxes are not duplicated through the page source. */
const OWNER_EMAIL_MASKED = maskEmail(FOUNDING_OWNER_EMAIL);

const sections = [
    {
        id: 'overview',
        icon: BookOpen,
        title: 'How the App Works',
        content: [
            {
                heading: 'What is this app?',
                text: `The TPT Expense Tracker is a Progressive Web App (PWA) for The Pride of Tirumala apartment complex.
It tracks monthly maintenance collection, apartment expenses, emergency contacts, reminders, and generates PDF reports.
All data is stored in a Google Sheet in your Google Drive — the sheet is the single source of truth.`,
            },
            {
                heading: 'Where is the data stored?',
                text: `Your data lives in a Google Sheet named "The Pride of Tirumala-APP" in a Google Drive folder called "TPT-AppartmentApp".
Open it anytime from Settings > Open Sheet. Start with the Guide tab — it explains every column in plain language.
Use Pending Dues to see unpaid flats for any month, and Monthly Summary for surplus or deficit (those tabs use formulas, so they stay correct if you edit Maintenance by hand).
The Handover Summary tab holds Nov 2020–Aug 2026 totals from the old I&E Excel. Live tabs start Sep-26.
Setup connects The Pride of Tirumala-APP already in Drive, copies a backup first, then adds empty app tabs beside the five history tabs. It does not create a new society file.
Backups (copies of the sheet) are stored in the "backups" subfolder. A copy is also taken on each Google sign-in.`,
            },
            {
                heading: 'Who can access the app?',
                text: `Only ${OWNER_EMAIL_MASKED} is the founding Owner and may connect the society Google Sheet.
Everyone else must be added in Settings → Access Control. New users default to Reader (view-only) and are shared the existing The Pride of Tirumala-APP as Viewer — they must not upload a second sheet.
A second Owner can be granted only by the founding owner (max 2 owners). Unlisted Google accounts see Access Denied.`,
            },
        ],
    },
    {
        id: 'monthly',
        icon: Workflow,
        title: 'Monthly Workflow',
        content: [
            {
                heading: '1. Start of Month — Initialize',
                text: `Go to Maintenance and click "Initialize [Month]" to create payment records for all 10 flats (101–502).
This sets each flat's Amount Due to the configured monthly maintenance (₹3,000 by default).`,
            },
            {
                heading: '2. Record Payments as they come in',
                text: `Each time a flat owner pays, go to Maintenance → Record Payment.
Select the flat, enter the amount paid, payment date, and mode (UPI/Cash/Transfer).
The status changes to PAID / PARTIAL based on the amount.`,
            },
            {
                heading: '3. Log All Expenses',
                text: `Go to Expenses → Add expenses. You can save several bills in one go (same date/month).
Select the correct category (Watchman Salary, Electricity, Lift Maintenance, etc.).
Upload a bill/receipt photo if available — it gets stored in Google Drive and is attached to every line in that batch.`,
            },
            {
                heading: '4. Add expenses by voice or camera (optional)',
                text: `On Expenses → Add expenses, tap Fill with voice (Chrome or Safari) or Fill from camera.
Voice example: "watchman salary 12000 and electricity 2400".
Camera reads the bill on this phone only (Tesseract, no cloud). Review every line, then tap Save. Nothing is submitted until you confirm.`,
            },
            {
                heading: '4b. Optional activity funds',
                text: `Use Activity Funds for Ganesh festival, a new motor, or any named collection that not every flat joins.
An Owner starts the activity (the name is configurable). The app creates or reuses one Google Sheet for that activity and lists it so you can open it later.
Record who joined, what they paid, and expenses from that fund. Download a PDF from the activity view.`,
            },
            {
                heading: '5. End of Month — Generate Report',
                text: `Go to Reports, select the month, and click PDF to download.
Click "Share via WhatsApp" to send the PDF directly to the WhatsApp group.
Click "Sync Sheet" to add this month on Monthly Summary and refresh the live formulas (surplus/deficit, pending flats).
Open the Google Sheet → Pending Dues, type the month in the yellow cell, and you will see who still owes money.`,
            },
            {
                heading: '6. End of Month — Backup',
                text: `Go to Settings → Backups → Create Backup.
This creates a snapshot of the entire Google Sheet saved in the backups folder.
A backup reminder is auto-created and fires on the last day of every month.`,
            },
        ],
    },
    {
        id: 'scenarios',
        icon: AlertCircle,
        title: 'Common Scenarios',
        content: [
            {
                heading: 'A flat owner paid partial amount',
                text: `Record the partial payment with status = PARTIAL.
When they pay the remaining amount, edit the same record and update Amount Paid to the total, changing status to PAID.`,
            },
            {
                heading: 'A flat owner paid in advance for next month',
                text: `Initialize next month first (Maintenance → select next month → Initialize).
Then record the payment for that future month.`,
            },
            {
                heading: 'An expense was missed in a previous month',
                text: `Go to Expenses, click Add Expense, and select the correct Month from the dropdown.
The report for that month will reflect the updated expense.
Note: PDF reports already shared with the group should be re-shared after correction.`,
            },
            {
                heading: 'Adding a new authorized user',
                text: `Go to Settings → Access Control → Add User (founding owner).
Enter their Gmail. Role defaults to Reader (view-only). The app shares the existing society sheet as Viewer — a new spreadsheet is not created.
They must re-consent Google Drive scopes on first login after this change. Maximum 20 users, 2 owners.`,
            },
            {
                heading: 'Opening Balance / Handover Deficit',
                text: `The opening balance from August 2026 (handover) is set in Settings → Configuration → "Deficit from August 2026 (Handover)".
This field is read-only in the app. To update it: edit the DEFICIT_LAST_YEAR row in the Configuration sheet directly, or change DEFAULT_CONFIG.DEFICIT_LAST_YEAR in src/config/constants.js and redeploy.`,
            },
            {
                heading: 'Changing the monthly maintenance amount',
                text: `Go to Settings → Configuration → Monthly Maintenance (₹) and update the value.
This takes effect from the next time you initialize a new month.`,
            },
            {
                heading: 'Lost access / new device',
                text: `Sign in with Google. Residents are connected to the shared The Pride of Tirumala-APP (not a new file).
Only ${OWNER_EMAIL_MASKED} may connect the workbook. The app never creates a second society file. Others who are not on Access Control see Access Denied.
If the phone shows a Google API error, open Chrome or Safari (not WhatsApp/Instagram), allow pop-ups, then Settings → Appearance → Clear cache.
Each Google sign-in copies The Pride of Tirumala-APP into Drive/backups. Guest PIN sessions do not.`,
            },
        ],
    },
    {
        id: 'sheets',
        icon: FileBarChart,
        title: 'Google Sheets Guide',
        content: [
            {
                heading: 'Sheet tabs and their purpose',
                text: `Configuration — App settings (monthly amount, fiscal year, roles)\nFlats — Owner details for all 10 flats\nMaintenance — Monthly payment records\nExpenses — All expense transactions\nMonthly Summary — Aggregated monthly financials\nReminders — Scheduled maintenance tasks\nAccess Control — Authorized user list\nAudit Log — Full history of all changes\nWater Tanker Log — Water tanker order history\nWatchman Details — Security guard info`,
            },
            {
                heading: 'Remaining / Deficit in Google Sheet',
                text: `Look at the Monthly Summary sheet. The "Net Balance" column shows monthly surplus or deficit.
"Cumulative Balance" shows the running total across all months.
A negative value = deficit (we spent more than collected). A positive value = surplus.
The opening deficit from August 2026 is in the Configuration sheet (DEFICIT_LAST_YEAR row).`,
            },
            {
                heading: 'Read-only access for members',
                text: `Users with the Reader role can open the Google Sheet in view-only mode.
They cannot edit any cell. They can still download as Excel or PDF from within Google Sheets.`,
            },
        ],
    },
    {
        id: 'reminders',
        icon: Bell,
        title: 'Reminders',
        content: [
            {
                heading: 'Pre-configured reminders',
                text: `When the app is first set up, the following reminders are auto-created:\n• Take Monthly Data Backup (last day of month)\n• Export Expenses PDF — Month End (last day)\n• Share Expenses PDF — New Month (1st of month)\n• Lift Maintenance Check (monthly)\n• Generator Servicing (monthly)\n• CCTV Check (monthly)\n• Water Tank Cleaning (quarterly)\n• Pest Control (quarterly)\n• Fire Extinguisher Inspection (half-yearly)`,
            },
            {
                heading: 'Marking a reminder as done',
                text: `Click the "Mark Done" button on any reminder card. This records today as the last completed date.
The next due date is automatically scheduled based on the frequency (e.g., Monthly → 1 month later).`,
            },
        ],
    },
    {
        id: 'contacts',
        icon: Phone,
        title: 'Emergency Contacts',
        content: [
            {
                heading: 'Using emergency contacts',
                text: `On the Emergency Contacts page:\n• Green Phone button — calls the number directly\n• WhatsApp button — opens a WhatsApp chat with that contact\n• Share button — shares the contact card via WhatsApp or native share`,
            },
            {
                heading: 'Sharing all contacts',
                text: `Click "Share All" at the top of the Emergency Contacts page to send all contacts as a formatted WhatsApp message to the group.`,
            },
        ],
    },
    {
        id: 'sheets-guide',
        icon: FileBarChart,
        title: 'Google Sheets Deep Dive',
        content: [
            {
                heading: '1. Opening and Navigating the Sheet',
                text: `HOW TO OPEN:\n- In the app: Settings > Open Sheet (or the sidebar "Open Sheet" link)\n- Direct URL: once opened, bookmark it in your browser\n- Google Drive: drive.google.com > search "The Pride of Tirumala-APP"\n\nSHEET TABS (at the bottom of the screen):\nConfiguration | Flats | Maintenance | Expenses | Misc Funds | Emergency Contacts | Reminders | Access Control | Audit Log | Water Tanker Log | Monthly Summary | Watchman Details\n\nNAVIGATION TIPS:\n- Ctrl+End: jump to the last row with data\n- Ctrl+Home: jump to cell A1\n- Ctrl+F: search within the current sheet\n- Click any column header to sort by that column\n- Use the freeze row (row 1 is frozen) — scroll down and the header stays visible`,
            },
            {
                heading: '2. Configuration Tab — Full Key Reference',
                text: `STRUCTURE: Column A = Key name, Column B = Value, Column C = Description\nDo NOT edit Column A (key names). Only edit Column B values.\n\nKEY REFERENCE:\n\nAPARTMENT_NAME\n  Value example: "The Pride of Tirumala"\n  Used on: PDF reports, app header\n\nMONTHLY_MAINTENANCE\n  Value example: 3000\n  Used for: Amount Due when initializing a month. Change here to affect future months.\n\nCORPUS_FUND\n  Value example: 0 or 50000\n  Used for: One-time corpus. Added to the opening balance calculation.\n  Note: Read-only in the app. Edit directly here.\n\nDEFICIT_LAST_YEAR\n  Value example: 612 (positive = surplus handed over on 29 Aug 2026)\n  Used for: Opening cash for Sep-26. The old Excel running net was 1712.54; cash given was 612.\n  Important: This is the STARTING POINT for all balance calculations.\n  To update: click cell B4, type the new value, press Enter.\n\nFISCAL_YEAR_START\n  Value example: 2026-09\n  Used for: Determines which months appear in the app dropdown lists.\n\nTREASURER_FLAT\n  Value example: 401\n  Used for: Displayed on PDF report footers\n\nPRESIDENT_FLAT\n  Value example: 102\n  Used for: Displayed on PDF report footers\n\nLATE_FEE\n  Value: 100 (not enforced by app currently, kept for reference)\n\nLATE_FEE_AFTER_DAY\n  Value: 15 (day of month after which late fee applies — for reference)\n\nEMERGENCY_RESERVE\n  Value: 15000 (minimum balance to maintain — for reference)\n\nMAX_USERS / MAX_OWNERS\n  Values: 20 / 2 (enforced by the app's Access Control screen)`,
            },
            {
                heading: '3. Flats Tab — Flat Owner Details',
                text: `COLUMNS: Flat | Owner Name | Phone | Email | Member2 Name | Member2 Phone | Member2 Email | Role\n\nFLAT NUMBERS: 101, 102, 201, 202, 301, 302, 401, 402, 501, 502 (always 10 rows)\nDo NOT add or delete rows in this tab.\n\nROLE COLUMN: Always "Member" — Treasurer/President roles are set in Configuration.\n\nREADING DATA:\n- Flat 401 is the Treasurer's flat (by default)\n- Flat 102 is the President's flat (by default)\n- Phone numbers should be 10-digit Indian mobile numbers\n- Email field is used for future notifications (currently informational)\n\nHOW TO MANUALLY UPDATE:\n1. Find the row for the flat (e.g., row 3 = flat 101, row 4 = flat 102, etc.)\n2. Click the cell to edit (Owner Name, Phone, or Email)\n3. Type the new value and press Enter\n4. Refresh the app to see changes\n\nIMPORTANT: If you change a flat owner's email here, it does NOT automatically update the Access Control tab. Update Access Control separately.`,
            },
            {
                heading: '4. Maintenance Tab — Payment Records',
                text: `COLUMNS: Month | Flat | Amount Due | Amount Paid | Payment Date | Payment Mode | UPI Ref | Status | Late Fee | Remarks\n\nUNDERSTANDING THE DATA:\n- Each row represents ONE flat's payment for ONE month\n- For 10 flats, one month = 10 rows\n- Month format: "Sep-26", "Oct-26", etc. (must match exactly)\n- Amount Due: the maintenance amount (e.g., 3000)\n- Amount Paid: what was actually collected from this flat\n- Payment Date: format YYYY-MM-DD (e.g., 2026-09-05)\n- Payment Mode: UPI / Cash / Bank Transfer / Cheque / Online\n- Status: PAID / PENDING / PARTIAL / WAIVED\n\nHOW TO ANALYZE:\n- Filter Column A (Month) to see all payments for a specific month\n- Filter Column H (Status) = PENDING to find who hasn't paid\n- Sum Column D (Amount Paid) to get total collection for a month\n- Sum Column C (Amount Due) to get expected collection\n\nHOW TO MANUALLY ADD A PAYMENT:\n1. Find the row: filter Month + Flat\n2. Update cells: D (Amount Paid), E (Payment Date), F (Payment Mode), G (UPI Ref), H (Status)\n3. Do NOT change Column A (Month) or B (Flat)\n4. Press Enter after each cell\n5. Refresh the app — it will show the updated payment\n\nCOMMON STATUS VALUES:\n- PAID: Full amount collected\n- PENDING: Nothing collected yet\n- PARTIAL: Some amount collected (Amount Paid < Amount Due)\n- WAIVED: Flat owner exempted for this month`,
            },
            {
                heading: '5. Expenses Tab — All Expense Transactions',
                text: `COLUMNS: ID | Date | Month | Description | Category | Amount | Payment Mode | Bill/Receipt | Approved By | Receipt Drive Link | Remarks\n\nUNDERSTANDING THE DATA:\n- Each row = one expense paid from the maintenance fund\n- ID format: "EXP-1724123456789" (auto-generated timestamp)\n- Date: YYYY-MM-DD format\n- Month: "Sep-26" format (which month this expense belongs to)\n- Bill/Receipt: "Y" if a receipt was uploaded, "N" otherwise\n- Receipt Drive Link: Google Drive URL of the uploaded bill/receipt photo\n\nCATEGORY VALUES (as used in the app):\nWatchman Salary | Common Electricity | Generator Fuel | WiFi Bill | Water Bill (BWSSB) | Water Tankers | Lift Maintenance | Generator Maintenance | CCTV Maintenance | Plumbing | Electrical Repairs | Cleaning / Housekeeping | Pest Control | Painting / Civil Work | Festival / Events | Legal / Administrative | Insurance | Bank Charges | Miscellaneous\n\nHOW TO ANALYZE EXPENSES:\n- Sort Column B (Date) descending to see latest expenses first\n- Filter Column C (Month) to see expenses for a specific month\n- Filter Column E (Category) to see all expenses of one type\n- Sum Column F (Amount) after filtering to get category total\n- Filter Column H (Bill/Receipt) = "N" to find expenses without receipts\n\nHOW TO MANUALLY ADD AN EXPENSE (if app is not available):\n1. Go to the last row + 1 in the Expenses tab\n2. Add: ID (use EXP-{current timestamp}), Date (YYYY-MM-DD), Month (e.g., Sep-26), Description, Category, Amount (number only), Payment Mode, Bill/Receipt (Y or N), Approved By (your name)\n3. Leave Receipt Drive Link blank if no bill uploaded\n4. Refresh the app to confirm it appears\n\nNOTE: After manual entry, run "Sync Sheet" in Reports to update the Monthly Summary.`,
            },
            {
                heading: '6. Monthly Summary Tab — Financial Overview',
                text: `COLUMNS: Month | Collection (Rs.) | Misc Funds (Rs.) | Expenses (Rs.) | Net Balance (Rs.) | Cumulative (Rs.) | Collection % | Pending Flats | Status\n\nTHIS TAB IS CALCULATED BY THE APP — click "Sync Sheet" in Reports to update it.\n\nUNDERSTANDING EACH COLUMN:\n\nNet Balance = Collection + Misc Funds - Expenses\n  - Positive: surplus for the month (collected more than spent)\n  - Negative: deficit for the month (spent more than collected)\n\nCumulative = Sum of all Net Balances across all months + Opening Balance (DEFICIT_LAST_YEAR)\n  - This is the OVERALL financial health of the apartment fund\n  - Positive = the fund has money left\n  - Negative = the fund is in deficit\n\nCollection % = (Number of PAID flats / 10) * 100\n  - 100% = all 10 flats paid for the month\n  - 50% = 5 out of 10 flats paid\n\nPending Flats = List of flat numbers that have NOT paid (PENDING or PARTIAL status)\n\nHOW TO READ THE BIG PICTURE:\n1. Look at the Cumulative column (column F) in the LAST ROW — this is today's fund balance\n2. If Cumulative is negative, the fund owes money (needs to be recovered from future collections)\n3. If Cumulative is positive, the fund has a reserve\n4. Compare Net Balance month by month to see if expenses are growing\n\nHOW TO MANUALLY ANALYZE (without syncing):\n- Sum column B (Collection) for all months = total collection since Sep 2026\n- Sum column D (Expenses) for all months = total spending\n- The difference is the net fund balance (ignoring opening balance)`,
            },
            {
                heading: '7. Access Control Tab — User Management',
                text: `COLUMNS: Email | Role | Flat | Added By | Added Date | Status\n\n${OWNER_EMAIL_MASKED} is the founding Owner and cannot be removed.\nNew app users default to Reader. Prefer Settings → Access Control → Add User so Drive is shared as Viewer (not a new spreadsheet).\n\nUNDERSTANDING:\n- Email: Gmail of the authorized user\n- Role: Owner (can edit) or Reader (view only)\n- Status: Active = can log in, Inactive = blocked\n\nDo not list someone as Owner unless the founding owner granted it in the app.`,
            },
            {
                heading: '8. Audit Log Tab — Activity History',
                text: `COLUMNS: Timestamp | User | Action | Details\n\nThis tab is READ-ONLY — the app writes to it automatically. Never edit this tab.\n\nTIMESTAMP format: ISO 8601 (e.g., "2026-09-05T14:30:00.000Z")\nUSER: the Gmail address of the person who made the change\nACTION codes:\n- PAYMENT: maintenance payment recorded\n- ADD_EXPENSE: new expense added\n- DELETE_EXPENSE: expense deleted\n- INIT_MONTH: new month initialized\n- ADD_USER / REMOVE_USER: access control changes\n- UPDATE_CONFIG: configuration change\n- UPDATE_FLAT: flat details updated\n- BACKUP: backup created\n- SETUP: initial app setup\n\nHOW TO USE THE AUDIT LOG:\n- Filter Column B (User) to see all actions by one person\n- Filter Column C (Action) = "DELETE_EXPENSE" to see what was deleted\n- Filter by date range (sort Column A descending, then filter rows)\n- Use Ctrl+F to search for a specific flat number or description\n\nFINDING WHO CHANGED WHAT:\n1. Press Ctrl+F and search for the description or flat number\n2. Look at the Timestamp and User columns to see when and who\n3. The Details column shows specifics (e.g., "Flat 401 — Sep-26: Rs.3000")\n\nThis is useful for accountability — the audit log cannot be cleared from the app.`,
            },
            {
                heading: '9. Reminders Tab',
                text: `COLUMNS: ID | Title | Description | Frequency | Next Due | Last Completed | Assigned To | Status | Created By | Created Date\n\nFREQUENCY values: Daily / Weekly / Monthly / Quarterly / Half-Yearly / Yearly / One-Time\nSTATUS: Active (shows in app) or Inactive (hidden)\nNEXT DUE: YYYY-MM-DD format — the app updates this when you mark a reminder as Done\nLAST COMPLETED: YYYY-MM-DD — when you last marked this reminder Done\n\nHOW TO SEE OVERDUE REMINDERS IN THE SHEET:\n- Filter Column E (Next Due) where date is before today\n- Sort Column E ascending to see which are most overdue\n\nHOW TO ADD A REMINDER DIRECTLY IN THE SHEET:\n1. Scroll to next empty row\n2. Add: ID (REM-{timestamp}), Title, Description, Frequency (must be one of the values above), Next Due (YYYY-MM-DD), Status (Active), Created By, Created Date (today)\n3. The app will display it the next time you open the Reminders page\n\nBUILT-IN REMINDERS (auto-created during setup):\n- Take Monthly Data Backup — due last day of each month\n- Export Expenses PDF Month End — due last day of each month\n- Share Expenses PDF New Month — due 1st of each month\n- Lift Maintenance Check — monthly\n- Generator Servicing — monthly\n- CCTV Check — monthly\n- Water Tank Cleaning — quarterly\n- Pest Control — quarterly\n- Fire Extinguisher Inspection — half-yearly`,
            },
            {
                heading: '10. Data Validation & Format Rules',
                text: `When editing the Google Sheet DIRECTLY (bypassing the app), follow these rules strictly:\n\nDATE FIELDS (Payment Date, Date, Next Due, etc.):\n  Format: YYYY-MM-DD\n  Example: 2026-09-15  NOT "15-Sep-2026" or "15/09/2026"\n  Important: Must be on or after 2026-09-01\n\nMONTH LABELS (Month column in Maintenance, Expenses, etc.):\n  Format: MMM-YY\n  Example: Sep-26, Oct-26, Nov-26, Dec-26, Jan-27, Feb-27...\n  Important: Must match exactly — "Sep-26" NOT "September 2026" or "09-2026"\n\nAMOUNT FIELDS:\n  Format: Plain number, no currency symbol, no commas\n  Example: 3000  NOT "Rs.3000" or "3,000"\n\nSTATUS FIELDS (Maintenance):\n  Must be exactly: PAID / PENDING / PARTIAL / WAIVED (all uppercase)\n\nSTATUS FIELDS (Access Control):\n  Must be exactly: Active / Inactive (capital first letter)\n\nROLE FIELDS:\n  Must be exactly: Owner / Reader (capital first letter)\n\nBOOLEAN FIELDS (Bill/Receipt in Expenses):\n  Must be exactly: Y or N (uppercase single letter)\n\nID FIELDS:\n  Expenses: EXP-{timestamp} (e.g., EXP-1724123456789)\n  Reminders: REM-{timestamp}\n  Misc Funds: MISC-{timestamp}\n  Never reuse or duplicate IDs`,
            },
            {
                heading: '11. How Calculations Work (No Formulas)',
                text: `The Google Sheet has NO FORMULAS in the data area. All calculations are performed by the app JavaScript code.\n\nHOW BALANCE IS CALCULATED BY THE APP:\n  Current Balance = Sum(all Amount Paid across all months)\n                  + Sum(all Misc Funds across all months)\n                  - Sum(all Expenses across all months)\n                  + DEFICIT_LAST_YEAR (opening balance from Configuration)\n\nHOW MONTHLY SUMMARY IS CREATED:\n  When you click "Sync Sheet" in Reports, the app:\n  1. Reads all Maintenance rows for the month\n  2. Reads all Expenses rows for the month\n  3. Calculates Collection, Misc Funds total, Expenses total, Net Balance\n  4. Writes one row to the Monthly Summary tab\n\nIF NUMBERS LOOK WRONG:\n  1. Check DEFICIT_LAST_YEAR value in Configuration (should be the exact handover balance)\n  2. Verify all expenses have the correct Month label (e.g., Sep-26 not Oct-26)\n  3. Check if any row has Amount Paid > Amount Due (app allows this for advance payments)\n  4. Click "Sync Sheet" in Reports to recalculate Monthly Summary\n  5. Refresh the app (F5 or pull-to-refresh) to reload data from the sheet\n\nADDING YOUR OWN FORMULAS:\n  You CAN add formulas in EMPTY COLUMNS to the right of the data\n  Example: In Monthly Summary, add column J with =E2+F2 for a running total\n  DO NOT insert columns within the existing data range — it will break the app`,
            },
            {
                heading: '12. Filtering, Sorting & Analyzing Data',
                text: `QUICK ANALYSIS TECHNIQUES:\n\nSee all pending payments this month:\n  Maintenance tab > Filter Column A = "Sep-26" > Filter Column H = "PENDING"\n\nSee total collection for a month:\n  Maintenance tab > Filter Column A = "Sep-26" > Click column D header > see SUM in bottom bar\n\nSee all expenses by category:\n  Expenses tab > Filter Column E (Category) = "Watchman Salary"\n  Then check the SUM in the status bar for total\n\nFind which flat pays late:\n  Maintenance tab > Filter Status = PAID > Sort Column E (Payment Date) descending\n  Flats that paid after the 15th pay late\n\nSee year-to-date expenses:\n  Expenses tab > do NOT filter > click Column F header > status bar shows TOTAL\n\nCompare months side by side:\n  Monthly Summary tab shows all months — scroll right to see all columns\n  Add a chart: select columns A-E, then Insert > Chart > Column chart\n\nEXPORT TO EXCEL:\n  File > Download > Microsoft Excel (.xlsx)\n  This downloads the ENTIRE workbook including all tabs\n\nEXPORT SINGLE TAB AS CSV:\n  File > Download > Comma Separated Values (.csv)\n  This exports only the currently visible tab\n\nSHARE A READ-ONLY LINK:\n  Share button (top right) > Change access to "Anyone with the link" (Viewer)\n  This lets anyone view without editing — useful for sharing with residents`,
            },
            {
                heading: '13. Backup, Recovery & Version History',
                text: `APP BACKUP (Recommended):\n  Settings > Backups > Create Backup\n  This makes a COPY of the entire sheet saved in the "backups" subfolder in Google Drive\n  Backups are named: The Pride of Tirumala-APP_YYYYMMDD_HHMMSS\n  To restore: open the backup file, copy data back to the main sheet manually\n\nGOOGLE SHEETS VERSION HISTORY (Built-in):\n  File > Version history > See version history\n  Google automatically saves versions — you can restore to any past version\n  Click "Restore this version" to roll back to a previous state\n  This is your SAFETY NET if you accidentally delete data\n\nHOW TO RECOVER DELETED DATA:\n  1. Open Version History (File > Version history)\n  2. Browse to a version before the deletion\n  3. Find the deleted row(s)\n  4. Copy the data from the old version\n  5. Restore to current version\n  6. Paste the copied data back into the sheet\n\nIF THE APP LOSES THE SHEET:\n  The spreadsheet ID is stored in your browser's localStorage\n  If you clear browser data, run the app Setup again — it will search Google Drive and reconnect\n  No data is lost — the sheet is always in your Google Drive`,
            },
        ],
    },
    {
        id: 'access-guide',
        icon: Shield,
        title: 'Access & Login Guide',
        content: [
            {
                heading: '"Access blocked: App has not completed verification" — Fix',
                text: `This Google error means the app is in Testing mode and your Google account is not added as a Test User.\n\nFix steps (Owner must do this):\n1. Go to console.cloud.google.com\n2. Select the project (search for "Apartment Maintenance App" or find it in your project list)\n3. Go to APIs & Services > OAuth consent screen\n4. Scroll down to "Test users"\n5. Click "+ Add Users"\n6. Enter the Gmail address of the founding owner (see Settings → Access Control)\n7. Click Save\n8. The user can now sign in immediately — no other changes needed\n\nAlternatively, to allow any Google account (not just test users): go to OAuth consent screen > Publishing status > click "Publish App". This removes the test user restriction permanently.`,
            },
            {
                heading: '"Google Drive API has not been used in project" — Fix',
                text: `This error appears during Setup > Connect or Create when Google Drive API is disabled for your Google Cloud project.\n\nFix steps:\n1. Open Google Cloud Console and select the SAME project used by your OAuth Client ID\n2. Enable Google Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com\n3. Enable Google Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com\n4. Wait 5-10 minutes for propagation\n5. Return to app Setup page and click Try Again\n\nIf it still fails, confirm the signed-in account has access to the target spreadsheet/folder in Google Drive.`,
            },
            {
                heading: 'How to add a new user (Google login)',
                text: `1. Sign in as the founding owner (${OWNER_EMAIL_MASKED})\n2. Go to Settings > Access Control\n3. Click Add User\n4. Enter their Gmail (role defaults to Reader / view-only)\n5. Optionally grant Owner (founding owner only, max 2 owners)\n6. The app shares the existing society sheet as Viewer or Writer to match the role\n7. If OAuth is in Testing mode, also add them as a Test User in Google Cloud Console\n8. They sign in — they must not upload another The Pride of Tirumala-APP`,
            },
            {
                heading: 'Guest PIN access (no Google account)',
                text: `For residents who don't have Gmail or don't want to sign in with Google:\n1. Owner logs in to the app and goes to Settings > Configuration\n2. Scroll down to "Guest Access PIN"\n3. Set a PIN (min 4 characters) and click Enable\n4. Share the PIN with residents via WhatsApp\n5. Residents open the app → click "Continue with Guest PIN" → enter the PIN\n6. They get read-only access for 24 hours\n7. The PIN hash is stored locally — the Owner must set it on EACH device where guests need access\n8. To disable: go back to Settings > Configuration > Guest Access PIN > click Disable`,
            },
            {
                heading: 'Reader vs Owner access',
                text: `Founding Owner (${OWNER_EMAIL_MASKED} only, unless they grant Owner):\n• Connects the one society spreadsheet (The Pride of Tirumala-APP)\n• Adds users (default Reader) and shares Drive as Viewer\n• Full write access\n\nReader (default for added residents):\n• View Dashboard, Maintenance, Expenses, Reports, Reminders, Contacts\n• Cannot add expenses, record payments, change settings, or add users\n• Google Sheet permission is Viewer\n\nMaximum 2 Owners. The founding owner cannot be removed.`,
            },
        ],
    },
    {
        id: 'faq',
        icon: HelpCircle,
        title: 'FAQ',
        content: [
            {
                heading: 'Why is the Rupee symbol (₹) missing in the PDF?',
                text: `The PDF uses the Helvetica font which does not include the ₹ character (Unicode U+20B9). The PDF uses "Rs." instead, which is equally readable. The ₹ symbol appears correctly in the app UI — only the downloaded PDF shows "Rs.".`,
            },
            {
                heading: 'What happens if I clear browser history/cache?',
                text: `The app stores the Google Sheet ID in localStorage. If you clear storage you will be logged out.\nFounding owner: Setup reconnects the owned The Pride of Tirumala-APP and will not create a second file if one exists.\nResidents: you need to be on Access Control and have the sheet shared as Viewer — you cannot create a society sheet.\nGuest PIN is device-local and must be set again.`,
            },
            {
                heading: 'Can multiple users edit data at the same time?',
                text: `Yes, but with caution. Multiple Owners can be logged in simultaneously. However, if two people edit the same row (same flat, same month), one might overwrite the other. Google Sheets handles concurrent edits, but the app does not have conflict resolution. Best practice: only one Owner records payments at a time.`,
            },
            {
                heading: 'The balance looks wrong — how is it calculated?',
                text: `Current Balance = Total Collection (all months) - Total Expenses (all months) + Opening Balance (DEFICIT_LAST_YEAR)\n\nIf the balance seems off:\n1. Check the DEFICIT_LAST_YEAR value in the Configuration sheet (should be the actual handover balance from Aug 2026)\n2. Check if all expenses have been logged with the correct Month\n3. Click "Sync Sheet" in Reports to refresh the Monthly Summary\n4. Open the Google Sheet directly to verify the raw data`,
            },
            {
                heading: 'How do I change the monthly maintenance amount?',
                text: `Go to Settings > Configuration > Monthly Maintenance. Click the field, change the value, and click Save.\n\nThis only affects NEW months you initialize. Already-initialized months will keep their original Amount Due. To update an already-initialized month, edit the Amount Due directly in the Google Sheet's Maintenance tab.`,
            },
            {
                heading: 'Can I export data to Excel?',
                text: `Yes — open the Google Sheet (Settings > Open Sheet) and go to File > Download > Microsoft Excel (.xlsx). This downloads the entire sheet as an Excel file.\n\nYou can also download individual sheets as CSV from the same menu.`,
            },
            {
                heading: 'The app shows "Not set up" after I already used it on another device',
                text: `Each browser stores the spreadsheet ID locally.\nFounding owner: sign in and Setup will reconnect the owned The Pride of Tirumala-APP (it will not create a second file if one exists).\nResidents: you must already be added in Access Control and have the sheet shared as Viewer. You will not see a create-sheet wizard.`,
            },
            {
                heading: 'How to update the Opening Balance / Handover Deficit?',
                text: `The opening balance (DEFICIT_LAST_YEAR) is set during initial setup from src/config/constants.js. To change it after setup:\n1. Open the Google Sheet\n2. Go to the Configuration tab\n3. Find the row with Key = "DEFICIT_LAST_YEAR"\n4. Update the Value column (negative = deficit, positive = surplus)\n5. The app will read the new value on next refresh\n\nFor developer access: update DEFAULT_CONFIG.DEFICIT_LAST_YEAR in src/config/constants.js and redeploy.`,
            },
        ],
    },
];

export default function Help() {
    const [openSection, setOpenSection] = useState('overview');
    const [openItems, setOpenItems] = useState({});

    const toggleItem = (sectionId, itemIdx) => {
        const key = `${sectionId}-${itemIdx}`;
        setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="main-content">
            <Navbar />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Help & Guide</h1>
                    <p className="page-subtitle">How to use the TPT Apartment Expense Tracker</p>
                </div>
                <div className="flex gap-2">
                    <span className="badge badge-warning" style={{ alignSelf: 'center' }}>
                        <Shield size={12} /> Owners Only
                    </span>
                </div>
            </div>

            <div className="help-layout">
                {/* Sidebar nav */}
                <div className="help-nav">
                    {sections.map(s => (
                        <button
                            key={s.id}
                            className={`help-nav-item ${openSection === s.id ? 'help-nav-item-active' : ''}`}
                            onClick={() => setOpenSection(s.id)}
                        >
                            <s.icon size={16} />
                            <span>{s.title}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="help-content">
                    {sections.filter(s => s.id === openSection).map(section => (
                        <div key={section.id} className="animate-fade-in">
                            <div className="help-section-header">
                                <section.icon size={22} />
                                <h2>{section.title}</h2>
                            </div>

                            <div className="help-accordion">
                                {section.content.map((item, idx) => {
                                    const key = `${section.id}-${idx}`;
                                    const isOpen = openItems[key] !== false; // open by default
                                    return (
                                        <div key={idx} className={`help-item ${isOpen ? 'help-item-open' : ''}`}>
                                            <button
                                                className="help-item-header"
                                                onClick={() => toggleItem(section.id, idx)}
                                            >
                                                <span className="help-item-title">{item.heading}</span>
                                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </button>
                                            {isOpen && (
                                                <div className="help-item-body">
                                                    {item.text.split('\n').map((line, i) => (
                                                        line ? <p key={i}>{line}</p> : <br key={i} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
