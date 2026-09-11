# AGENTS.md — coding agents on this repo

Read `Architecture.md`, `CLAUDE.md`, and `llms.txt` before changing money, Sheets, or reports.

## What this is

The Pride of Tirumala (TPT) apartment expense tracker. React 19 + Vite 8 PWA. **No backend.** Google Sheet `APP-TPT-Tracker` in Drive folder `TPT-APP-Tracker` is the cash book.

Live: `https://theprideoftirumala.github.io/AppartmentApp/` (HashRouter, base `/AppartmentApp/`).

## Cash book

- Books start **Sep-26**. Ignore earlier months.
- **₹612** (`OPENING_SURPLUS` on Configuration) is cash **after Aug 2026**. That is **Sep-26’s opening**, not every month’s opening.
- **Balance tab** (whole books): `612 + all collected − all spent`.
- **Each month:** opening = previous month’s available (Sep uses 612). Available after the month = opening + this month collected − this month spent.
- Same math in `src/utils/ledgerMath.js` (`monthOpening`, `pdfMoneySummary`) and `src/services/sheetFormulas.js`.
- Do not type over Balance or Monthly Summary formula cells.

## Monthly report

- First card: **Opening surplus** or **Opening deficit** = available after the previous month.
- Then this month collected / spent / net, then available after this month.
- Include year-to-date **through the selected month**, notes, Franklin water quote, volunteer disclaimer, **The Google Sheet is the source of truth**.
- Stamp: watercolor, name on an **inner** circular arc, month inside. If space is tight, overlap the last notes — **do not add a blank page for the stamp**.
- Resident copy: no *society*, no `APP-TPT-Tracker`, no blaming a flat. Still-due on the report is a total and count, not a named list.

## Must not

- Invent a spreadsheet id in source. `public/sheet-config.json` may hold one after create.
- Put the founding owner email anywhere except `src/config/accessPolicy.js`.
- Create a second workbook (`TPT-MaintenanceTracker`, `The Pride of Tirumala-APP`, a LIVE twin).
- Rename Drive file `APP-TPT-Tracker`.
- Use inline `import()` in function bodies.
- Commit secrets, `.env`, or `credentials.json`.
- Commit unless the user asks. Push / Pages deploy only when they ask to publish.

## Access

Founding owner may create the sheet. Everyone else defaults to Reader / Drive Viewer. Max 20 users, 2 owners. Writes go through `withWriteAuth`. Tokens in `sessionStorage` only.

Reuse `isFoundingOwner`, `effectiveAppRole`, `normalizeRequestedRole`, `canCreateSocietySpreadsheet`.

## Checks before publish

```bash
npm test
npm run lint
npm run build
npm run validate:pages
```

Push to `main` deploys GitHub Pages via `.github/workflows/deploy.yml`. Bump PWA `cacheId` in `vite.config.js` when UI changes. After deploy: hard-refresh or Settings → Clear cache.
