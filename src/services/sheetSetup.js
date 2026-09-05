/**
 * Create and keep APP-TPT-Tracker human-readable.
 * Formulas on Balance, Monthly Summary, Pending Dues, and Maintenance K
 * are the cash book a treasurer can read without this app.
 */

import {
  CONFIG_DESCRIPTIONS,
  DEFAULT_CONFIG,
  FIRST_APP_MONTH_LABEL,
  FLATS,
  GOOGLE_SHEET_MIME,
  isGoogleSpreadsheetMime,
  SHEET_FILE_NAME,
  SHEET_HEADERS,
  SHEET_NAMES,
} from '../config/constants';
import { shouldCreateNewSocietySpreadsheet } from '../utils/setupFlow';
import { guideRows } from '../data/workbookGuide';
import { ensureValidToken, getCurrentUser } from './googleAuth';
import { findSocietySpreadsheet, setupFolderStructure } from './googleDrive';
import {
  getActiveSpreadsheetIdFromStorage,
  isValidSpreadsheetId,
} from '../utils/helpers';
import { coerceMonthLabel, nextMonthLabel, sortMonthLabels } from '../utils/months';
import { gapiCall } from '../utils/gapi';
import {
  balanceFormulaCells,
  balanceStaticRows,
  maintenanceStillDueFormula,
  monthlySummaryFormulaRow,
  pendingDuesFormulaCells,
  pendingDuesStaticRows,
} from './sheetFormulas';

async function withAuth(fn) {
  await ensureValidToken();
  return fn();
}

function getSpreadsheetId() {
  return getActiveSpreadsheetIdFromStorage();
}

function configRows() {
  return Object.entries(DEFAULT_CONFIG).map(([key, value]) => [
    key,
    String(value),
    CONFIG_DESCRIPTIONS[key] || '',
  ]);
}

function emptyFlatRows() {
  return FLATS.map((flat) => [flat, '', '', '', '', '', '', 'Member']);
}

async function writeValues(spreadsheetId, data) {
  if (!data.length) return;
  await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: { valueInputOption: 'RAW', data },
  });
}

async function writeFormulas(spreadsheetId, data) {
  if (!data.length) return;
  const chunkSize = 40;
  for (let i = 0; i < data.length; i += chunkSize) {
    await gapiCall(window.gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: data.slice(i, i + chunkSize),
      },
    }));
  }
}

async function listSheetProperties(spreadsheetId) {
  const meta = await gapiCall(window.gapi.client.sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  }));
  return meta.result.sheets || [];
}

async function deleteSheetByTitle(spreadsheetId, title) {
  const sheets = await listSheetProperties(spreadsheetId);
  const hit = sheets.find((sheet) => sheet.properties.title === title);
  if (!hit || sheets.length < 2) return false;
  await gapiCall(window.gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests: [{ deleteSheet: { sheetId: hit.properties.sheetId } }] },
  }));
  return true;
}

async function formatColumnsAsText(spreadsheetId, title, startColumnIndex, endColumnIndex) {
  const sheets = await listSheetProperties(spreadsheetId);
  const hit = sheets.find((sheet) => sheet.properties.title === title);
  if (!hit) return;
  await gapiCall(window.gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [{
        repeatCell: {
          range: {
            sheetId: hit.properties.sheetId,
            startRowIndex: 1,
            startColumnIndex,
            endColumnIndex,
          },
          cell: { userEnteredFormat: { numberFormat: { type: 'TEXT' } } },
          fields: 'userEnteredFormat.numberFormat',
        },
      }],
    },
  }));
}

async function addSheetIfMissing(spreadsheetId, title) {
  const sheets = await listSheetProperties(spreadsheetId);
  if (sheets.some((sheet) => sheet.properties.title === title)) return;
  await gapiCall(window.gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [{
        addSheet: {
          properties: {
            title,
            gridProperties: { frozenRowCount: title === SHEET_NAMES.BALANCE ? 0 : 1 },
          },
        },
      }],
    },
  }));
}

