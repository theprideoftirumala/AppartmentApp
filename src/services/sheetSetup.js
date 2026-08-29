/**
 * Spreadsheet bootstrap — creates a human-readable workbook that remains
 * the source of truth even if this app is never opened again.
 */

import {
  SHEET_NAMES,
  SHEET_HEADERS,
  DEFAULT_CONFIG,
  FLATS,
  SHEET_FILE_NAME,
  CONFIG_DESCRIPTIONS,
  LEGACY_SHEET_TABS,
} from '../config/constants';
import { ensureValidToken } from './googleAuth';
import { GUIDE_ROWS } from '../data/sampleSheetData';
import {
  HANDOVER_CONTACTS,
  HANDOVER_NOTES,
  HANDOVER_PAYEES,
  handoverSummaryRows,
} from '../data/handoverLedger';
import { isValidSpreadsheetId, getCurrentMonthLabel, getActiveSpreadsheetIdFromStorage, getLiveSpreadsheetIdFromStorage } from '../utils/helpers';
import {
  availableBalanceFromSummaryGrid,
  expenseRowsFromDetailedGrid,
  expenseRowsFromSummaryGrid,
  findFlatNumber,
  leftoverDuplicateImportIndexes,
  maintenanceRowsFromSummaryGrid,
  mergeHistoryExpenses,
} from '../utils/legacySheetImport';
import {
  liveMonthHeaders,
  liveSummaryNeedsFormulaRepair,
  liveSummaryStaticAndFormulaGrid,
  nextSequentialMonthLabel,
  plannedLiveMonths,
  sameMonthList,
  sortMonthLabels,
  workingMonthLabels,
} from '../utils/liveSummaryLayout';
import { gapiCall, gapiCallSafe } from '../utils/gapi';
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
  return getActiveSpreadsheetIdFromStorage();
}

function treatingAsLiveWorkbook(spreadsheetId, liveWorkbook) {
  if (liveWorkbook) return true;
  const liveId = getLiveSpreadsheetIdFromStorage();
  return Boolean(liveId && spreadsheetId === liveId);
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

async function expenseRowsFromLegacyDetailed(spreadsheetId) {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Exp - Detailed'!A3:C900",
    });
    return expenseRowsFromDetailedGrid(response.result.values || []);
  } catch {
    return [];
  }
}

async function expenseRowsFromLegacySummary(spreadsheetId) {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Summary'!A10:BZ50",
      valueRenderOption: 'UNFORMATTED_VALUE',
      majorDimension: 'ROWS',
    });
    return expenseRowsFromSummaryGrid(response.result.values || []);
  } catch {
    return [];
  }
}

async function maintenanceRowsFromLegacySummary(spreadsheetId) {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Summary'!A10:BZ24",
      valueRenderOption: 'UNFORMATTED_VALUE',
      majorDimension: 'ROWS',
    });
    return maintenanceRowsFromSummaryGrid(response.result.values || []);
  } catch {
    return [];
  }
}

async function availableBalanceFromLegacySummary(spreadsheetId) {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Summary'!A1:BL8",
    });
    return availableBalanceFromSummaryGrid(response.result.values || []);
  } catch {
    return null;
  }
}

async function flatsRowsFromLegacySummary(spreadsheetId) {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Summary'!A12:C23",
    });
    const byFlat = new Map();
    for (const row of response.result.values || []) {
      const flat = findFlatNumber(row);
      if (!FLATS.includes(flat)) continue;
      const name = String(row[0] === flat ? row[1] : row[2] ?? row[1] ?? '').trim();
      if (flat && name && !/^\d{3}$/.test(name)) byFlat.set(flat, name);
    }
    return FLATS.map((flat) => [flat, byFlat.get(flat) || '', '', '', '', '', '', 'Member']);
  } catch {
    return emptyFlatRows();
  }
}

async function upsertMaintenanceFromSummary(spreadsheetId, historyRows) {
  if (!historyRows.length) return;
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.MAINTENANCE}'!A2:D5000`,
  });
  const existing = new Map();
  (response.result.values || []).forEach((row, index) => {
    existing.set(`${row[0]}|${row[1]}`, { index, due: row[2], paid: row[3] });
  });
  const updates = [];
  const toAdd = [];
  for (const row of historyRows) {
    const found = existing.get(`${row[0]}|${row[1]}`);
    if (!found) {
      toAdd.push(row);
      continue;
    }
    if (Number(found.due) !== Number(row[2]) || Number(found.paid) !== Number(row[3])) {
      updates.push({
        range: `'${SHEET_NAMES.MAINTENANCE}'!C${found.index + 2}:D${found.index + 2}`,
        values: [[row[2], row[3]]],
      });
    }
  }
  if (updates.length) await writeValues(spreadsheetId, updates);
  if (toAdd.length) {
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.MAINTENANCE}'!A:K`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: toAdd },
    });
  }
}

