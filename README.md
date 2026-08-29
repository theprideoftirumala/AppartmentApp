# The Pride of Tirumala — Apartment Expense Tracker

A **Progressive Web App (PWA)** for managing apartment maintenance finances, built with React and powered by Google Sheets as the database.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Desktop-green)
![Status](https://img.shields.io/badge/status-active-brightgreen)

## ✨ Features

- **📊 Financial Dashboard** — Real-time balance, collection status, expense breakdown
- **🏠 Maintenance Tracking** — Mark payments for 10 flats; live months start at Aug-26 and are added one at a time
- **💰 Expense Management** — Log expenses with categories, receipt uploads, voice or on-device camera fill (review before save)
- **🎉 Activity Funds** — Optional named collections (festival, motor) each with their own reusable Google Sheet and PDF
- **📄 PDF Reports** — Generate and download monthly financial reports
- **🔔 Reminders** — Recurring reminders for lift maintenance, water tankers, AMC renewals
- **📞 Emergency Contacts** — Click-to-call contact directory with categories
- **👥 Access Control** — Email whitelist with Owner/Reader roles (max 20 users, 2 owners)
- **💾 Backups** — Drive copy of APP (and LIVE if connected) before Setup, before creating live books, on each Google sign-in, and from Settings → Create Backup
- **📒 Old books** — `#/old` shows the APP Summary tab (including surplus/deficit as stored) plus handover totals
- **📱 PWA** — Installable on iOS, Android, and desktop
- **🔐 Secure** — Google OAuth 2.0, audit logging, role-based access; only the founding owner may create LIVE
- **💸 Payees** — GPay / PhonePe from a 10-digit phone (optional UPI ID)

## What's new in 1.9.4

- Live Summary formulas are rewritten when they still look up the month from a header cell (`C$5`). Sep-26 now sums Sep-26, not August. A version stamp `tpt-live-v2` on the tab makes this repair run once, then only when formulas go stale again.
- Maintenance column K (Still Due) and Monthly Summary B–I are rewritten in the same pass so Sep-26 pending flats show due − paid, and Reports Year-to-Date sums Maintenance/Expenses.
- Open Dashboard or Settings → Refresh sheet layout once, then hard-refresh. Sidebar must show **v1.9.4** (cache `tpt-v37`).

## What's new in 1.9.3

- Dashboard Collection, Expenses, and Available balance follow **Maintenance / Expenses** when Live Summary formulas still show 0. A yellow banner still lists the formula mismatch. Do not type amounts on Live Summary.
- Live Summary `SUMIFS` match the month as text (`Aug-26`), so Sheets cannot turn the header into a date and hide collections.
- Add next month fills the first gap after Aug-26 (it does not skip Sep-26 if that month is missing). Maintenance lists the months that are already on the sheet.
- “Google Sheets API is not enabled” is only shown for the real not-enabled error, not every `sheets.googleapis.com` URL. PWA cache `tpt-v36`.

## What's new in 1.9.2

- Live books start **August 2026**. Live Summary has Aug-26 only; Maintenance → Add next month appends Sep-26, then Oct-26, and so on. Unused placeholder columns on an existing LIVE file are dropped. Opening balance is still the APP Summary green cell — do not re-enter August if it is already in that cell.
- Payees pay with a **phone number**. UPI ID is optional. Same phone or same UPI is a duplicate.
- Month dropdowns list working months only (not a long fiscal list).

## 🏗️ Architecture

```
React PWA (Static Site) ←→ Google Sheets API (Database)
                         ←→ Google Drive API (File Storage)
```

**No backend server** — everything runs in the browser. Google Sheets is the single source of truth.

See `docs/architecture.png` and `Explanation.md` for voice fill (Web Speech API) and receipt OCR (Tesseract.js on-device, no paid AI).

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/theprideoftirumala/AppartmentApp.git
cd AppartmentApp

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📱 Supported Platforms

| Platform | Status |
|----------|--------|
| Chrome (Desktop) | ✅ Full support + PWA install |
| Safari (iOS) | ✅ Full support + Add to Home Screen |
| Chrome (Android) | ✅ Full support + PWA install |
| Firefox | ✅ Full support |
| Edge | ✅ Full support |

## 🔧 Configuration

All settings are configurable from the app's Settings page or directly from the Google Sheet:

| Setting | Default | Description |
|---------|---------|-------------|
| Monthly Maintenance | ₹3,000 | Amount per flat per month |
| Corpus Fund | ₹0 | Corpus fund balance |
| Available balance | (from Summary) | Green Available balance cell on the Summary tab |
| Treasurer Flat | 401 | Current treasurer |
| President Flat | 102 | Current president |

## 📊 Google Sheet Structure

There are two society files. The app never creates `TPT-MaintenanceTracker`.

**The Pride of Tirumala-APP** (history, Nov 2020–Aug 2026) — Setup connects this file; it never creates a second APP. Convert the `.xlsx` once: Open with Google Sheets → Save as Google Sheets. Keep the name **The Pride of Tirumala-APP**. History tabs (Summary, Exp - Detailed, Borewell Exp, Motor repair oct, Notes) are never overwritten. Open the old Summary at `#/old`.

**The Pride of Tirumala-LIVE** (from Aug 2026) — founding owner: Settings → Backups → Create live books. Copies Flats, Payees, Access Control, and related tabs from APP. Opening balance is the green Summary cell at create (already includes August as of that cell). **Live Summary** starts with Aug-26 only; add the next month from Maintenance. Formulas pull collections from Maintenance and expenses from Expenses. Type amounts on those tabs — not on Live Summary. Payees use a 10-digit phone for GPay/PhonePe; UPI ID is optional. Same phone or same UPI is blocked.

Add a row on Maintenance or Expenses (app or Google Sheet) and refresh the Dashboard — the sheet is what the website shows. After LIVE exists, edit **The Pride of Tirumala-LIVE**. A correction banner appears if Live Summary formulas disagree with those tabs.

1. **Guide** — How to read and edit the workbook
2. **Configuration** — App settings (key / value / description)
3. **Flats** — Owner details for all 10 flats (names copied from Summary on first connect)
4. **Maintenance** — Per-flat collections copied from the existing Summary grid
5. **Pending Dues** — Type a month in the yellow cell
6. **Expenses** — Expense entries from Nov 2020 (history copied from Exp - Detailed)
7. **Payees** — Vendor phones (GPay / PhonePe); optional UPI ID
8. **Emergency Contacts** — Contact directory
9. **Reminders** — Recurring task reminders
10. **Access Control** — User email whitelist
11. **Audit Log** — All write operations
12. **Water Tanker Log** — Tanker delivery tracking
13. **Monthly Summary** — Collection totals by month (formulas from Maintenance). Surplus/deficit rows from Summary are not used.
14. **Watchman Details** — Staff record
15. **Handover Summary** — Nov 2020–Aug 2026 monthly totals
16. **Society Notes** — Wifi id, borewell, motor-repair notes
17. **Activity Funds** — Registry of optional named collections

> Even if the app stops working, the Google Sheet remains fully readable and editable.

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

**Quick deploy to GitHub Pages:**
1. Push to `main` branch
2. Go to Settings → Pages → Source: GitHub Actions
3. Deployed at: `https://theprideoftirumala.github.io/AppartmentApp/`

## 📁 Project Structure

```
src/
├── config/constants.js       # Configurable values
├── services/                 # Google API integrations
│   ├── googleAuth.js         # OAuth 2.0
│   ├── googleSheets.js       # CRUD operations
│   ├── googleDrive.js        # File/folder management
│   ├── liveSheetSetup.js     # Create/connect The Pride of Tirumala-LIVE
│   └── pdfExport.js          # PDF report generation
├── contexts/                 # React context providers
├── components/common/        # Reusable UI components
├── pages/                    # Route pages
├── styles/                   # CSS design system
└── utils/helpers.js          # Utility functions
```

## 🔒 Security

- Google OAuth 2.0 — no passwords stored
- Email whitelist — only authorized users can access
- Max 20 users, 2 owners — small community focus
- Audit logging — all changes are tracked
- No sensitive data in source code
- CSP headers configured for deployment

## 📄 License

MIT — Use freely for your apartment management needs.

---

Built with ❤️ for The Pride of Tirumala Apartment Community
