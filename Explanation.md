# TPT Apartment Expense Tracker — Architecture & Code Explanation

> **The Pride of Tirumala (TPT)** — A Progressive Web App for managing apartment maintenance finances.  
> Stack: React 19 · Vite 8 · Google Sheets API v4 · Google Drive API v3 · Google Identity Services (OAuth 2.0) · jsPDF · Web Speech API · Tesseract.js  
> Architecture PNG: `docs/architecture.png`

---

## 1. High-Level Architecture

The app has **no backend server**. All data is stored in a Google Sheet in the Owner's Google Drive.
The browser talks directly to the Google APIs using short-lived OAuth 2.0 access tokens.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#4f7cff', 'edgeLabelBackground': '#1a1c26', 'tertiaryColor': '#1a1c26', 'background': '#0d0f17', 'primaryTextColor': '#e8eaf6', 'lineColor': '#4f7cff'}}}%%
graph TD
    subgraph Browser["🌐 Browser (React PWA)"]
        direction TB
        UI["React UI\n(pages + components)"]
        AUTH_CTX["AuthContext\n(OAuth state)"]
        APP_CTX["AppContext\n(data cache, toasts)"]
        SVC_AUTH["googleAuth.js\n(GIS token client)"]
        SVC_SHEETS["googleSheets.js\n(CRUD)"]
        SVC_DRIVE["googleDrive.js\n(files + backups)"]
        SVC_PDF["pdfExport.js\n(jsPDF)"]
        SVC_ACT["activityFunds.js\n(optional named funds)"]
        VOICE["voiceExpense.js\n(Web Speech API)"]
        OCR["receiptOcr.js\n(Tesseract.js OCR)"]
        LS[("localStorage\ncache + session")]
    end

    subgraph Google["☁️ Google Cloud"]
        OAUTH["Google Identity\nServices (OAuth 2.0)"]
        SHEETS["Google Sheets API v4\n(society + activity workbooks)"]
        DRIVE["Google Drive API v3\n(receipts, backups, activity-funds)"]
    end

    UI --> AUTH_CTX
    UI --> APP_CTX
    AUTH_CTX --> SVC_AUTH
    APP_CTX --> SVC_SHEETS
    APP_CTX --> SVC_DRIVE
    UI --> SVC_ACT
    UI --> VOICE
    UI --> OCR
    VOICE -->|"fills form only"| UI
    OCR -->|"fills form only"| UI
    SVC_AUTH <--> OAUTH
    SVC_SHEETS <--> SHEETS
    SVC_ACT <--> SHEETS
    SVC_DRIVE <--> DRIVE
    SVC_AUTH --> LS
    APP_CTX --> LS
    SVC_PDF --> UI
        AUTH_CTX -.->|"Google sign-in backup"| DRIVE
```

---

## 1b. Free on-device helpers (not paid AI)

These are **not** ChatGPT / Gemini / cloud models. Nothing from the receipt or spoken sentence is sent to an AI vendor. The user must review the form and tap Save.

| Helper | What it is | How it is used | Limits |
|--------|------------|----------------|--------|
| **Web Speech API** (`voiceExpense.js`) | Browser speech-to-text (Chrome / Safari / Edge). Free, built into the browser. | Owner taps **Fill with voice**, says e.g. `watchman salary 12000 and electricity 2400`. Local regex maps amount, category aliases, and payment mode. | Needs a microphone and a supporting browser. Hindi / noisy rooms often mis-hear amounts. Does not work well in WhatsApp in-app browsers. Never auto-submits. |
| **Tesseract.js v5** (`receiptOcr.js`) | Open-source OCR engine (`eng` traineddata) running **in the browser**. Free, no API key. | Owner taps **Fill from camera**, photo stays on the device while Tesseract reads printed text. Largest rupee figure and category words are suggested. | Slow on older phones (first load downloads worker + language data). Handwriting, crumpled bills, and low light fail often. Dates can be wrong (DD/MM vs MM/DD). First-load cache can be several MB. Never auto-submits. |
| **Local parsers** | Small JavaScript (`parseOneExpense`, `parseReceiptText`). | Split on “and / then / also”; detect ₹ / Rs / category aliases. | Only understands phrases we coded. “twelve thousand” (words) is not parsed. |

```mermaid
flowchart LR
    A[Owner on Expenses] --> B{Fill how?}
    B -->|Voice| C[Web Speech API<br/>browser STT]
    B -->|Camera| D[Tesseract.js<br/>on-device OCR]
    C --> E[Local parse<br/>amount + category]
    D --> E
    E --> F[Form lines shown]
    F --> G{Owner reviews?}
    G -->|Edit / Save| H[Google Sheets]
    G -->|Cancel| I[Nothing written]