async function sheetIsEmpty(spreadsheetId, title) {
  const response = await gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!A1:A2`,
  }));
  return !(response.result.values || []).some((row) => row.some((cell) => String(cell || '').trim()));
}

async function moveFileToFolder(fileId, folderId) {
  const meta = await gapiCall(window.gapi.client.drive.files.get({
    fileId,
    fields: 'parents',
    supportsAllDrives: true,
  }));
  const previous = (meta.result.parents || []).join(',');
  await gapiCall(window.gapi.client.drive.files.update({
    fileId,
    addParents: folderId,
    removeParents: previous,
    supportsAllDrives: true,
    fields: 'id, parents',
  }));
}

export async function applyBalanceFormulas(spreadsheetId) {
  await addSheetIfMissing(spreadsheetId, SHEET_NAMES.BALANCE);
  await writeValues(spreadsheetId, [{
    range: `'${SHEET_NAMES.BALANCE}'!A1`,
    values: balanceStaticRows(),
  }]);
  const cells = balanceFormulaCells();
  await writeFormulas(spreadsheetId, Object.entries(cells).map(([cell, formula]) => ({
    range: `'${SHEET_NAMES.BALANCE}'!${cell}`,
    values: [[formula]],
  })));
}

export async function applyMaintenanceStillDueFormulas(spreadsheetId) {
  const header = await gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.MAINTENANCE}'!A1:K1`,
  }));
  const headers = header.result.values?.[0] || [];
  if (!headers[10]) {
    await writeValues(spreadsheetId, [{
      range: `'${SHEET_NAMES.MAINTENANCE}'!K1`,
      values: [[SHEET_HEADERS[SHEET_NAMES.MAINTENANCE][10]]],
    }]);
  }

  const response = await gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.MAINTENANCE}'!A2:A5000`,
  }));
  const n = (response.result.values || []).length;
  if (n === 0) return;
  const values = Array.from({ length: n }, (_, i) => [maintenanceStillDueFormula(i + 2)]);
  await writeFormulas(spreadsheetId, [{
    range: `'${SHEET_NAMES.MAINTENANCE}'!K2:K${n + 1}`,
    values,
  }]);
}

export async function applyMonthlySummaryFormulas(spreadsheetId, extraMonths = []) {
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A1:H100`,
  });
  const all = response.result.values || [];
  if (!all[0]?.[0]) {
    await writeValues(spreadsheetId, [{
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A1`,
      values: [SHEET_HEADERS[SHEET_NAMES.MONTHLY_SUMMARY]],
    }]);
  }

  const dataRows = all.slice(1);
  const months = sortMonthLabels([
    FIRST_APP_MONTH_LABEL,
    ...dataRows.map((row) => coerceMonthLabel(row[0]) || row[0]),
    ...extraMonths,
  ]);
  const existing = new Set(dataRows.map((row) => coerceMonthLabel(row[0]) || row[0]));
  const toAdd = months.filter((month) => month && !existing.has(month));
  if (toAdd.length) {
    await writeValues(spreadsheetId, [{
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A${dataRows.length + 2}`,
      values: toAdd.map((month) => [month]),
    }]);
    toAdd.forEach((month) => dataRows.push([month]));
  }

  const formulaUpdates = [];
  dataRows.forEach((row, i) => {
    if (!row[0]) return;
    const sheetRow = i + 2;
    formulaUpdates.push({
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!B${sheetRow}:H${sheetRow}`,
      values: [monthlySummaryFormulaRow(sheetRow)],
    });
  });
  await writeFormulas(spreadsheetId, formulaUpdates);
}

export async function writePendingDuesTemplate(spreadsheetId, monthLabel = FIRST_APP_MONTH_LABEL) {
  await addSheetIfMissing(spreadsheetId, SHEET_NAMES.PENDING_DUES);
  await writeValues(spreadsheetId, [{
    range: `'${SHEET_NAMES.PENDING_DUES}'!A1`,
    values: pendingDuesStaticRows(monthLabel),
  }]);
  const cells = pendingDuesFormulaCells();
  await writeFormulas(spreadsheetId, Object.entries(cells).map(([cell, formula]) => ({
    range: `'${SHEET_NAMES.PENDING_DUES}'!${cell}`,
    values: [[formula]],
  })));
}

export async function upgradeWorkbookLayout(spreadsheetId) {
  return withAuth(async () => {
    await ensureSheetStructure(spreadsheetId);
  });
}

async function seedEmptyTab(spreadsheetId, title, extraRows = []) {
  if (!(await sheetIsEmpty(spreadsheetId, title))) return;
  const header = SHEET_HEADERS[title];
  const values = header ? [header, ...extraRows] : extraRows;
  if (!values.length) return;
  await writeValues(spreadsheetId, [{
    range: `'${title}'!A1`,
    values,
  }]);
}

