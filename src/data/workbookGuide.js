/**
 * Guide tab copy. Written into the Google Sheet so a treasurer can use
 * the workbook without opening the website.
 */

import { DRIVE_ROOT_FOLDER, FIRST_APP_MONTH_LABEL, OPENING_SURPLUS, SHEET_FILE_NAME } from '../config/constants';

export function guideRows() {
  return [
    ['START HERE', `This Google Sheet (${SHEET_FILE_NAME}) IS the apartment cash book from ${FIRST_APP_MONTH_LABEL}. The website only reads and writes these tabs.`, 'Keep the header row. Do not rename tabs. Add new rows at the bottom. Type amounts as plain numbers (3000, not ₹3,000).'],
    ['Opening surplus', `₹${OPENING_SURPLUS} was already in hand on 1 Sep 2026. It is stored as OPENING_SURPLUS on the Configuration tab and shown on the Balance tab.`, 'Do not add old Nov 2020–Aug 2026 history here. Those books are closed.'],
    ['How to know surplus or deficit', 'Open the Balance tab first. Available balance = opening surplus + all collected − all spent. If that number is above 0 the society is in SURPLUS. Below 0 is DEFICIT. Zero is BALANCED.', 'Monthly Summary shows the same math for each month. Green SURPLUS / red DEFICIT is a formula — do not type over it.'],
    ['Who paid this month?', 'Open Pending Dues. Type the month in the yellow cell (example Sep-26). You will see each flat, still due, and who to remind.', 'To record a payment, edit Maintenance (or use the app). Do not type in the grey Pending Dues table.'],
    ['Tab: Balance', 'The first tab a resident should open. Opening surplus, total collected, total spent, available balance, and SURPLUS/DEFICIT.', 'All amount cells are formulas. If a number looks wrong, fix Maintenance or Expenses — not this tab.'],
    ['Tab: Configuration', 'Key / Value / Description. The app reads Key and Value.', 'Change MONTHLY_MAINTENANCE here (plain number). OPENING_SURPLUS is 612. Do not invent a second opening number.'],
    ['Tab: Flats', 'One row per flat (101–502). Owner name, phone, email, committee role.', 'Treasurer and President flats must also be set in Configuration.'],
    ['Tab: Maintenance', 'One row per flat per month. Status must be exactly PAID, PENDING, PARTIAL, or WAIVED.', 'Month: MMM-YY (Sep-26). Date: YYYY-MM-DD. Column K (Still Due) is a formula. Do not type in K.'],
    ['Tab: Expenses', 'Money spent from the maintenance fund.', 'Category should match a known category. Bill Attached is Y or N. Receipt link must be a Google Drive URL.'],
    ['Tab: Monthly Summary', 'One row per month. Collected, spent, this month surplus/deficit, running balance, status.', 'Columns B–H are formulas. Type only the month in column A if you add a row by hand.'],
    ['Tab: Pending Dues', 'Change the yellow month cell and see who still owes.', 'If a number looks wrong, fix the matching Maintenance row.'],
    ['Tab: Payees', 'Watchman and vendor phones. GPay and PhonePe pay number@ybl unless a UPI ID is pasted.', 'Do not invent a UPI ID. Same phone or same UPI is a duplicate.'],
    ['Tab: Emergency Contacts', 'Plumber, lift, hospital, police, etc.', 'Phone is 10-digit Indian mobile where possible.'],
    ['Tab: Reminders', 'Recurring society tasks. Status Active = shown in the app.', 'Dates use YYYY-MM-DD.'],
    ['Tab: Access Control', 'Who may open the website. Email + Role + Status.', 'Role is Owner or Reader. Max 20 users, max 2 Owners.'],
    ['Tab: Audit Log', 'Automatic history of app writes. Do not edit rows.', 'Filter by User or Action if something looks wrong.'],
    ['Tab: Watchman Details', 'Staff record. Status Active or Inactive.', 'Do not share ID numbers widely.'],
    ['Tab: Activity Funds', 'Registry of optional named collections (Ganesh, motor). Each activity has its own Google Sheet under activity-funds/.', 'Start an activity from the website so the file is reused if the same name is started again.'],
    ['Tab: Water Tanker Log', 'Each tanker delivery. Also add a matching Expenses row if paid from the fund.', 'Litres and Cost are plain numbers.'],
    ['How to add a payment by hand', 'Find or add the Maintenance row for that month + flat. Fill Amount Paid, Date, Mode, Status = PAID.', 'Still Due and Pending Dues update by themselves.'],
    ['How to add an expense by hand', 'Add a row at the bottom of Expenses. Fill Date, Month, Description, Category, Amount.', 'Monthly Summary and Balance update via formula.'],
    ['Manual edit rules', 'Dates: YYYY-MM-DD. Months: Sep-26. Amounts: 3000. Statuses: exact capitals.', 'Never type over formula cells (Balance amounts, Maintenance K, Monthly Summary B–H, Pending Dues grey table). Never start a typed cell with = + - or @ unless you intend a formula.'],
    ['If the website stops', `This sheet still works. File → Version history can undo mistakes. Backups live in Drive / ${DRIVE_ROOT_FOLDER} / backups.`, `Search Drive for ${SHEET_FILE_NAME}. The app reconnects that one file. It does not mint a second tracker.`],
  ];
}
