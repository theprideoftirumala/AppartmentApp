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
                text: `On the Emergency Contacts page:\n• 📞 Green Phone button — calls the number directly\n• 💬 WhatsApp button — opens a WhatsApp chat with that contact\n• Share button — shares the contact card via WhatsApp or native share`,
            },
            {
                heading: 'Sharing all contacts',
                text: `Click "Share All" at the top of the Emergency Contacts page to send all contacts as a formatted WhatsApp message to the group.`,
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
