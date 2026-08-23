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
- **💾 Backups** — Automatic Drive backup on each Owner Google sign-in (not Readers or Guest PIN)
- **📱 PWA** — Installable on iOS, Android, and desktop
- **🔐 Secure** — Google OAuth 2.0, audit logging, role-based access

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
| Deficit | -₹5,200 | Last year carry-forward |
| Treasurer Flat | 401 | Current treasurer |
| President Flat | 102 | Current president |
| Late Fee | ₹100 | Penalty after 15th of month |
| Emergency Reserve | ₹15,000 | Minimum balance to maintain |

## 📊 Google Sheet Structure

The Google Sheet is the source of truth. Every tab has human-readable headers. A **Guide** tab explains each column. A **Sample Data** tab holds copy-paste examples.

**Setup modes**
- **Test with sample data** — live tabs are filled with pretend Sep–Oct 2026 rows so you can click through the app
- **Start fresh** — live tabs are empty for real collections; Guide + Sample Data stay as the template

After testing, Owners can use **Settings → Create Fresh Production Sheet**. The sample workbook is renamed and kept in Drive.

1. **Guide** — How to read and edit the workbook
2. **Configuration** — App settings (key / value / description)
3. **Flats** — Owner details for all 10 flats
4. **Maintenance** — Monthly payment records
5. **Expenses** — All expense entries
6. **Misc Funds** — Extra collections
7. **Emergency Contacts** — Contact directory
8. **Reminders** — Recurring task reminders
9. **Access Control** — User email whitelist
10. **Audit Log** — All write operations
11. **Water Tanker Log** — Tanker delivery tracking
12. **Monthly Summary** — Calculated summaries
13. **Watchman Details** — Staff record
14. **Sample Data** — Example rows (does not affect totals)

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