```

---

## 2. Authentication & Authorisation Flow

The app implements a **two-layer security model**:

| Layer | What it does |
|-------|-------------|
| **Google OAuth 2.0** | Proves the user's identity (who they are) |
| **Access Control Sheet** | Decides if that identity is allowed (what they can do) |

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#4f7cff', 'secondaryColor': '#9c27b0', 'tertiaryColor': '#1a1c26', 'background': '#0d0f17', 'primaryTextColor': '#e8eaf6'}}}%%
sequenceDiagram
    actor User
    participant App as React App
    participant GIS as Google Identity Services
    participant Sheets as Google Sheets ACL

    User->>App: Click "Sign in with Google"
    App->>GIS: tokenClient.requestAccessToken()
    GIS-->>App: access_token (60 min TTL)
    App->>GIS: GET /oauth2/v2/userinfo
    GIS-->>App: {email, name, picture}

    Note over App: ACL check (only if setup complete)
    App->>Sheets: GET Access Control sheet
    Sheets-->>App: List of {email, role, status}

    alt Email NOT in list
        App->>App: setUser(userData) [keep session]
        App->>App: setAccessDenied(true)
        App-->>User: Full-page "Access Denied" screen\n(no data visible)
    else Email IS in list — Reader
        App->>App: setUserRole('Reader')
        App-->>User: Read-only Dashboard
    else Email IS in list — Owner
        App->>App: setUserRole('Owner')
        App-->>User: Full Dashboard + all features
    end
```

### Guest PIN Flow (no Google account needed)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#25D366', 'tertiaryColor': '#1a1c26', 'background': '#0d0f17', 'primaryTextColor': '#e8eaf6'}}}%%
sequenceDiagram
    actor Owner
    actor Guest
    participant App as React App
    participant LS as localStorage

    Owner->>App: Settings > Guest Access PIN > Set PIN
    App->>App: SHA-256 hash the PIN
    App->>LS: Store hash as tpt_guest_pin_hash

    Note over Owner,Guest: Owner shares PIN via WhatsApp

    Guest->>App: "Continue with Guest PIN" > Enter PIN
    App->>App: SHA-256 hash entered PIN
    App->>LS: Compare hashes
    alt Hashes match
        App->>LS: Store guest session (24h expiry)
        App-->>Guest: Read-only Dashboard\n(cached data only — no API call)
    else Mismatch
        App-->>Guest: "Incorrect PIN"
    end
```

---

## 3. Data Flow — How a Payment is Recorded

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#4f7cff', 'tertiaryColor': '#1a1c26', 'background': '#0d0f17', 'primaryTextColor': '#e8eaf6'}}}%%
flowchart LR
    A([Owner enters\npayment form]) --> B{Duplicate\ncheck}
    B -->|Duplicate!| C[🚫 Show error toast]
    B -->|Unique| D[sanitizeForSheet\neach text field]
    D --> E[withAuth wrapper\nchecks token TTL]
    E -->|Token expired| F[Request new token]
    F --> G
    E -->|Token valid| G[sheets.values.append\nor update]
    G -->|API error| H{Error code?}
    H -->|429 quota| I[Show quota message]
    H -->|403 denied| J[Show permission error]
    H -->|Network| K[Show offline message]
    G -->|Success| L[Audit log entry]
    L --> M[Re-fetch & update\nlocalStorage cache]
    M --> N([UI re-renders\nwith new data])
```

---

## 4. React Component Tree

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#9c27b0', 'tertiaryColor': '#1a1c26', 'background': '#0d0f17', 'primaryTextColor': '#e8eaf6'}}}%%
graph TD
    ROOT["App.jsx\n(HashRouter)"]

    ROOT --> AUTH["AuthProvider\n(Google OAuth + Guest PIN)"]
    AUTH --> APPPROV["AppProvider\n(config, dashboard, toasts)"]
    APPPROV --> EB["ErrorBoundary\n(crash safety net)"]
    EB --> AR["AppRoutes\n(route switching)"]

    AR --> AD["AccessDenied\n(blocked user wall)"]
    AR --> AL["AppLayout\n(Sidebar + BottomNav)"]

    AL --> LOGIN["Login\n(/login)"]
    AL --> SETUP["Setup\n(/setup)"]
    AL --> PR["ProtectedRoute\n(auth + setup guard)"]

    PR --> DASH["Dashboard\n(/)"]
    PR --> MAINT["Maintenance\n(/maintenance)"]
    PR --> EXP["Expenses\n(/expenses)"]
    PR --> REP["Reports\n(/reports)"]
    PR --> ACT["Activity Funds\n(/activities)"]
    PR --> REM["Reminders\n(/reminders)"]
    PR --> CONT["Emergency Contacts\n(/contacts)"]
    PR --> SETT["Settings\n(/settings)"]
    PR --> HELP["Help\n(/help - owners only)"]

    style AD fill:#b71c1c,color:#fff
    style EB fill:#e65100,color:#fff
    style PR fill:#1565c0,color:#fff
    style AUTH fill:#4527a0,color:#fff
