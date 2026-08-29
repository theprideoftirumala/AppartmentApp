/**
 * Spreadsheet bootstrap — creates a human-readable workbook that remains
 * the source of truth even if this app is never opened again.
 */

import {
  SHEET_NAMES,
  SHEET_HEADERS,
  DEFAULT_CONFIG,
  FLATS,
  STORAGE_KEYS,
  SHEET_FILE_NAME,
  CONFIG_DESCRIPTIONS,
} from '../config/constants';
import { ensureValidToken, getCurrentUser } from './googleAuth';
import { isFoundingOwner } from '../config/accessPolicy';
import { GUIDE_ROWS } from '../data/sampleSheetData';
import {
  HANDOVER_CONTACTS,
  HANDOVER_NOTES,
  HANDOVER_PAYEES,
  handoverSummaryRows,
} from '../data/handoverLedger';
import { isValidSpreadsheetId, bindSpreadsheet, getCurrentMonthLabel } from '../utils/helpers';
import { gapiCall } from '../utils/gapi';
import {
  maintenanceStillDueFormula,
  monthlySummaryFormulaRow,
  pendingDuesStaticRows,
  pendingDuesFormulaCells,
} from './sheetFormulas';

async function withAuth(fn) {
  await ensureValidToken();
  return fn();
}

function getSpreadsheetId() {
  const id = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  return isValidSpreadsheetId(id) ? id : null;
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
    resource: {
      valueInputOption: 'RAW',
      data,
    },
  });
}

/** Write formula cells. Must use USER_ENTERED so Sheets evaluates them. */
async function writeFormulas(spreadsheetId, data) {
  if (!data.length) return;
  await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });
}

/**
 * Fill Maintenance column K with Still Due formulas for every used row.
 */
export async function applyMaintenanceStillDueFormulas(spreadsheetId) {
  const header = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.MAINTENANCE}'!A1:K1`,
  });
  const headers = header.result.values?.[0] || [];
  if (!headers[10]) {
    await writeValues(spreadsheetId, [{
      range: `'${SHEET_NAMES.MAINTENANCE}'!K1`,
      values: [[SHEET_HEADERS[SHEET_NAMES.MAINTENANCE][10]]],
    }]);
  }

  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.MAINTENANCE}'!A2:A5000`,
  });
  const n = (response.result.values || []).length;
  if (n === 0) return;
  const values = Array.from({ length: n }, (_, i) => [maintenanceStillDueFormula(i + 2)]);
  await writeFormulas(spreadsheetId, [{
    range: `'${SHEET_NAMES.MAINTENANCE}'!K2:K${n + 1}`,
    values,
  }]);
}

/**
 * Ensure each month has a summary row and live formulas in B–I.
 */
export async function applyMonthlySummaryFormulas(spreadsheetId, extraMonths = []) {
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A1:I100`,
  });
  const all = response.result.values || [];
  if (!all[0]?.[0]) {
    await writeValues(spreadsheetId, [{
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A1`,
      values: [SHEET_HEADERS[SHEET_NAMES.MONTHLY_SUMMARY]],
    }]);
  }

  const dataRows = all.slice(1);
  const months = dataRows.map((r) => r[0] || '');
  const toAdd = extraMonths.filter((m) => m && !months.includes(m));
  const appendValues = toAdd.map((m) => [m]);
  if (appendValues.length) {
    await writeValues(spreadsheetId, [{
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A${dataRows.length + 2}`,
      values: appendValues,
    }]);
    appendValues.forEach((row) => dataRows.push(row));
  }

  const formulaUpdates = [];
  dataRows.forEach((row, i) => {
    if (!row[0]) return;
    const sheetRow = i + 2;
    formulaUpdates.push({
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!B${sheetRow}:I${sheetRow}`,
      values: [monthlySummaryFormulaRow(sheetRow)],
    });
  });
  await writeFormulas(spreadsheetId, formulaUpdates);
}

async function getSheetIdByTitle(spreadsheetId, title) {
  const meta = await window.gapi.client.sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });
  const sheet = (meta.result.sheets || []).find((s) => s.properties.title === title);
  return sheet?.properties.sheetId;
}

/**
 * Write the layman Pending Dues lookup tab. Keeps B3 if it already looks like MMM-YY.
 */