async function appendMissingHistoryRows(spreadsheetId, title, existingRange, newRows, keyFn) {
  if (!newRows.length) return;
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: existingRange,
  });
  const existing = new Set((response.result.values || []).map(keyFn));
  const toAdd = newRows.filter((row) => !existing.has(keyFn(row)));
  if (!toAdd.length) return;
  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${title}'!A:K`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: toAdd },
  });
}

async function sheetIdByTitle(spreadsheetId, title) {
  const meta = await window.gapi.client.sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(sheetId,title)',
  });
  return (meta.result.sheets || []).find((sheet) => sheet.properties.title === title)?.properties.sheetId;
}

async function removeDuplicateImportedExpenses(spreadsheetId) {
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.EXPENSES}'!A2:K5000`,
  });
  const rows = response.result.values || [];
  const drop = leftoverDuplicateImportIndexes(rows);
  if (!drop.length) return;
  const sheetId = await sheetIdByTitle(spreadsheetId, SHEET_NAMES.EXPENSES);
  if (sheetId == null) return;
  await window.gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: drop.slice().sort((a, b) => b - a).map((index) => ({
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: index + 1, endIndex: index + 2 },
        },
      })),
    },
  });
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
  await gapiCall(window.gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  }));
}

/**
 * Fill Maintenance column K with Still Due formulas for every used row.
 */
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
 * Disabled: the society workbook is The Pride of Tirumala-APP in Drive.
 * Setup only connects and extends that file.
 */
export async function createSpreadsheet() {
  throw new Error(
    `Do not create a new spreadsheet. Put "${SHEET_FILE_NAME}" in Drive (Open with Google Sheets if it is still an .xlsx) and run Setup again.`,
  );
}

const LIVE_SUMMARY_RANGE = `'${SHEET_NAMES.LIVE_SUMMARY}'!A1:AZ33`;

export async function readLiveSummaryState(spreadsheetId) {
  const response = await gapiCallSafe(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: LIVE_SUMMARY_RANGE,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }), { result: { values: [] } });
  const rows = response.result.values || [];
  const opening = Number(rows[1]?.[1]);
  return {
    opening: Number.isFinite(opening) ? opening : 0,
    months: sortMonthLabels((rows[4] || []).slice(2)),
    version: String(rows[3]?.[0] || '').trim(),
    rows,
  };
}

async function readLiveSummarySampleFormulas(spreadsheetId) {
  const response = await gapiCallSafe(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.LIVE_SUMMARY}'!C6:AZ16`,
    valueRenderOption: 'FORMULA',
  }), { result: { values: [] } });
  return (response.result.values || []).flat();
}

async function dataMonthLabels(spreadsheetId) {
  const [maintenance, expenses] = await Promise.all([
    gapiCallSafe(window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.MAINTENANCE}'!A2:A5000`,
    }), { result: { values: [] } }),
    gapiCallSafe(window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.EXPENSES}'!C2:C5000`,
    }), { result: { values: [] } }),
  ]);
  return [
    ...(maintenance.result.values || []).map((row) => row[0]),
    ...(expenses.result.values || []).map((row) => row[0]),
  ];
}

export async function writeLiveSummaryTab(spreadsheetId, openingBalance, months) {
  await addSheetIfMissing(spreadsheetId, SHEET_NAMES.LIVE_SUMMARY);
  const monthList = Array.isArray(months) && months.length ? sortMonthLabels(months) : liveMonthHeaders();
  const { values, formulas } = liveSummaryStaticAndFormulaGrid(openingBalance, monthList);
  await gapiCallSafe(window.gapi.client.sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: LIVE_SUMMARY_RANGE,
  }), {});
  await gapiCall(window.gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SHEET_NAMES.LIVE_SUMMARY}'!A1`,
    valueInputOption: 'RAW',
    resource: { values },
  }));
  const formulaData = Object.entries(formulas).map(([cell, formula]) => ({
    range: `'${SHEET_NAMES.LIVE_SUMMARY}'!${cell}`,
    values: [[formula]],
  }));
  await writeFormulas(spreadsheetId, formulaData);
  const headerText = monthList.map((label, index) => ({
    range: `'${SHEET_NAMES.LIVE_SUMMARY}'!${columnLetter(2 + index)}5`,
    values: [[`'${label}`]],
  }));
  await writeFormulas(spreadsheetId, headerText);
  return monthList;
}

