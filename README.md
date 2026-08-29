# The Pride of Tirumala — Apartment Expense Tracker

A **Progressive Web App (PWA)** for managing apartment maintenance finances, built with React and powered by Google Sheets as the database.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Desktop-green)
![Status](https://img.shields.io/badge/status-active-brightgreen)

## ✨ Features

- **📊 Financial Dashboard** — Real-time balance, collection status, expense breakdown
- **🏠 Maintenance Tracking** — Mark payments for 10 flats with status (Paid/Pending/Partial)
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

**The Pride of Tirumala-LIVE** (from Sep 2026) — founding owner: Settings → Backups → Create live books. Copies Flats, Payees, Access Control, and related tabs from APP. Opening balance is the green Summary cell at create. **Live Summary** uses formulas (collections from Maintenance, expenses from Expenses, monthly surplus/deficit, running available balance). Type amounts on Maintenance and Expenses in the app or by hand — not on Live Summary. Same expense or same payee (UPI or name+phone) is blocked.

Add a row on Maintenance or Expenses and refresh the app — the sheet is what the website shows.

1. **Guide** — How to read and edit the workbook
2. **Configuration** — App settings (key / value / description)
3. **Flats** — Owner details for all 10 flats (names copied from Summary on first connect)
4. **Maintenance** — Per-flat collections copied from the existing Summary grid
5. **Pending Dues** — Type a month in the yellow cell
6. **Expenses** — Expense entries from Nov 2020 (history copied from Exp - Detailed)
7. **Payees** — Vendor phones / UPI (GPay and PhonePe)
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
