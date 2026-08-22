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
import { ensureValidToken } from './googleAuth';
import { GUIDE_ROWS, SAMPLE_CATALOG_ROWS, buildSampleLiveRows } from '../data/sampleSheetData';
import { isValidSpreadsheetId, bindSpreadsheet } from '../utils/helpers';

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
 * Create the main spreadsheet with Guide + Sample Data tabs.
 * @param {string} folderId
 * @param {{ mode?: 'sample' | 'fresh', title?: string }} [options]
 */
export async function createSpreadsheet(folderId, options = {}) {
  return withAuth(async () => {
    const mode = options.mode === 'sample' ? 'sample' : 'fresh';
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
        range: `'${SHEET_NAMES.SAMPLE_DATA}'!A2`,
        values: SAMPLE_CATALOG_ROWS,
      },
      {
        range: `'${SHEET_NAMES.CONFIGURATION}'!A2`,
        values: configRows(),
      },
    ];

    if (mode === 'sample') {
      const sample = buildSampleLiveRows();
      liveWrites.push(
        { range: `'${SHEET_NAMES.FLATS}'!A2`, values: sample[SHEET_NAMES.FLATS] },
        { range: `'${SHEET_NAMES.MAINTENANCE}'!A2`, values: sample[SHEET_NAMES.MAINTENANCE] },
        { range: `'${SHEET_NAMES.EXPENSES}'!A2`, values: sample[SHEET_NAMES.EXPENSES] },
        { range: `'${SHEET_NAMES.MISC_FUNDS}'!A2`, values: sample[SHEET_NAMES.MISC_FUNDS] },
        { range: `'${SHEET_NAMES.EMERGENCY_CONTACTS}'!A2`, values: sample[SHEET_NAMES.EMERGENCY_CONTACTS] },
        { range: `'${SHEET_NAMES.WATER_TANKER}'!A2`, values: sample[SHEET_NAMES.WATER_TANKER] },
        { range: `'${SHEET_NAMES.WATCHMAN_DETAILS}'!A2`, values: sample[SHEET_NAMES.WATCHMAN_DETAILS] },
        { range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A2`, values: sample[SHEET_NAMES.MONTHLY_SUMMARY] },
      );
    } else {
      liveWrites.push({
        range: `'${SHEET_NAMES.FLATS}'!A2`,
        values: emptyFlatRows(),
      });
    }

    await writeValues(spreadsheetId, liveWrites);

    const sheetMeta = sheetNames.map((name, index) => ({
      sheetId: index,
      headers: SHEET_HEADERS[name] || ['A'],
    }));
    await applyWorkbookPolish(spreadsheetId, sheetMeta);

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
        if (title === SHEET_NAMES.SAMPLE_DATA) values.push(...SAMPLE_CATALOG_ROWS);
        if (title === SHEET_NAMES.CONFIGURATION) values.push(...configRows());
        if (title === SHEET_NAMES.FLATS) values.push(...emptyFlatRows());
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${title}'!A1`,
          valueInputOption: 'RAW',
          resource: { values },
        });
      }
    }
  });
}

/**
 * Archive the current (usually sample) workbook and create an empty production sheet.
 */
export async function archiveAndCreateFresh(folderId, userEmail) {
  return withAuth(async () => {
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

export { getSpreadsheetId, columnLetter };