/** Rebuild Live Summary months and rewrite formulas when they still point at C$5 or lack the version stamp. */
export async function syncLiveSummaryMonths(spreadsheetId, { forceFormulas = false } = {}) {
  await addSheetIfMissing(spreadsheetId, SHEET_NAMES.LIVE_SUMMARY);
  const state = await readLiveSummaryState(spreadsheetId);
  const planned = plannedLiveMonths(await dataMonthLabels(spreadsheetId));
  const sampleFormulas = await readLiveSummarySampleFormulas(spreadsheetId);
  const stale = liveSummaryNeedsFormulaRepair(sampleFormulas, state.version);
  if (!forceFormulas && sameMonthList(state.months, planned) && planned.length && !stale) {
    return { months: planned, rewritten: false };
  }
  await writeLiveSummaryTab(spreadsheetId, state.opening, planned.length ? planned : state.months);
  await applyMaintenanceStillDueFormulas(spreadsheetId);
  await applyMonthlySummaryFormulas(spreadsheetId, planned);
  return { months: planned.length ? planned : state.months, rewritten: true };
}

export async function appendNextLiveMonthColumn(spreadsheetId) {
  const state = await readLiveSummaryState(spreadsheetId);
  const current = workingMonthLabels(state.months);
  const next = nextSequentialMonthLabel(current);
  const months = sortMonthLabels([...current, next]);
  await writeLiveSummaryTab(spreadsheetId, state.opening, months);
  await applyMaintenanceStillDueFormulas(spreadsheetId);
  await applyMonthlySummaryFormulas(spreadsheetId, months);
  return { month: next, months };
}

/**
 * Add app tabs to The Pride of Tirumala-APP. Never overwrites legacy history tabs
 * (Summary, Exp - Detailed, Borewell Exp, Motor repair oct, Notes) or existing rows.
 * liveWorkbook: Aug 2026+ file — skip history import from Summary / Exp-Detailed.
 */
export async function ensureSheetStructure(spreadsheetId = getSpreadsheetId(), { liveWorkbook = false } = {}) {
  return withAuth(async () => {
    if (!isValidSpreadsheetId(spreadsheetId)) return;
    const isLive = treatingAsLiveWorkbook(spreadsheetId, liveWorkbook);

    const legacy = new Set(LEGACY_SHEET_TABS);
    for (const title of Object.values(SHEET_NAMES)) {
      if (legacy.has(title)) continue;
      if (title === SHEET_NAMES.LIVE_SUMMARY && !isLive) continue;
      if (title === SHEET_NAMES.HANDOVER_SUMMARY && isLive) continue;
      await addSheetIfMissing(spreadsheetId, title);
      const headers = SHEET_HEADERS[title];
      if (!headers) continue;
      if (await sheetIsEmpty(spreadsheetId, title)) {
        const values = [headers];
        if (title === SHEET_NAMES.GUIDE) values.push(...GUIDE_ROWS);
        if (title === SHEET_NAMES.CONFIGURATION) values.push(...configRows());
        if (title === SHEET_NAMES.FLATS) {
          values.push(...(isLive ? emptyFlatRows() : await flatsRowsFromLegacySummary(spreadsheetId)));
        }
        if (title === SHEET_NAMES.HANDOVER_SUMMARY && !isLive) values.push(...handoverSummaryRows());
        if (title === SHEET_NAMES.PAYEES && !isLive) values.push(...HANDOVER_PAYEES);
        if (title === SHEET_NAMES.EMERGENCY_CONTACTS && !isLive) values.push(...HANDOVER_CONTACTS);
        if (title === SHEET_NAMES.SOCIETY_NOTES && !isLive) values.push(...HANDOVER_NOTES);
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${title}'!A1`,
          valueInputOption: 'RAW',
          resource: { values },
        });
      }
    }

    if (!isLive) {
      const expenseHistory = mergeHistoryExpenses(
        await expenseRowsFromLegacyDetailed(spreadsheetId),
        await expenseRowsFromLegacySummary(spreadsheetId),
      );
      await appendMissingHistoryRows(
        spreadsheetId,
        SHEET_NAMES.EXPENSES,
        `'${SHEET_NAMES.EXPENSES}'!A2:K5000`,
        expenseHistory,
        (row) => `${row[1]}|${Number(row[5])}|${String(row[3] || '').trim().toLowerCase()}`,
      );
      await removeDuplicateImportedExpenses(spreadsheetId);
      await syncCollectionsFromSummary(spreadsheetId, { force: true });
    }

    await upgradeWorkbookLayout(spreadsheetId);
    await ensureConfigKeys(spreadsheetId);
    const opening = isLive ? null : await availableBalanceFromLegacySummary(spreadsheetId);
    await migrateConfigValues(spreadsheetId, opening);
    if (isLive) {
      if (await sheetIsEmpty(spreadsheetId, SHEET_NAMES.LIVE_SUMMARY)) {
        await writeLiveSummaryTab(spreadsheetId, opening || 0);
      } else {
        await syncLiveSummaryMonths(spreadsheetId, { forceFormulas: true });
      }
    }
  });
}