export async function writePendingDuesTemplate(spreadsheetId) {
  const existing = await gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.PENDING_DUES}'!B3`,
  })).catch(() => ({ result: { values: [] } }));
  const typed = String(existing.result.values?.[0]?.[0] || '').trim();
  const monthLabel = /^[A-Za-z]{3}-\d{2}$/.test(typed) ? typed : getCurrentMonthLabel();

  await writeValues(spreadsheetId, [{
    range: `'${SHEET_NAMES.PENDING_DUES}'!A1`,
    values: pendingDuesStaticRows(monthLabel),
  }]);

  const cells = pendingDuesFormulaCells();
  const formulaData = Object.entries(cells).map(([cell, formula]) => ({
    range: `'${SHEET_NAMES.PENDING_DUES}'!${cell}`,
    values: [[formula]],
  }));
  await writeFormulas(spreadsheetId, formulaData);

  const sheetId = await getSheetIdByTitle(spreadsheetId, SHEET_NAMES.PENDING_DUES);
  if (sheetId == null) return;
  await window.gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 1,
              endColumnIndex: 2,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 1, green: 0.93, blue: 0.55 },
                textFormat: { bold: true, fontSize: 12 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 8 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });
}

/**
 * Upgrade an existing workbook: formulas, Pending Dues, refreshed Guide.
 */
export async function upgradeWorkbookLayout(spreadsheetId) {
  await writeValues(spreadsheetId, [{
    range: `'${SHEET_NAMES.GUIDE}'!A1`,
    values: [SHEET_HEADERS[SHEET_NAMES.GUIDE], ...GUIDE_ROWS],
  }]);
  await applyMaintenanceStillDueFormulas(spreadsheetId);
  await applyMonthlySummaryFormulas(spreadsheetId);
  await writePendingDuesTemplate(spreadsheetId);
}

function columnLetter(index) {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function headerFormatRequests(sheetIds) {
  return sheetIds.map((sheetId) => ({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.15, green: 0.15, blue: 0.2 },
          textFormat: {
            bold: true,
            foregroundColor: { red: 0.8, green: 0.85, blue: 0.95 },
          },
          wrapStrategy: 'WRAP',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment)',
    },
  }));
}

function columnWidthRequests(sheetId, headerCount) {
  const width = headerCount <= 3 ? 280 : 140;
  return [{
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: 'COLUMNS',
        startIndex: 0,
        endIndex: Math.max(headerCount, 1),
      },
      properties: { pixelSize: width },
      fields: 'pixelSize',
    },
  }];
}

async function applyWorkbookPolish(spreadsheetId, sheetMeta) {
  const requests = [];
  sheetMeta.forEach(({ sheetId, headers }) => {
    requests.push(...headerFormatRequests([sheetId]));
    requests.push(...columnWidthRequests(sheetId, headers.length));
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    });
  });

  if (requests.length) {
    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });
  }
}

async function addSheetIfMissing(spreadsheetId, title) {
  const meta = await window.gapi.client.sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });
  const existing = (meta.result.sheets || []).find((s) => s.properties.title === title);
  if (existing) return existing.properties.sheetId;

  const added = await window.gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [{
        addSheet: {
          properties: {
            title,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      }],
    },
  });
  return added.result.replies[0].addSheet.properties.sheetId;
}

