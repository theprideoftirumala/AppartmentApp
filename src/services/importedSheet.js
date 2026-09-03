/**
 * Read-only import of a manually kept I&E Google Sheet from Drive.
 * Never binds that file as APP or LIVE. Never writes to it.
 */

import { EXCEL_SHEET_MIME, GOOGLE_SHEET_MIME, isGoogleSpreadsheetMime } from '../config/constants';
import { ensureValidToken } from './googleAuth';
import { gapiCall, gapiCallSafe } from '../utils/gapi';
import { escapeDriveQuery, isValidSpreadsheetId } from '../utils/helpers';
import { buildImportedWorkbookView, spreadsheetIdFromInput } from '../utils/importedIandE';

const SNAPSHOT_KEY = 'tpt_imported_sheet_snapshot';

async function withAuth(fn) {
  await ensureValidToken();
  return fn();
}

export function getImportedSnapshot() {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearImportedSnapshot() {
  sessionStorage.removeItem(SNAPSHOT_KEY);
}

function saveImportedSnapshot(view) {
  sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(view));
  return view;
}

export async function listBrowsableSpreadsheets(search = '') {
  return withAuth(async () => {
    const text = escapeDriveQuery(String(search || '').trim());
    const mime = `mimeType='${GOOGLE_SHEET_MIME}'`;
    const name = text ? ` and name contains '${text}'` : '';
    const response = await gapiCall(window.gapi.client.drive.files.list({
      q: `${mime} and trashed=false${name}`,
      fields: 'files(id,name,modifiedTime,mimeType)',
      spaces: 'drive',
      corpora: 'user',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 30,
      orderBy: 'modifiedTime desc',
    }));
    return response.result.files || [];
  });
}

async function readTabGrid(spreadsheetId, title) {
  const response = await gapiCallSafe(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!A1:BZ80`,
    valueRenderOption: 'FORMATTED_VALUE',
  }), { result: { values: [] } });
  return response.result.values || [];
}

async function readDetailedGrid(spreadsheetId) {
  const titles = ['Exp - Detailed', 'Exp-Detailed', 'Exp Detailed'];
  for (const title of titles) {
    const grid = await readTabGrid(spreadsheetId, title);
    if (grid.length) return grid;
  }
  return [];
}

export async function importWorkbookReadOnly(input) {
  return withAuth(async () => {
    const spreadsheetId = spreadsheetIdFromInput(input);
    if (!isValidSpreadsheetId(spreadsheetId)) {
      throw new Error('Choose a Google Sheet or paste a valid spreadsheet link.');
    }
    const meta = await gapiCallSafe(window.gapi.client.drive.files.get({
      fileId: spreadsheetId,
      fields: 'id,name,modifiedTime,mimeType',
      supportsAllDrives: true,
    }), { result: null });
    const file = meta.result;
    if (file?.mimeType && file.mimeType === EXCEL_SHEET_MIME) {
      throw new Error('This is still an Excel file. In Drive: Open with Google Sheets, then browse again. This page only reads.');
    }
    if (file?.mimeType && !isGoogleSpreadsheetMime(file.mimeType)) {
      throw new Error('Pick a Google Sheet. This import is read-only and does not change APP or LIVE.');
    }
    const [summaryGrid, detailedGrid] = await Promise.all([
      readTabGrid(spreadsheetId, 'Summary'),
      readDetailedGrid(spreadsheetId),
    ]);
    if (!summaryGrid.length && !detailedGrid.length) {
      throw new Error('That file has no Summary or Exp - Detailed tab, or this Google account cannot read it.');
    }
    const view = buildImportedWorkbookView({
      fileName: file?.name || 'Imported I&E sheet',
      fileId: spreadsheetId,
      modifiedTime: file?.modifiedTime || '',
      summaryGrid,
      detailedGrid,
    });
    return saveImportedSnapshot(view);
  });
}

export { SNAPSHOT_KEY };