/**
 * Copy collected amounts from the existing Summary grid into Maintenance,
 * then refresh Monthly Summary (the collection sheet) formulas.
 */
let lastCollectionSyncAt = 0;

export async function syncCollectionsFromSummary(spreadsheetId = getSpreadsheetId(), { force = false } = {}) {
  if (!isValidSpreadsheetId(spreadsheetId)) return { months: 0, rows: 0 };
  if (!force && lastCollectionSyncAt && Date.now() - lastCollectionSyncAt < 20000) {
    return { months: 0, rows: 0, skipped: true };
  }
  const history = await maintenanceRowsFromLegacySummary(spreadsheetId);
  await upsertMaintenanceFromSummary(spreadsheetId, history);
  const months = [...new Set(history.map((row) => row[0]).filter(Boolean))];
  await applyMaintenanceStillDueFormulas(spreadsheetId);
  await applyMonthlySummaryFormulas(spreadsheetId, months);
  await migrateConfigValues(spreadsheetId, await availableBalanceFromLegacySummary(spreadsheetId));
  lastCollectionSyncAt = Date.now();
  return { months: months.length, rows: history.length };
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
  if (missing.length) {
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.CONFIGURATION}'!A:C`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: missing },
    });
  }
}

async function migrateConfigValues(spreadsheetId, availableBalance = null) {
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.CONFIGURATION}'!A2:B100`,
  });
  const updates = [];
  (response.result.values || []).forEach((row, index) => {
    const key = row[0];
    const value = String(row[1] ?? '').trim();
    const cell = `'${SHEET_NAMES.CONFIGURATION}'!B${index + 2}`;
    if (key === 'DEFICIT_LAST_YEAR' && (value === '612' || value === '612.0')) {
      updates.push({ range: cell, values: [['0']] });
    }
    if (key === 'FISCAL_YEAR_START' && value === '2026-09') {
      updates.push({ range: cell, values: [['2020-11']] });
    }
    if (key === 'AVAILABLE_BALANCE' && Number.isFinite(availableBalance) && availableBalance > 0) {
      const current = Number(value);
      if (!Number.isFinite(current) || current !== availableBalance) {
        updates.push({ range: cell, values: [[String(availableBalance)]] });
      }
    }
  });
  const hasBalanceKey = (response.result.values || []).some((row) => row[0] === 'AVAILABLE_BALANCE');
  if (!hasBalanceKey && Number.isFinite(availableBalance) && availableBalance > 0) {
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.CONFIGURATION}'!A:C`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [['AVAILABLE_BALANCE', String(availableBalance), CONFIG_DESCRIPTIONS.AVAILABLE_BALANCE || '']],
      },
    });
  }
  if (updates.length) await writeValues(spreadsheetId, updates);
}

/** Disabled: never archive-and-replace The Pride of Tirumala-APP. */
export async function archiveAndCreateFresh() {
  throw new Error(
    `Do not create a replacement workbook. Use Settings → Backups to copy "${SHEET_FILE_NAME}", then Refresh sheet layout to add missing app tabs.`,
  );
}

/**
 * Fill live tabs on the EXISTING society workbook with pretend data.
 * Does not create a new spreadsheet. Leaves Access Control and Audit Log alone.
 */
export async function seedSampleLiveData() {
  throw new Error('Sample data was removed after the 29 Aug 2026 handover. Use the Handover Summary tab for history.');
}

export { getSpreadsheetId, columnLetter };