```

---

## 5. Google Sheet Structure

The Google Sheet is the **single source of truth**. The app never has its own database.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#1b5e20', 'tertiaryColor': '#1a1c26', 'background': '#0d0f17', 'primaryTextColor': '#e8eaf6'}}}%%
erDiagram
    CONFIGURATION {
        string Key PK
        string Value
        string Description
    }
    FLATS {
        string Flat PK
        string OwnerName
        string Phone
        string Email
        string Role
    }
    MAINTENANCE {
        string Month FK
        string Flat FK
        number AmountDue
        number AmountPaid
        string Status "PAID|PENDING|PARTIAL|WAIVED"
        string PaymentDate
        string PaymentMode
    }
    EXPENSES {
        string ID PK
        string Date
        string Month FK
        string Description
        string Category
        number Amount
        string ReceiptDriveLink
    }
    ACCESS_CONTROL {
        string Email PK
        string Role "Owner|Reader"
        string Status "Active|Inactive"
        string AddedBy
    }
    AUDIT_LOG {
        string Timestamp
        string User FK
        string Action
        string Details
    }
    MONTHLY_SUMMARY {
        string Month PK
        number Collection
        number Expenses
        number NetBalance
        number Cumulative
        string Status "SURPLUS|DEFICIT"
    }
    REMINDERS {
        string ID PK
        string Title
        string Frequency
        string NextDue
        string AssignedTo
    }

    FLATS ||--o{ MAINTENANCE : "has payments"
    MAINTENANCE }o--|| CONFIGURATION : "uses rate from"
    EXPENSES }o--|| MONTHLY_SUMMARY : "aggregated into"
    MAINTENANCE }o--|| MONTHLY_SUMMARY : "aggregated into"
    ACCESS_CONTROL ||--o{ AUDIT_LOG : "user actions"
```

---

## 6. Security Model

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#b71c1c', 'tertiaryColor': '#1a1c26', 'background': '#0d0f17', 'primaryTextColor': '#e8eaf6'}}}%%
graph LR
    subgraph Threats["Known Threats Mitigated"]
        T1["Formula Injection\n(=HYPERLINK...)"]
        T2["XSS\n(script injection)"]
        T3["CSRF\n(cross-site requests)"]
        T4["Clickjacking\n(iframe embedding)"]
        T5["Token Theft\n(stored creds)"]
        T6["Unauthorised Access\n(unapproved emails)"]
    end

    subgraph Controls["Security Controls"]
        C1["sanitizeForSheet()\nStrips leading formula chars\nbefore every Sheet write"]
        C2["Content-Security-Policy header\nBlocks inline scripts and\nunauthorised origins"]
        C3["OAuth token flow\nNo secrets in frontend code;\ntokens not stored in localStorage"]
        C4["X-Frame-Options: DENY\nStrict-Transport-Security"]
        C5["Short-lived tokens (60 min)\nNo refresh token stored;\nre-auth on expiry"]
        C6["Access Control Sheet\nEmail whitelist checked\non every sign-in"]
    end

    T1 --> C1
    T2 --> C2
    T3 --> C3
    T4 --> C4
    T5 --> C5
    T6 --> C6
```

### What is formula injection and why does it matter?

Google Sheets evaluates any cell that starts with `=`, `+`, `-`, or `@` as a formula.
If an attacker types `=HYPERLINK("https://phishing.com","Click me")` into the
Description field of an expense and the app writes it unsanitized, everyone who
opens the sheet sees a clickable phishing link.

Our fix in `sanitizeForSheet()`:
```javascript
// Strip any character that Google Sheets treats as a formula prefix
return str.replace(/^[=+\-@\t\r]+/, '').trim();
```

---

## 7. Key Design Decisions

### 7.1 No Backend = No Database
The entire app is a static HTML/JS bundle deployed to Azure Static Web Apps or
GitHub Pages. There is no Node.js/Python server. Google Sheets IS the database.
This means:
- Zero server costs
- Zero DevOps maintenance
- Human-readable data (anyone can open the sheet)
- Limitation: all computation happens client-side; no server-side validation

### 7.2 HashRouter (not BrowserRouter)
GitHub Pages does not support server-side routing. `/#/maintenance` works because
the browser never sends the hash fragment to the server. Azure Static Web Apps is
configured with `navigationFallback` to handle direct URL access.

