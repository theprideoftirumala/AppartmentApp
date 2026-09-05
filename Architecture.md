# Architecture — The Pride of Tirumala Expense Tracker

**One Google Sheet. One Drive folder. Books from Sep 2026. Opening surplus ₹612.**

Stack: React 19 · Vite 8 · Google Sheets API v4 · Google Drive API v3 · Google Identity Services · jsPDF · Web Speech API · Tesseract.js

---

## 1. High-level system

The app has **no backend**. The browser talks to Google APIs with a short-lived OAuth token. `APP-TPT-Tracker` is the cash book.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#2e7d32', 'secondaryColor': '#1565c0', 'tertiaryColor': '#f9a825', 'background': '#0b1220', 'primaryTextColor': '#e8f5e9', 'lineColor': '#80cbc4', 'edgeLabelBackground': '#102030'}}}%%
flowchart TB
    subgraph Browser["🌐 Browser — React PWA"]
        UI["Pages: Dashboard · Maintenance · Expenses · Reports"]
        AUTH["AuthContext — GIS OAuth + Guest PIN"]
        APP["AppContext — cache + toasts"]
        MATH["ledgerMath.js — surplus / deficit / running"]
        PDF["pdfExport.js — monthly PDF"]
        VOICE["Voice fill — Web Speech"]
        OCR["Receipt fill — Tesseract.js"]
    end

    subgraph Drive["☁️ Google Drive / TPT-APP-Tracker"]
        SHEET["APP-TPT-Tracker<br/>Balance · Maintenance · Expenses · Monthly Summary"]
        EVID["expenses-evidence/YYYY-MM"]
        ACT["activity-funds/"]
        BAK["backups/"]
    end

    UI --> AUTH
    UI --> APP
    APP --> MATH
    UI --> PDF
    UI --> VOICE
    UI --> OCR
    APP -->|"batchGet / append"| SHEET
    PDF -->|"prints opening + month + available"| UI
    UI --> EVID
    UI --> ACT
    AUTH -->|"login backup"| BAK
```

---

## 2. Drive layout

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#6a1b9a', 'background': '#120818', 'primaryTextColor': '#f3e5f5', 'lineColor': '#ce93d8'}}}%%
flowchart LR
    ROOT["📁 TPT-APP-Tracker"]
    ROOT --> BOOK["📗 APP-TPT-Tracker"]
    ROOT --> EV["📁 expenses-evidence"]
    ROOT --> AF["📁 activity-funds"]
    ROOT --> BK["📁 backups"]
    EV --> M["2026-09 / …"]
    AF --> G["TPT-Activity-ganesh-festival"]
    BK --> C["APP-TPT-Tracker_login_YYYYMMDD"]
```

---

## 3. Cash-book math (source of truth)

Opening surplus **₹612** is typed on Configuration as `OPENING_SURPLUS`. The Balance tab and Monthly Summary are formulas. The app uses the same math in `ledgerMath.js`.

```
Available balance = 612 + all Amount Paid − all Expense amounts
This month = collected this month − spent this month
Status = SURPLUS if > 0, DEFICIT if < 0, BALANCED if 0
Running balance after a month = opening + every month result up to that month
```

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#ef6c00', 'secondaryColor': '#2e7d32', 'tertiaryColor': '#c62828', 'background': '#1a1208', 'primaryTextColor': '#fff8e1', 'lineColor': '#ffcc80'}}}%%
flowchart TD
    O["Opening surplus ₹612<br/>1 Sep 2026"] --> C["+ Collected<br/>Maintenance Amount Paid"]
    C --> S["− Spent<br/>Expenses Amount"]
    S --> A{"Available balance"}
    A -->|"> 0"| SUR["🟢 SURPLUS"]
    A -->|"= 0"| BAL["⚪ BALANCED"]
    A -->|"< 0"| DEF["🔴 DEFICIT"]
