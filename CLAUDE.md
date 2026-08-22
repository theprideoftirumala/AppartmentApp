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

## Key Design Decisions

1. **No backend server** — entire app is client-side. Google Sheets serves as the database, readable/editable even without this app.
2. **HashRouter** used instead of BrowserRouter for GitHub Pages compatibility.
3. **Google Sheet is the source of truth** — all data has human-readable headers and descriptions.
4. **Max 20 users, 2 owners** — small apartment society, not enterprise-scale.
5. **Fiscal year Sep-Aug** — matches Indian apartment society conventions.

## Directory Structure

```
src/
├── config/constants.js     # All configurable values
├── config/accessPolicy.js  # Founding owner, Reader default, grant rules
├── services/
│   ├── googleAuth.js       # OAuth 2.0 via GIS
│   ├── googleSheets.js     # All CRUD operations
│   ├── googleDrive.js      # File/folder/sharing + society sheet discovery
│   ├── sheetSetup.js       # Create workbook (founding owner only)
│   └── pdfExport.js        # Monthly report PDF generation
├── contexts/
│   ├── AuthContext.jsx      # Google auth state
│   └── AppContext.jsx       # Global app state, toasts
├── components/common/       # Reusable components
├── pages/                   # Route pages
├── styles/                  # CSS design system
└── utils/helpers.js         # Formatters, validators
```

## Google Sheet Structure (source of truth)

The workbook is designed so a treasurer can understand every number without opening this app.

1. **Guide** — Plain-language explanation of every tab, column, and edit rule
2. **Configuration** — Key / Value / Description for all app settings
3. **Flats** — Owner details for 10 flats (101-502)
4. **Maintenance** — Monthly payment records per flat
5. **Expenses** — All expense entries with categories
6. **Misc Funds** — Extra collections (festival, levy, donation)
7. **Emergency Contacts** — Categorized contact directory
8. **Reminders** — Recurring task reminders
9. **Access Control** — Email whitelist with roles (Owner/Reader)
10. **Audit Log** — All write operations logged
11. **Water Tanker Log** — Dedicated tanker tracking
12. **Monthly Summary** — Calculated monthly financial summaries (9 columns)
13. **Watchman Details** — Staff record
14. **Sample Data** — Copy-paste examples; does not affect dashboard totals

Setup can create a **sample** workbook (live tabs pre-filled for testing) or a **fresh** production workbook (live tabs empty). After testing, Settings → Create Fresh Production Sheet archives the sample file in Drive.

## Google Drive Structure

```
TPT-AppartmentApp/
├── TPT-MaintenanceTracker (Google Sheet)
├── expenses-evidence/
│   ├── 2026-09/
│   └── ...
└── backups/
    └── TPT-MaintenanceTracker_YYYYMMDD_HHMMSS
```

## Configuration

All configurable values are in `src/config/constants.js` and can be overridden at runtime via the Configuration sheet:

- Monthly maintenance: ₹3,000 (configurable)
- Corpus fund: ₹0 (configurable)
- Deficit: -₹5,200 (configurable)
- Treasurer: Flat 401, President: Flat 102 (configurable)
- Late fee: ₹100 after 15th (configurable)

## Security Model

**One society sheet, one founding owner.** Do not “fix” access by letting each Google login create `TPT-MaintenanceTracker` in their own Drive — that made random accounts appear as Owner of a private copy.

- Founding owner: `th***@gmail.com` (full address only in `src/config/accessPolicy.js`). Always Owner. Cannot be removed.
- Only the founding owner may create or archive-and-recreate the workbook (`sheetSetup.js`).
- Manage users in the app: Settings → Access Control. New users default to **Reader**. Drive share is Viewer (`reader`) unless the founding owner grants Owner (`writer`).
- Members must not hit Setup/create. Unlisted or unshared accounts get Access Denied.
- Discovery: founding owner searches owned files; members search `sharedWithMe` plus optional `public/sheet-config.json`. Private copies owned by a non-founding user are ignored.
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

## API Quotas

- Google Sheets API: 300 requests per minute per project
- Google Drive API: 12,000 requests per day per project
- These limits are more than sufficient for 10-20 users

## Client ID

```
91050465180-vqn4p4qk0rq5ihstdquu95vjpegjcbld.apps.googleusercontent.com
```

This is intentionally in the source code — OAuth client IDs for web apps are public.
