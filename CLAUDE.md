# CLAUDE.md — AI Assistant Reference

## Project Overview

**The Pride of Tirumala (TPT) Apartment Expense Tracker** is a Progressive Web App (PWA) for managing apartment maintenance finances for a 10-flat residential building.

## Architecture

- **Frontend**: React 18 + Vite, deployed as a static site (no backend)
- **Database**: Google Sheets API v4 (the Google Sheet IS the database)
- **File Storage**: Google Drive API v3 (receipts, backups)
- **Auth**: Google Identity Services (GIS) — client-side OAuth 2.0
- **Hosting**: GitHub Pages or Azure Static Web Apps
- **PWA**: vite-plugin-pwa with Workbox service worker
- **Voice fill**: browser Web Speech API + local parse (no cloud model)
- **Receipt fill**: Tesseract.js `eng` OCR in the browser (no cloud model)
- Architecture diagram: `docs/architecture.png`

## Key Design Decisions

1. **No backend server** — entire app is client-side. Google Sheets serves as the database, readable/editable even without this app.
2. **HashRouter** used instead of BrowserRouter for GitHub Pages compatibility.
3. **Google Sheet is the source of truth** — all data has human-readable headers and descriptions.
4. **Max 20 users, 2 owners** — small apartment society, not enterprise-scale.
5. **Fiscal year Sep-Aug** — matches Indian apartment society conventions.

## Directory Structure

```
src/
├── config/constants.js      # Feature flags, disclaimer, sheet names
├── config/accessPolicy.js   # Founding owner, Reader default, grant rules
├── services/
│   ├── googleAuth.js        # OAuth 2.0 via GIS
│   ├── googleSheets.js      # Society workbook CRUD
│   ├── googleDrive.js       # Receipts, backups, activity folder
│   ├── activityFunds.js     # One reusable sheet per optional activity
│   ├── sheetSetup.js        # Extend The Pride of Tirumala-APP (never create a new society file)
│   └── pdfExport.js         # Monthly + activity PDFs
├── pages/ActivityFunds.jsx  # Start / view optional activity funds
├── data/handoverLedger.js   # Nov 2020–Aug 2026 totals (no owner names)
├── utils/gapi.js            # Promise.resolve wrapper for gapi thenables
├── utils/setupFlow.js       # Setup never offers create
├── utils/legacySheetImport.js # Summary collections + expense categories / Exp-Detailed (no duplicate totals)
├── utils/voiceExpense.js    # On-device speech parse
├── utils/receiptOcr.js      # On-device Tesseract parse
└── utils/appCache.js        # Clear local + service-worker cache
```

## Google Sheet Structure (source of truth)

The workbook is designed so a treasurer can understand every number without opening this app.

**History tabs already in The Pride of Tirumala-APP.xlsx — never overwrite:** Summary, Exp - Detailed, Borewell Exp, Motor repair oct, Notes.

**App tabs added beside those if missing:**

1. **Guide** — Plain-language explanation of every tab, column, and edit rule
2. **Configuration** — Key / Value / Description for all app settings
3. **Flats** — Owner details for 10 flats (101-502)
4. **Maintenance** — Per-flat collected amounts, copied from the existing Summary grid (column A flats × month columns). Opening Dashboard/Maintenance as founding owner updates this tab. Column K (Still Due) is a formula: due − paid.
5. **Pending Dues** — Type a month in the yellow cell to see who still owes (formulas; do not type in the table)
6. **Expenses** — Expense entries from Nov 2020 (Exp - Detailed line items, then Summary category/Sundry totals that are not already covered) plus new app rows
7. **Misc Funds** — Extra collections (festival, levy, donation)
8. **Emergency Contacts** — Categorized contact directory
9. **Reminders** — Recurring task reminders
10. **Access Control** — Email whitelist with roles (Owner/Reader)
11. **Audit Log** — All write operations logged
12. **Water Tanker Log** — Dedicated tanker tracking
13. **Monthly Summary** — Collection sheet: live formulas from Maintenance (Summary grid) and Expenses. Surplus/deficit and late-fee rows on Summary are not used.
14. **Watchman Details** — Staff record
15. **Handover Summary** — Nov 2020–Aug 2026 monthly totals from the old I&E Excel (no owner names)
16. **Payees** — Watchman and vendor phones / UPI for GPay and PhonePe
17. **Society Notes** — Wifi id, borewell totals, motor-repair collection
18. **Activity Funds** — Registry of optional named collections. Each activity also has its own Google Spreadsheet under `activity-funds/` and is reused if the same name is started again.

Late fee and the old Misc Funds tab stay in the workbook for history. The app no longer collects them. Use **Activity Funds** for Ganesh, motor, or similar optional collections.