```

A treasurer who never opens this website can still see surplus or deficit on the **Balance** tab.

---

## 4. Authentication and access

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#1565c0', 'secondaryColor': '#c62828', 'background': '#061018', 'primaryTextColor': '#e3f2fd', 'lineColor': '#90caf9'}}}%%
sequenceDiagram
    actor User
    participant App as React PWA
    participant GIS as Google Identity Services
    participant ACL as Access Control tab

    User->>App: Sign in with Google
    App->>GIS: requestAccessToken
    GIS-->>App: access_token (~60 min)
    App->>ACL: Read Active emails
    alt Email missing
        App-->>User: Access Denied
    else Reader
        App-->>User: View dashboard, no writes
    else Owner / founding owner
        App-->>User: Full write + Settings
    end
```

| Role | Drive share | App writes |
|------|-------------|------------|
| Founding owner | Writer | Always Owner. May create `APP-TPT-Tracker`. Cannot be removed. |
| Owner (granted) | Writer | Financial writes |
| Reader (default) | Viewer | Read only |
| Guest PIN | None | Cached dashboard only, 24h, this device |

Max 20 users, max 2 owners.

---

## 5. React routes

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#4527a0', 'background': '#100818', 'primaryTextColor': '#ede7f6', 'lineColor': '#b39ddb'}}}%%
flowchart TD
    R["HashRouter"] --> L["#/login"]
    R --> S["#/setup — founding owner"]
    R --> D["#/ Dashboard"]
    R --> M["#/maintenance"]
    R --> E["#/expenses"]
    R --> P["#/reports + PDF"]
    R --> A["#/activities"]
    R --> Y["#/payees"]
    R --> N["#/reminders"]
    R --> C["#/contacts"]
    R --> T["#/settings"]
    R --> H["#/help"]
    style S fill:#6a1b9a,color:#fff
    style D fill:#1565c0,color:#fff
    style P fill:#2e7d32,color:#fff
```

---

## 6. Workbook tabs

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#00695c', 'background': '#041210', 'primaryTextColor': '#e0f2f1', 'lineColor': '#80cbc4'}}}%%
erDiagram
    CONFIGURATION {
        string Key PK
        string Value
        string Description
    }
    BALANCE {
        string Metric
        number Amount
        string Meaning
    }
    FLATS {
        string Flat PK
        string OwnerName
    }
    MAINTENANCE {
        string Month
        string Flat
        number AmountPaid
        string Status
    }
    EXPENSES {
        string ID PK
        string Month
        number Amount
    }
    MONTHLY_SUMMARY {
        string Month PK
        number Collected
        number Spent
        number MonthResult
        number Running
        string Status
    }

    CONFIGURATION ||--|| BALANCE : "OPENING_SURPLUS 612"
    MAINTENANCE ||--o{ MONTHLY_SUMMARY : "SUMIF collected"
    EXPENSES ||--o{ MONTHLY_SUMMARY : "SUMIF spent"
    MONTHLY_SUMMARY ||--|| BALANCE : "running available"
    FLATS ||--o{ MAINTENANCE : "10 flats"
```

---

## 7. PDF report

Every monthly PDF prints:

1. Opening surplus ₹612  
2. Collected this month  
3. Spent this month  
4. This month SURPLUS / DEFICIT / BALANCED  
5. Available balance (running) and its status  

Same numbers as the Balance tab.

---

## 8. Performance

| Area | How |
|------|-----|
| Dashboard | One `values.batchGet` for Configuration, Maintenance, Expenses, Reminders, Contacts, Flats, Monthly Summary |
| Money | Pure `ledgerMath` — no second Live Summary pass |
| PDF font | Noto Sans cached once per session |
| PWA | Google APIs `NetworkOnly`; vendor / icons / pdf code-split |
| Writes | `withWriteAuth` + Access Control, not UI hiding alone |

---

## 9. Security

- `sanitizeForSheet()` strips leading `= + - @` before every typed cell  
- Tokens stay in `sessionStorage` (no stored refresh token)  
- CSP + `X-Frame-Options: DENY`  
- Readers cannot write even if Drive leftover is Writer  
- Private copies owned by a non-founder are ignored  

---

## 10. Local CSV proof

`npm run workbook:csv` and `src/utils/workbookCsv.test.js` write `test-fixtures/APP-TPT-Tracker/*.csv` and evaluate the same ledger as the live sheet. Sep-26 sample: collected ₹25,500, spent ₹14,400, running ₹11,712 surplus. Oct-26 sample month is a deficit; available remains a surplus at ₹6,712.
