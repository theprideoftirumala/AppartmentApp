/**
 * Create and seed The Pride of Tirumala-LIVE (Sep 2026+).
 * Does not replace The Pride of Tirumala-APP. Founding owner only.
 */

import { LIVE_SHEET_FILE_NAME, SHEET_NAMES, STORAGE_KEYS } from '../config/constants';
import { canCreateLiveWorkbook, DRIVE_ROLE_BY_APP_ROLE, isFoundingOwner } from '../config/accessPolicy';
import { ensureValidToken, getCurrentUser } from './googleAuth';
import { gapiCall } from '../utils/gapi';
import { bindLiveSpreadsheet, isValidSpreadsheetId, normalizeEmail } from '../utils/helpers';
import { availableBalanceFromSummaryGrid } from '../utils/legacySheetImport';
import { ensureSheetStructure, writeLiveSummaryTab } from './sheetSetup';
import { createBackup, findLiveWorkbook, getRootFolderId, setupFolderStructure, shareFile } from './googleDrive';

async function withAuth(fn) {
  await ensureValidToken();
  return fn();
}

async function copyA1(fromId, toId, a1) {
  const response = await gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: fromId,
    range: a1,
  })).catch(() => ({ result: { values: [] } }));
  const values = response.result.values || [];
  if (!values.length) return;
  await gapiCall(window.gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: toId,
    range: a1,
    valueInputOption: 'RAW',
    resource: { values },
  }));
}

async function shareLiveFromHistoryAcl(historyId, liveId) {
  const response = await gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: historyId,
    range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A2:F50`,
  })).catch(() => ({ result: { values: [] } }));
  for (const row of response.result.values || []) {
    const email = normalizeEmail(row[0]);
    const role = row[1] || 'Reader';
    const status = row[5] || 'Active';
    if (!email || status !== 'Active' || isFoundingOwner(email)) continue;
    const driveRole = DRIVE_ROLE_BY_APP_ROLE[role] === 'writer' ? 'writer' : 'reader';
    await shareFile(liveId, email, driveRole).catch(() => {});
  }
}

async function openingFromHistory(historyId) {
  const response = await gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: historyId,
    range: "'Summary'!A1:BL8",
  })).catch(() => ({ result: { values: [] } }));
  return availableBalanceFromSummaryGrid(response.result.values || []) || 0;
}

async function moveToAppFolder(fileId) {
  let rootId = getRootFolderId();
  if (!rootId) {
    const folders = await setupFolderStructure();
    rootId = folders.rootId;
  }
  if (!rootId) return;
  const meta = await gapiCall(window.gapi.client.drive.files.get({
    fileId,
    fields: 'parents',
    supportsAllDrives: true,
  }));
  const previous = (meta.result.parents || []).join(',');
  await gapiCall(window.gapi.client.drive.files.update({
    fileId,
    addParents: rootId,
    removeParents: previous,
    supportsAllDrives: true,
    fields: 'id',
  })).catch(() => {});
}

/**
 * Find or create The Pride of Tirumala-LIVE, copy structure from the APP file,
 * write Live Summary formulas. History months stay on the APP file.
 */
export async function createOrConnectLiveWorkbook() {
  return withAuth(async () => {
    const user = getCurrentUser();
    if (!canCreateLiveWorkbook(user?.email)) {
      throw new Error('Only the founding owner can create The Pride of Tirumala-LIVE.');
    }
    const historyId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
    if (!isValidSpreadsheetId(historyId)) {
      throw new Error('Connect The Pride of Tirumala-APP first, then create the live books.');
    }

    const existing = await findLiveWorkbook(user.email);
    if (existing?.id && isValidSpreadsheetId(existing.id)) {
      bindLiveSpreadsheet(existing.id);
      await ensureSheetStructure(existing.id, { liveWorkbook: true });
      await shareLiveFromHistoryAcl(historyId, existing.id);
      await createBackup(existing.id, { reason: 'live-refresh', fileLabel: LIVE_SHEET_FILE_NAME }).catch(() => {});
      return { id: existing.id, created: false };
    }

    await createBackup(historyId, { reason: 'pre-live' }).catch(() => {});

    const created = await gapiCall(window.gapi.client.sheets.spreadsheets.create({
      resource: { properties: { title: LIVE_SHEET_FILE_NAME } },
      fields: 'spreadsheetId',
    }));
    const liveId = created.result.spreadsheetId;
    if (!isValidSpreadsheetId(liveId)) throw new Error('Google did not return a live spreadsheet id.');

    await moveToAppFolder(liveId);
    await ensureSheetStructure(liveId, { liveWorkbook: true });

    await copyA1(historyId, liveId, `'${SHEET_NAMES.CONFIGURATION}'!A1:C100`);
    await copyA1(historyId, liveId, `'${SHEET_NAMES.FLATS}'!A1:H20`);
    await copyA1(historyId, liveId, `'${SHEET_NAMES.PAYEES}'!A1:G80`);
    await copyA1(historyId, liveId, `'${SHEET_NAMES.ACCESS_CONTROL}'!A1:F40`);
    await copyA1(historyId, liveId, `'${SHEET_NAMES.EMERGENCY_CONTACTS}'!A1:H80`);
    await copyA1(historyId, liveId, `'${SHEET_NAMES.REMINDERS}'!A1:J80`);
    await copyA1(historyId, liveId, `'${SHEET_NAMES.WATCHMAN_DETAILS}'!A1:N20`);

    const opening = await openingFromHistory(historyId);
    await writeLiveSummaryTab(liveId, opening);

    bindLiveSpreadsheet(liveId);
    await shareLiveFromHistoryAcl(historyId, liveId);
    await createBackup(liveId, { reason: 'live-create' }).catch(() => {});
    return { id: liveId, created: true, opening };
  });
}