Setup **never creates** a society workbook. It connects **The Pride of Tirumala-APP** already in Drive (convert the .xlsx with Open with Google Sheets if needed), copies a backup first, then adds empty app tabs beside the five history tabs. Sample live-tab data stays off.

## Google Drive Structure

```
TPT-AppartmentApp/
├── The Pride of Tirumala-APP (Google Sheet; history tabs + app tabs)
├── expenses-evidence/
│   ├── 2026-09/
│   └── ...
├── activity-funds/
│   ├── TPT-Activity-ganesh-festival
│   └── TPT-Activity-new-motor-fund
└── backups/
    └── The Pride of Tirumala-APP_pre-setup_YYYYMMDD_HHMMSS
    └── The Pride of Tirumala-APP_login_YYYYMMDD_HHMMSS
```

A Drive copy is taken before first Setup and on every Google sign-in. Guest PIN sessions do not.

## Configuration

All configurable values are in `src/config/constants.js` and can be overridden at runtime via the Configuration sheet:

- Monthly maintenance: ₹3,000 (configurable)
- Corpus fund: ₹0 (configurable)
- Available balance: the green cell on the existing Summary tab (copied into Configuration). Not a `DEFAULT_CONFIG` number. Surplus/deficit and late-fee rows are not used. Collected maintenance is the Summary grid. Live months start Sep 2026.
- Published sheet ID: `public/sheet-config.json` points at The Pride of Tirumala-APP. Do not create a second society file.
- Treasurer: Flat 401, President: Flat 102 (configurable)
- Late fee, late-fee day, and emergency reserve are not app settings. Leftover rows can stay on the Configuration sheet for history.
- Sample data: compile-time off (`FEATURES.SAMPLE_DATA`). History lives on the five legacy tabs and Handover Summary.

## Security Model

**One society sheet, one founding owner.** Do not “fix” access by letting each Google login create a private copy — that made random accounts appear as Owner of their own file.

- Founding owner: `th***@gmail.com` (full address only in `src/config/accessPolicy.js`). Always Owner. Cannot be removed.
- The workbook is **The Pride of Tirumala-APP**. The app never mints `TPT-MaintenanceTracker` or any replacement file.
- Manage users in the app: Settings → Access Control. New users default to **Reader**. Drive share is Viewer (`reader`) unless the founding owner grants Owner (`writer`).
- Members must not hit Setup/create. Unlisted or unshared accounts get Access Denied.
- Discovery: founding owner searches owned `The Pride of Tirumala-APP`; members search `sharedWithMe` plus optional `public/sheet-config.json`. Private copies and the old `TPT-MaintenanceTracker` name are ignored. A failed lookup must not wipe a bound workbook.
- OAuth scopes include `drive.metadata.readonly` so shared files are listable. Bump `OAUTH_SCOPE_VERSION` when scopes change so GIS re-consents.
- Write RPCs go through `withWriteAuth` (Access Control + founding-owner check), not UI hiding alone.
- Google OAuth 2.0 — no passwords stored. Access tokens in `sessionStorage` only.
- Max 20 users, max 2 owners. Audit logging on writes.
- Short-lived access tokens (no refresh tokens stored)

Reuse `accessPolicy.js` helpers (`isFoundingOwner`, `effectiveAppRole`, `normalizeRequestedRole`, `canCreateSocietySpreadsheet`) instead of ad-hoc email checks.

## Common Modifications

### Change monthly maintenance amount
Update `MONTHLY_MAINTENANCE` in Settings page or directly in the Configuration sheet.

### Add a new flat owner
Go to Settings → Flat Details → Edit the flat row.

### Transition Treasurer/President
Go to Settings → Configuration → Update TREASURER_FLAT / PRESIDENT_FLAT.

### Add a resident (read-only by default)
Sign in as the founding owner → Settings → Access Control → Add User. Leave role as Reader. The existing sheet is shared as Viewer; they must not create another spreadsheet.

### Add a new expense category
Add to the `EXPENSE_CATEGORIES` array in `src/config/constants.js` and rebuild.

### Change fiscal year
Update `FISCAL_YEAR_START` in the Configuration sheet.

### Convert the Excel file for first use
In Drive: right-click The Pride of Tirumala-APP.xlsx → Open with Google Sheets → File → Save as Google Sheets. Keep the name **The Pride of Tirumala-APP**. Setup then backs up and adds app tabs.

## API Quotas

- Google Sheets API: 300 requests per minute per project
- Google Drive API: 12,000 requests per day per project
- These limits are more than sufficient for 10-20 users

## Client ID

```
91050465180-vqn4p4qk0rq5ihstdquu95vjpegjcbld.apps.googleusercontent.com
```

This is intentionally in the source code — OAuth client IDs for web apps are public.
