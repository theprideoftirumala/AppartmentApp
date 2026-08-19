/**
 * Help Page — How to use the TPT Expense Tracker
 * Visible to Owners only
 */

import { useState } from 'react';
import {
    HelpCircle, BookOpen, Workflow, AlertCircle, ChevronDown, ChevronRight,
    Building2, Receipt, FileBarChart, Bell, Phone, Settings, IndianRupee,
    Shield, Download, MessageCircle, Users
} from 'lucide-react';
import Navbar from '../components/common/Navbar';

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
                text: `Your data lives in a Google Sheet named "TPT-MaintenanceTracker" in a Google Drive folder called "TPT-AppartmentApp".
Open it anytime from Settings > Open Sheet. The sheet is human-readable even without this app.
Backups (copies of the sheet) are stored in the "backups" subfolder.`,
            },
            {
                heading: 'Who can access the app?',
                text: `Only email addresses listed in the Access Control sheet can log in.
Owners can add/remove users, edit data, and generate reports.
Readers can view data and download reports but cannot modify anything.
Outsiders get an "Access Denied" message even if they sign in with Google.`,
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
                text: `Go to Expenses → Add Expense for every payment made from the fund.
Select the correct category (Watchman Salary, Electricity, Lift Maintenance, etc.).
Upload a bill/receipt photo if available — it gets stored in Google Drive.`,
            },
            {
                heading: '4. Record Misc Funds',
                text: `If a flat owner contributes an extra amount (beyond regular maintenance), go to Maintenance → Misc Fund.
This records the contribution separately and includes it in the monthly balance.`,
            },
            {
                heading: '5. End of Month — Generate Report',
                text: `Go to Reports, select the month, and click PDF to download.
Click "Share via WhatsApp" to send the PDF directly to the WhatsApp group.
Click "Sync Sheet" to update the Monthly Summary tab in Google Sheets.`,
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
                text: `Go to Settings → Access Control → Add User.
Enter their Gmail address and select their role (Owner or Reader).
They will be able to log in immediately. Maximum 20 users, 2 owners allowed.`,
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
                text: `Sign in with your Google account. If the app shows "Setup needed", click "Connect or Create".
The app searches for your existing TPT-MaintenanceTracker in Google Drive and reconnects — no data is lost.`,
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
                text: `Configuration — App settings (monthly amount, fiscal year, roles)\nFlats — Owner details for all 10 flats\nMaintenance — Monthly payment records\nExpenses — All expense transactions\nMisc Funds — Extra contributions from flat owners\nMonthly Summary — Aggregated monthly financials\nReminders — Scheduled maintenance tasks\nAccess Control — Authorized user list\nAudit Log — Full history of all changes\nWater Tanker Log — Water tanker order history\nWatchman Details — Security guard info`,
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
        title: 'Google Sheets Guide',
        content: [
            {
                heading: 'How to open the Google Sheet',
                text: `Go to Settings > Open Sheet, or click "Open Sheet" in the sidebar. The sheet opens in Google Sheets in your browser. You can also go to drive.google.com and search for "TPT-MaintenanceTracker".`,
            },
            {
                heading: 'Reading the Monthly Summary tab',
                text: `The Monthly Summary sheet has 9 columns:\n• Month — e.g. "Sep-26"\n• Collection (Rs.) — total maintenance collected\n• Misc Funds (Rs.) — any extra contributions\n• Expenses (Rs.) — total expenses paid\n• Net Balance (Rs.) — Collection + Misc - Expenses. Positive = surplus, negative = deficit.\n• Cumulative (Rs.) — running total across all months\n• Collection % — percentage of flats that paid\n• Pending Flats — flats that haven't paid yet\n• Status — SURPLUS or DEFICIT\n\nThis sheet is updated when you click "Sync Sheet" in the Reports page.`,
            },
            {
                heading: 'Reading the Configuration tab',
                text: `Key rows to know:\n• APARTMENT_NAME — displayed on reports\n• MONTHLY_MAINTENANCE — amount per flat per month\n• DEFICIT_LAST_YEAR — opening balance/deficit as of 31 Aug 2026 (handover)\n• CORPUS_FUND — one-time corpus collected\n• FISCAL_YEAR_START — "2026-09" means Sep 2026 is the first month\n• TREASURER_FLAT / PRESIDENT_FLAT — flat numbers of key office bearers\n\nTo update DEFICIT_LAST_YEAR or CORPUS_FUND: click the cell in column B and type the new value. Press Enter to save.`,
            },
            {
                heading: 'Reading the Maintenance tab',
                text: `Each row = one flat's payment for one month.\nColumns: Month | Flat | Amount Due | Amount Paid | Payment Date | Payment Mode | UPI Ref | Status | Late Fee | Remarks\n\nStatus values: PAID, PENDING, PARTIAL, WAIVED\n\nTo manually update a payment directly in the sheet: find the row by Month + Flat and update Amount Paid, Payment Date, Payment Mode, and Status.`,
            },
            {
                heading: 'Reading the Expenses tab',
                text: `Each row = one expense transaction.\nColumns: ID | Date | Month | Description | Category | Amount | Payment Mode | Bill/Receipt | Approved By | Receipt Drive Link | Remarks\n\nTo add an expense directly in the sheet: scroll to the last row and add a new row with all columns filled. The ID should follow the format EXP-{timestamp}.`,
            },
            {
                heading: 'Reading the Access Control tab',
                text: `Lists all authorized users.\nColumns: Email | Role | Flat | Added By | Added Date | Status\n\nStatus = "Active" means the person can log in. To temporarily block someone, change Status to "Inactive" directly in the sheet (or remove them from the app Settings > Access Control).`,
            },
            {
                heading: 'Manually updating values in the sheet',
                text: `General rules for manual edits:\n1. Never edit column A (IDs, primary keys) — the app uses these to find rows\n2. Use the same date format: YYYY-MM-DD (e.g., 2026-09-15)\n3. Month labels must match exactly: "Sep-26", "Oct-26", etc.\n4. Amount fields should be plain numbers (no Rs. prefix, no commas)\n5. After manual edits, refresh the app to see changes\n6. Create a backup (Settings > Backups) before making bulk edits`,
            },
            {
                heading: 'Formulas and calculations',
                text: `The Google Sheet itself does NOT contain formulas — all calculations are done by the app code when you sync or load data. The Monthly Summary is calculated fresh each time you click "Sync Sheet" in Reports.\n\nIf you want to add your own formulas (e.g., running totals), add them in unused columns to the right of the data area — do not insert columns within the data range.`,
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
                text: `This Google error means the app is in Testing mode and your Google account is not added as a Test User.\n\nFix steps (Owner must do this):\n1. Go to console.cloud.google.com\n2. Select the project (search for "Apartment Maintenance App" or find it in your project list)\n3. Go to APIs & Services > OAuth consent screen\n4. Scroll down to "Test users"\n5. Click "+ Add Users"\n6. Enter the Gmail address (e.g., theprideoftirumala@gmail.com)\n7. Click Save\n8. The user can now sign in immediately — no other changes needed\n\nAlternatively, to allow any Google account (not just test users): go to OAuth consent screen > Publishing status > click "Publish App". This removes the test user restriction permanently.`,
            },
            {
                heading: 'How to add a new user (Google login)',
                text: `1. Owner logs in to the app\n2. Go to Settings > Access Control\n3. Click "Add User"\n4. Enter their Gmail address\n5. Select role: Reader (view only) or Owner (full access)\n6. Click Add\n7. The user must ALSO be added as a Test User in Google Cloud Console (see above) unless the app is published\n8. The user can now sign in at the login page`,
            },
            {
                heading: 'Guest PIN access (no Google account)',
                text: `For residents who don't have Gmail or don't want to sign in with Google:\n1. Owner logs in to the app and goes to Settings > Configuration\n2. Scroll down to "Guest Access PIN"\n3. Set a PIN (min 4 characters) and click Enable\n4. Share the PIN with residents via WhatsApp\n5. Residents open the app → click "Continue with Guest PIN" → enter the PIN\n6. They get read-only access for 24 hours\n7. The PIN hash is stored locally — the Owner must set it on EACH device where guests need access\n8. To disable: go back to Settings > Configuration > Guest Access PIN > click Disable`,
            },
            {
                heading: 'Reader vs Owner access',
                text: `Reader (e.g., flat owner viewing reports):\n• Can view Dashboard, Maintenance, Expenses, Reports, Reminders, Contacts\n• Cannot add/edit expenses, record payments, or change settings\n• Cannot add/remove users\n\nOwner (Treasurer/President):\n• Full access to all features\n• Can add/remove users\n• Can edit configuration\n• Can create backups\n• Can see the Help section\n• Maximum 2 Owners allowed`,
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
                text: `The app stores the Google Sheet ID and login session in localStorage. If you clear storage:\n• You will be logged out\n• The "Setup" wizard will appear again\n• The app will search your Google Drive for the existing "TPT-MaintenanceTracker" sheet and reconnect automatically — no data is lost\n\nIf you set a Guest PIN, it will be cleared and the Owner must re-set it.`,
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
                text: `Each browser/device stores the setup state independently. On the new device:\n1. Log in with Google\n2. You will see the Setup page — click "Connect or Create"\n3. The app will find your existing Google Sheet and reconnect\n4. No data is lost`,
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