### 7.3 Short-Lived OAuth Tokens, Never Stored as Refresh Tokens
Google Identity Services (GIS) issues access tokens valid for ~60 minutes.
We deliberately do NOT request or store a refresh token. The token is kept in
`window.gapi.client`'s in-memory state only. The serialized token in localStorage
(`tpt_user_data`) contains the access token and expiry — on next visit, if the
token has expired, the user is asked to sign in again. This reduces the impact of
localStorage theft.

### 7.4 ErrorBoundary
A React class component wraps all page routes. If any page component throws an
unhandled JS exception (e.g., null dereference, failed JSON parse), the error
boundary catches it and shows a friendly "Try Again" screen instead of blanking
the entire app.

### 7.5 Cached Dashboard for Guest Users
Guest PIN users have no Google OAuth token, so they cannot call the Sheets API.
When an Owner loads the Dashboard, the full data set is serialised and stored in
`localStorage` under `tpt_cached_dashboard`. Guest users read this cache. This
means guests always see a snapshot — not live data.

---

## 8. Local Development Setup

```bash
# 1 — Install dependencies
cd C:\Learning\ApartmentApp-TPT\AppartmentApp
npm install

# 2 — Start dev server (hot-reload)
npm run dev
# Open: http://localhost:5173/AppartmentApp/

# 3 — Production build
npm run build

# 4 — Preview production build locally
npm run preview
```

**Node.js requirement:** `>= 22.0.0` (see `.nvmrc`)

---

## 9. Deployment

| Platform | How |
|----------|-----|
| **GitHub Pages** | Push to `main` → GitHub Action builds and deploys automatically |
| **Azure Static Web Apps** | Connected to GitHub; auto-deploys on push; `staticwebapp.config.json` provides CSP and routing rules |

The `base` path in `vite.config.js` is `/AppartmentApp/` so both platforms serve
the app at `https://domain/AppartmentApp/`.

---

## 10. File Map

```
src/
├── App.jsx                    Root router + ErrorBoundary
├── main.jsx                   React DOM entry point
├── config/
│   └── constants.js           All hardcoded values (flat numbers, sheet names, etc.)
├── contexts/
│   ├── AuthContext.jsx        Google OAuth + Guest PIN state
│   └── AppContext.jsx         Dashboard data, toasts, userRole
├── services/
│   ├── googleAuth.js          GIS token client, script loader, token refresh
│   ├── googleSheets.js        All Google Sheets CRUD (the "backend")
│   ├── googleDrive.js         Folder/file management, backups of APP and LIVE
│   ├── liveSheetSetup.js      Founding owner creates The Pride of Tirumala-LIVE
│   └── pdfExport.js           Monthly report PDF generation (jsPDF)
├── components/common/
│   ├── AccessDenied.jsx       Full-page wall for blocked users
│   ├── ErrorBoundary.jsx      React error boundary (class component)
│   ├── ProtectedRoute.jsx     Auth + setup + guest guards
│   ├── Tooltip.jsx            InfoBubble component
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   └── ...
├── pages/
│   ├── Dashboard.jsx          Financial overview + cached-data guest view
│   ├── Maintenance.jsx        Monthly payment collection
│   ├── Expenses.jsx           Expense log
│   ├── Reports.jsx            PDF generation + quick export
│   ├── Reminders.jsx          Recurring task reminders
│   ├── EmergencyContacts.jsx  WhatsApp-enabled contact directory
│   ├── Settings.jsx           Config + Access Control + Guest PIN
│   ├── Help.jsx               Owner-only guide + Google Sheets deep-dive
│   ├── Payees.jsx             GPay / PhonePe from phone; optional UPI; no invented UPI
│   ├── OldReport.jsx          #/old read-only APP Summary + handover
│   ├── Setup.jsx              Connect The Pride of Tirumala-APP (never create)
│   └── Login.jsx              Google OAuth + Guest PIN entry
├── styles/
│   ├── variables.css          Design tokens (colours, spacing, etc.)
│   ├── index.css              Global styles, buttons, forms, utilities
│   ├── pages.css              Page-specific styles
│   └── animations.css         Keyframe animations
└── utils/
    └── helpers.js             Pure utility functions incl. sanitizeForSheet()
```