export async function ensureSheetStructure(spreadsheetId = getSpreadsheetId()) {
  return withAuth(async () => {
    if (!isValidSpreadsheetId(spreadsheetId)) {
      throw new Error('Spreadsheet is not connected.');
    }

    for (const title of Object.values(SHEET_NAMES)) {
      await addSheetIfMissing(spreadsheetId, title);
    }
    await deleteSheetByTitle(spreadsheetId, 'Sheet1');

    await writeValues(spreadsheetId, [{
      range: `'${SHEET_NAMES.GUIDE}'!A1`,
      values: [SHEET_HEADERS[SHEET_NAMES.GUIDE], ...guideRows()],
    }]);

    if (await sheetIsEmpty(spreadsheetId, SHEET_NAMES.CONFIGURATION)) {
      await writeValues(spreadsheetId, [{
        range: `'${SHEET_NAMES.CONFIGURATION}'!A1`,
        values: [SHEET_HEADERS[SHEET_NAMES.CONFIGURATION], ...configRows()],
      }]);
    }

    if (await sheetIsEmpty(spreadsheetId, SHEET_NAMES.FLATS)) {
      await writeValues(spreadsheetId, [{
        range: `'${SHEET_NAMES.FLATS}'!A1`,
        values: [SHEET_HEADERS[SHEET_NAMES.FLATS], ...emptyFlatRows()],
      }]);
    }

    await seedEmptyTab(spreadsheetId, SHEET_NAMES.MAINTENANCE);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.EXPENSES);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.PAYEES);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.EMERGENCY_CONTACTS);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.REMINDERS);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.ACCESS_CONTROL);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.AUDIT_LOG);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.WATCHMAN_DETAILS);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.ACTIVITY_FUNDS);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.WATER_TANKER);
    await seedEmptyTab(spreadsheetId, SHEET_NAMES.MONTHLY_SUMMARY, [[FIRST_APP_MONTH_LABEL]]);

    await applyBalanceFormulas(spreadsheetId);
    await writePendingDuesTemplate(spreadsheetId, FIRST_APP_MONTH_LABEL);
    await formatColumnsAsText(spreadsheetId, SHEET_NAMES.MAINTENANCE, 0, 2);
    await formatColumnsAsText(spreadsheetId, SHEET_NAMES.EXPENSES, 2, 3);
    await applyMaintenanceStillDueFormulas(spreadsheetId);
    await applyMonthlySummaryFormulas(spreadsheetId, [FIRST_APP_MONTH_LABEL]);
  });
}

export async function createSpreadsheet() {
  return withAuth(async () => {
    const user = getCurrentUser();
    const folders = await setupFolderStructure();
    const existing = await findSocietySpreadsheet(user.email);
    const existingId = existing?.id && isGoogleSpreadsheetMime(existing.mimeType || GOOGLE_SHEET_MIME)
      ? existing.id
      : null;
    if (existingId) {
      await ensureSheetStructure(existingId);
      return existingId;
    }
    if (!shouldCreateNewSocietySpreadsheet({ email: user?.email, existingSheetId: existingId })) {
      throw new Error('Only the founding owner can create APP-TPT-Tracker. Residents reuse the shared society sheet.');
    }

    const tabTitles = Object.values(SHEET_NAMES);
    const created = await gapiCall(window.gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: { title: SHEET_FILE_NAME },
        sheets: tabTitles.map((title, index) => ({
          properties: {
            title,
            index,
            gridProperties: { frozenRowCount: title === SHEET_NAMES.BALANCE ? 0 : 1 },
          },
        })),
      },
    }));
    const spreadsheetId = created.result.spreadsheetId;
    if (!isValidSpreadsheetId(spreadsheetId)) {
      throw new Error('Google did not return a spreadsheet id.');
    }
    if (folders?.rootId) {
      await moveFileToFolder(spreadsheetId, folders.rootId);
    }
    await ensureSheetStructure(spreadsheetId);
    return spreadsheetId;
  });
}

export async function appendNextMonthColumn(spreadsheetId = getSpreadsheetId()) {
  return withAuth(async () => {
    const [maintenance, expenses, summary] = await Promise.all([
      gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${SHEET_NAMES.MAINTENANCE}'!A2:A5000`,
      })),
      gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${SHEET_NAMES.EXPENSES}'!C2:C5000`,
      })),
      gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A2:A100`,
      })),
    ]);
    const known = sortMonthLabels([
      FIRST_APP_MONTH_LABEL,
      ...(maintenance.result.values || []).map((row) => row[0]),
      ...(expenses.result.values || []).map((row) => row[0]),
      ...(summary.result.values || []).map((row) => row[0]),
    ]);
    const last = known[known.length - 1] || FIRST_APP_MONTH_LABEL;
    const month = nextMonthLabel(last);
    await applyMonthlySummaryFormulas(spreadsheetId, [month]);
    return { month, months: sortMonthLabels([...known, month]) };
  });
}

export async function archiveAndCreateFresh() {
  throw new Error('The society workbook is APP-TPT-Tracker. Do not replace it. Use Settings → Create Backup, then edit this file.');
}

export async function seedSampleLiveData() {
  throw new Error('Sample data is off. Type real Sep-26 onwards rows on Maintenance and Expenses.');
}

export { getSpreadsheetId };