async function sheetIsEmpty(spreadsheetId, title) {
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!A1:A5`,
  });
  const rows = response.result.values || [];
  return rows.length === 0 || (rows.length === 1 && !rows[0]?.[0]);
}

/**
 * Create the main spreadsheet with Guide, handover history, and empty live tabs.
 * @param {string} folderId
 * @param {{ mode?: 'sample' | 'fresh', title?: string }} [options]
 */
export async function createSpreadsheet(folderId, options = {}) {
  return withAuth(async () => {
    const actor = getCurrentUser();
    // SECURITY: only the founding Google account may mint the society workbook.
    if (!isFoundingOwner(actor?.email)) {
      throw new Error('Only the society founding owner can create the society spreadsheet. Ask that account to share it with you as Viewer.');
    }
    const title = options.title || SHEET_FILE_NAME;
    const sheetNames = Object.values(SHEET_NAMES);

    const response = await window.gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: { title },
        sheets: sheetNames.map((name, index) => ({
          properties: {
            sheetId: index,
            title: name,
            index,
            gridProperties: { frozenRowCount: 1 },
          },
        })),
      },
    });

    const spreadsheetId = response.result.spreadsheetId;

    await window.gapi.client.drive.files.update({
      fileId: spreadsheetId,
      addParents: folderId,
      fields: 'id, parents',
    });

    const headerData = Object.entries(SHEET_HEADERS).map(([sheetName, headers]) => ({
      range: `'${sheetName}'!A1`,
      values: [headers],
    }));
    await writeValues(spreadsheetId, headerData);

    const liveWrites = [
      {
        range: `'${SHEET_NAMES.GUIDE}'!A2`,
        values: GUIDE_ROWS,
      },
      {
        range: `'${SHEET_NAMES.CONFIGURATION}'!A2`,
        values: configRows(),
      },
      {
        range: `'${SHEET_NAMES.HANDOVER_SUMMARY}'!A2`,
        values: handoverSummaryRows(),
      },
      {
        range: `'${SHEET_NAMES.PAYEES}'!A2`,
        values: HANDOVER_PAYEES,
      },
      {
        range: `'${SHEET_NAMES.EMERGENCY_CONTACTS}'!A2`,
        values: HANDOVER_CONTACTS,
      },
      {
        range: `'${SHEET_NAMES.SOCIETY_NOTES}'!A2`,
        values: HANDOVER_NOTES,
      },
      {
        range: `'${SHEET_NAMES.FLATS}'!A2`,
        values: emptyFlatRows(),
      },
    ];

    await writeValues(spreadsheetId, liveWrites);

    const sheetMeta = sheetNames.map((name, index) => ({
      sheetId: index,
      headers: SHEET_HEADERS[name] || ['A'],
    }));
    await applyWorkbookPolish(spreadsheetId, sheetMeta);
    await applyMaintenanceStillDueFormulas(spreadsheetId);
    await applyMonthlySummaryFormulas(spreadsheetId);
    await writePendingDuesTemplate(spreadsheetId);

    bindSpreadsheet(spreadsheetId);
    return spreadsheetId;
  });
}

/**
 * Add Guide / Sample Data / any missing tabs to an older workbook.
 * Never overwrites existing data rows.
 */
export async function ensureSheetStructure(spreadsheetId = getSpreadsheetId()) {
  return withAuth(async () => {
    if (!isValidSpreadsheetId(spreadsheetId)) return;

    for (const title of Object.values(SHEET_NAMES)) {
      await addSheetIfMissing(spreadsheetId, title);
      const headers = SHEET_HEADERS[title];
      if (!headers) continue;
      if (await sheetIsEmpty(spreadsheetId, title)) {
        const values = [headers];
        if (title === SHEET_NAMES.GUIDE) values.push(...GUIDE_ROWS);
        if (title === SHEET_NAMES.CONFIGURATION) values.push(...configRows());
        if (title === SHEET_NAMES.FLATS) values.push(...emptyFlatRows());
        if (title === SHEET_NAMES.HANDOVER_SUMMARY) values.push(...handoverSummaryRows());
        if (title === SHEET_NAMES.PAYEES) values.push(...HANDOVER_PAYEES);
        if (title === SHEET_NAMES.EMERGENCY_CONTACTS) values.push(...HANDOVER_CONTACTS);
        if (title === SHEET_NAMES.SOCIETY_NOTES) values.push(...HANDOVER_NOTES);
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${title}'!A1`,
          valueInputOption: 'RAW',
          resource: { values },
        });
      }
    }

    await upgradeWorkbookLayout(spreadsheetId);
    await ensureConfigKeys(spreadsheetId);
  });
}

async function ensureConfigKeys(spreadsheetId) {
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.CONFIGURATION}'!A2:A100`,
  });
  const existing = new Set((response.result.values || []).map((row) => row[0]));
  const missing = Object.entries(DEFAULT_CONFIG)
    .filter(([key]) => !existing.has(key))
    .map(([key, value]) => [key, String(value), CONFIG_DESCRIPTIONS[key] || '']);
  if (!missing.length) return;
  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${SHEET_NAMES.CONFIGURATION}'!A:C`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: missing },
  });
}

/**
 * Archive the current (usually sample) workbook and create an empty production sheet.
 */
export async function archiveAndCreateFresh(folderId, userEmail) {
  return withAuth(async () => {
    if (!isFoundingOwner(userEmail) && !isFoundingOwner(getCurrentUser()?.email)) {
      throw new Error('Only the founding owner can archive the current sheet and create a new one.');
    }
    const currentId = getSpreadsheetId();
    if (isValidSpreadsheetId(currentId)) {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      await window.gapi.client.drive.files.update({
        fileId: currentId,
        resource: { name: `${SHEET_FILE_NAME}-SAMPLE-${stamp}` },
        fields: 'id, name',
      });
    }

    const spreadsheetId = await createSpreadsheet(folderId, { mode: 'fresh', title: SHEET_FILE_NAME });
    return { spreadsheetId, archivedId: currentId, ownerEmail: userEmail };
  });
}

/**
 * Fill live tabs on the EXISTING society workbook with pretend data.
 * Does not create a new spreadsheet. Leaves Access Control and Audit Log alone.
 */
export async function seedSampleLiveData() {
  throw new Error('Sample data was removed after the 29 Aug 2026 handover. Use the Handover Summary tab for history.');
}

export { getSpreadsheetId, columnLetter };
