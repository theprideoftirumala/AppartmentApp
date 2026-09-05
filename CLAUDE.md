# CLAUDE.md — AI Assistant Reference

## Project Overview

**The Pride of Tirumala (TPT) Apartment Expense Tracker** is a Progressive Web App (PWA) for managing apartment maintenance finances for a 10-flat residential building.

## Architecture

- **Frontend**: React 19 + Vite 8, deployed as a static site (no backend)
- **Database**: Google Sheets API v4 (`APP-TPT-Tracker` IS the database)
- **File Storage**: Google Drive API v3 (receipts, backups, activity funds)
- **Auth**: Google Identity Services (GIS) — client-side OAuth 2.0
- **Hosting**: GitHub Pages or Azure Static Web Apps
- **PWA**: vite-plugin-pwa with Workbox
- **Voice fill**: browser Web Speech API + local parse
- **Receipt fill**: Tesseract.js `eng` OCR in the browser
- Architecture: `Architecture.md`

## Key Design Decisions

1. **No backend** — Google Sheets is the database.
2. **HashRouter** for GitHub Pages.
3. **One workbook** named `APP-TPT-Tracker` in Drive folder `TPT-APP-Tracker`.
4. **Books start Sep 2026.** Earlier history is ignored.
5. **Opening surplus is ₹612** (`OPENING_SURPLUS` on Configuration). Available balance = 612 + collected − spent.
6. **Balance tab** shows surplus / deficit / available from formulas so a layman can read it without the app.
7. **Max 20 users, 2 owners.** Fiscal year Sep–Aug.

## Directory Structure

```
src/
├── config/constants.js      # Folder + sheet names, opening 612, Sep-26 start
├── config/accessPolicy.js   # Founding owner, Reader default
├── services/
│   ├── googleAuth.js
│   ├── googleSheets.js      # CRUD + dashboard batch read
│   ├── googleDrive.js       # TPT-APP-Tracker folders, backups, share
│   ├── sheetSetup.js        # Create/connect APP-TPT-Tracker + formulas
│   ├── sheetFormulas.js     # Balance, Monthly Summary, Pending Dues, Still Due
│   ├── activityFunds.js
│   └── pdfExport.js         # Opening + month + available on every PDF
├── utils/
│   ├── ledgerMath.js        # Surplus / deficit / running (same as the sheet)
│   ├── months.js            # Sep-26 onward
│   ├── workbookCsv.js       # Local CSV stand-in for tests
│   ├── gapi.js
│   ├── voiceExpense.js
│   └── receiptOcr.js
```

## Google Sheet (source of truth)

Created in **TPT-APP-Tracker**, file name **APP-TPT-Tracker**.

Tabs: Guide, **Balance**, Configuration, Flats, Maintenance, Expenses, Monthly Summary, Pending Dues, Payees, Emergency Contacts, Reminders, Access Control, Audit Log, Watchman Details, Activity Funds, Water Tanker Log.

- Type amounts on Maintenance and Expenses.
- Do not type over Balance or Monthly Summary formula cells.
- Pending Dues: type a month in the yellow cell.
- Maintenance K is `due − paid`.

## Google Drive

```
TPT-APP-Tracker/
├── APP-TPT-Tracker
├── expenses-evidence/YYYY-MM/
├── activity-funds/
└── backups/
```

Backup on first Setup (if reconnecting), on each Google sign-in, and Settings → Create Backup. Guest PIN does not back up.

## Configuration

- Monthly maintenance: ₹3,000
- Opening surplus: ₹612
- Fiscal year start: 2026-09
- Treasurer: Flat 401, President: Flat 102
- Sample data compile-time off
- `public/sheet-config.json` may hold a published spreadsheet ID after create. Do not invent an id in source.

## Security

- Founding owner: full address only in `src/config/accessPolicy.js`
- Only that account may create `APP-TPT-Tracker`
- New users default to Reader / Drive Viewer
- Founding owner cannot be removed
- Writes go through `withWriteAuth`
- Tokens in `sessionStorage` only

Reuse `isFoundingOwner`, `effectiveAppRole`, `normalizeRequestedRole`, `canCreateSocietySpreadsheet`.

## Common work

- Change monthly rate: Settings → Configuration or the Configuration tab
- Add a flat owner: Settings → Flat Details
- Add a resident: Settings → Access Control (default Reader)
- Add a month: Maintenance → Add next month

## Client ID

```
91050465180-vqn4p4qk0rq5ihstdquu95vjpegjcbld.apps.googleusercontent.com
```

OAuth client IDs for web apps are public.
