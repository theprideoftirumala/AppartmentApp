/**
 * In-app help for treasurers and residents.
 */

import { BookOpen } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { DRIVE_ROOT_FOLDER, FIRST_APP_MONTH_LABEL, OPENING_SURPLUS, SHEET_FILE_NAME } from '../config/constants';
import { maskEmail, FOUNDING_OWNER_EMAIL } from '../config/accessPolicy';

const OWNER_EMAIL_MASKED = maskEmail(FOUNDING_OWNER_EMAIL);

const SECTIONS = [
  {
    heading: 'How this app works',
    text: `There is one Google Sheet: ${SHEET_FILE_NAME}, in Drive folder ${DRIVE_ROOT_FOLDER}.
The website has no server. Every number lives on that sheet.

Books start ${FIRST_APP_MONTH_LABEL}. Opening surplus is ₹${OPENING_SURPLUS}.
Available balance = opening surplus + all collected − all spent.
If that number is above 0 the society is in SURPLUS. Below 0 is DEFICIT.

Open the Balance tab in Google Sheets first. A layman can see surplus or deficit there without this app.`,
  },
  {
    heading: 'Monthly workflow',
    text: `1. Add the month on Maintenance if it is not there yet (Add next month).
2. Record payments (defaults to PAID; several flats at once).
3. Add expenses. Attach a receipt if you have one. Voice or camera fill only drafts the form — review before Save.
4. Open Reports. Download or share the PDF. It prints opening surplus, this month surplus/deficit, and available balance.
5. Share the PDF in the WhatsApp group.`,
  },
  {
    heading: 'Google Sheet tabs',
    text: `Balance — opening, collected, spent, available, SURPLUS/DEFICIT (formulas)
Configuration — OPENING_SURPLUS ${OPENING_SURPLUS}, monthly rate, treasurer/president flats
Flats — 10 flats 101–502
Maintenance — one row per flat per month. Column K is Still Due (formula)
Expenses — money out
Monthly Summary — each month collected, spent, surplus/deficit, running balance
Pending Dues — type a month in the yellow cell
Payees, Contacts, Reminders, Access Control, Audit Log, Watchman, Activity Funds, Water Tanker Log`,
  },
  {
    heading: 'Who can sign in',
    text: `Founding owner (${OWNER_EMAIL_MASKED}) creates or connects the sheet and grants Owner.
New users default to Reader (Drive Viewer). Max 20 users, max 2 owners.
Unlisted accounts see Access Denied. Readers cannot write through the app.`,
  },
  {
    heading: 'Backups and reconnect',
    text: `Settings → Backups copies ${SHEET_FILE_NAME} into ${DRIVE_ROOT_FOLDER}/backups.
A copy also runs on each Google sign-in (not Guest PIN).
If this browser forgets the sheet, the founding owner runs Setup. It finds ${SHEET_FILE_NAME} or creates it once.`,
  },
  {
    heading: 'Payees',
    text: `GPay and PhonePe pay number@ybl from a 10-digit phone. Optional UPI ID overrides the phone.
Same phone or same UPI is a duplicate. Do not invent a UPI ID.`,
  },
];

export default function Help() {
  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Help</h1>
          <p className="page-subtitle">How the cash book and this website work</p>
        </div>
      </div>
      {SECTIONS.map((section) => (
        <div className="card mb-4" key={section.heading}>
          <h3 className="card-title">
            <BookOpen size={18} /> {section.heading}
          </h3>
          <p className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>{section.text}</p>
        </div>
      ))}
    </div>
  );
}
