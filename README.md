# The Pride of Tirumala — Apartment Expense Tracker

A **Progressive Web App** for apartment maintenance finances. One Google Sheet is the cash book.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Desktop-green)
![Status](https://img.shields.io/badge/status-active-brightgreen)

## What’s in 2.0.0

- **One workbook:** `APP-TPT-Tracker` in Drive folder `TPT-APP-Tracker`
- **Books start Sep-26.** Opening surplus **₹612**
- **Balance tab** (formulas): collected, spent, available, SURPLUS / DEFICIT / BALANCED
- **PDF** prints opening surplus, this month surplus/deficit, and available balance
- Local CSV proof: `npm run workbook:csv` → `test-fixtures/APP-TPT-Tracker/`

See `Architecture.md` for colorful diagrams.

## Features

- Dashboard — available balance, collection %, expenses, pending flats
- Maintenance — PAID default, multi-flat save, add next month
- Expenses — categories, receipts, voice or camera fill (review before save)
- Reports + WhatsApp/email PDF
- Activity Funds, Payees (GPay / PhonePe), Reminders, Emergency contacts
- Access Control (Owner / Reader, max 20 / 2)
- Guest PIN (device-local cached dashboard)
- PWA, themes, Drive backups

## Quick start

```bash
npm install
npm test
npm run workbook:csv
npm run dev
```

Open `http://localhost:5173/AppartmentApp/`. Add `http://localhost:5173` to the OAuth JavaScript origins.

## First Setup

Sign in as the founding owner → Setup creates `TPT-APP-Tracker/APP-TPT-Tracker` if it is missing. Open the **Balance** tab in Google Sheets.

## Deploy

Push to `main`. GitHub Actions publishes to GitHub Pages. Details in `DEPLOYMENT.md`.

After deploy: hard-refresh or Settings → Clear cache (PWA `tpt-v50`).
