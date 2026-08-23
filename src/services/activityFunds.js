/**
 * Optional activity funds (Ganesh, new motor, etc.).
 * One dedicated Google Spreadsheet per activity, reused by name.
 * A registry tab on the society workbook lists them so anyone can open later.
 */

import {
  ACTIVITY_FILE_PREFIX,
  ACTIVITY_TAB_HEADERS,
  ACTIVITY_TABS,
  FLATS,
  SHEET_NAMES,
  STORAGE_KEYS,
} from '../config/constants';
import { canWriteFinancialData, DRIVE_ROLE_BY_APP_ROLE, effectiveAppRole } from '../config/accessPolicy';
import { activityFileName, normalizeActivityName } from '../utils/activityName';
import { pickCanonicalActivityFile, registryRowsToDrop } from '../utils/activityDedupe';
import { duplicateExpenseMessage, firstDuplicateExpense } from '../utils/expenseDuplicate';
import { gapiCall } from '../utils/gapi';
import { escapeDriveQuery, isValidSpreadsheetId, sheetNumber, sheetText } from '../utils/helpers';
import { getCurrentUser, ensureValidToken } from './googleAuth';
import { getActivityFolder, shareFile } from './googleDrive';
import { getAccessControl } from './googleSheets';

function societyId() {
  const id = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  return isValidSpreadsheetId(id) ? id : null;
}

async function withOwnerWrite(fn) {
  await ensureValidToken();
  await requireOwner();
  return fn();
}

async function requireOwner() {
  const user = getCurrentUser();
  if (!user?.email) throw new Error('Not authenticated');
  const acl = await getAccessControl();
  const entry = acl.find((row) => String(row.email).toLowerCase() === String(user.email).toLowerCase() && row.status === 'Active');
  const role = effectiveAppRole(user.email, entry);
  if (!canWriteFinancialData(user.email, role)) {
    throw new Error('Only an Owner can start or change an activity fund.');
  }
  return { user, acl, role };
}

function parseRegistryRow(row) {
  return {
    id: row[0] || '',
    name: row[1] || '',
    spreadsheetId: row[2] || '',
    status: row[3] || 'Open',
    created: row[4] || '',
    createdBy: row[5] || '',
    target: Number(row[6]) || 0,
    notes: row[7] || '',
  };
}

export async function listActivityFunds() {
  await ensureValidToken();
  const spreadsheetId = societyId();
  if (!spreadsheetId) return [];
  const response = await gapiCall(window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_NAMES.ACTIVITY_FUNDS}'!A2:H200`,
  })).catch(() => ({ result: { values: [] } }));
  return (response.result.values || []).filter((row) => row[0]).map(parseRegistryRow);
}

async function upsertRegistry(activity) {
  const spreadsheetId = societyId();
  const existing = await listActivityFunds();
  const index = existing.findIndex((row) => row.id === activity.id);
  const values = [[
    activity.id,
    sheetText(activity.name, 80),
    activity.spreadsheetId,
    activity.status || 'Open',
    activity.created,
    sheetText(activity.createdBy, 80),
    sheetNumber(activity.target),
    sheetText(activity.notes, 200),
  ]];
  if (index >= 0) {
    await gapiCall(window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_NAMES.ACTIVITY_FUNDS}'!A${index + 2}`,
      valueInputOption: 'RAW',
      resource: { values },
    }));
    return;
  }
  await gapiCall(window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${SHEET_NAMES.ACTIVITY_FUNDS}'!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values },
  }));
}

async function listWorkbooksByName(fileName, folderId) {
  const safe = escapeDriveQuery(fileName);
  const response = await gapiCall(window.gapi.client.drive.files.list({
    q: `name='${safe}' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id, name, createdTime)',
    pageSize: 25,
    orderBy: 'createdTime',
    supportsAllDrives: true,
  })).catch(() => ({ result: { files: [] } }));
  return response.result.files || [];
}

async function listActivityWorkbooks(folderId) {
  const prefix = escapeDriveQuery(ACTIVITY_FILE_PREFIX);
  const response = await gapiCall(window.gapi.client.drive.files.list({
    q: `name contains '${prefix}' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id, name, createdTime)',
    pageSize: 50,
    orderBy: 'createdTime',
    supportsAllDrives: true,
  })).catch(() => ({ result: { files: [] } }));
  return response.result.files || [];
}

async function trashDriveFile(fileId) {
  if (!isValidSpreadsheetId(fileId)) return;
  await gapiCall(window.gapi.client.drive.files.update({
    fileId,
    resource: { trashed: true },
    supportsAllDrives: true,
  }));
}

async function trashDuplicateWorkbooks(files, keepId) {
  const extras = files.filter((file) => file.id !== keepId);
  for (const file of extras) {
    await trashDriveFile(file.id).catch(() => {});
  }
  return extras.length;
}

async function getTabSheetId(spreadsheetId, title) {
  const meta = await gapiCall(window.gapi.client.sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  }));
  const sheet = (meta.result.sheets || []).find((row) => row.properties.title === title);
  return sheet?.properties?.sheetId;
}

async function deleteRegistryRows(indexes) {
  if (!indexes.length) return;
  const spreadsheetId = societyId();
  const sheetId = await getTabSheetId(spreadsheetId, SHEET_NAMES.ACTIVITY_FUNDS);
  if (sheetId == null) return;
  const requests = [...indexes]
    .sort((a, b) => b - a)
    .map((index) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: index + 1,
          endIndex: index + 2,
        },
      },
    }));
  await gapiCall(window.gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests },
  }));
}

/**
 * Keep one Drive file and one registry row per activity name. Extra copies go to trash.
 */
export async function dedupeActivityFunds() {
  await ensureValidToken();
  const folderId = await getActivityFolder();
  const [files, existing] = await Promise.all([listActivityWorkbooks(folderId), listActivityFunds()]);
  const byName = new Map();
  files.forEach((file) => {
    const key = file.name;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(file);
  });

  const keepIds = new Set();
  for (const [fileName, group] of byName) {
    const registry = existing.find((row) => activityFileName(row.name) === fileName);
    const keep = pickCanonicalActivityFile(group, registry?.spreadsheetId);
    if (!keep) continue;
    keepIds.add(keep.id);
    if (group.length > 1) await trashDuplicateWorkbooks(group, keep.id);
    if (registry && registry.spreadsheetId !== keep.id) {
      await upsertRegistry({ ...registry, spreadsheetId: keep.id });
    }
  }

  const latest = await listActivityFunds();
  const drop = registryRowsToDrop(latest, keepIds);
  await deleteRegistryRows(drop);
  return listActivityFunds();
}

async function createActivityWorkbook(name, target, notes, optedFlats, flats) {
  const fileName = activityFileName(name);
  const tabNames = Object.values(ACTIVITY_TABS);
  const created = await gapiCall(window.gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: { title: fileName },
      sheets: tabNames.map((title, index) => ({
        properties: { sheetId: index, title, index, gridProperties: { frozenRowCount: 1 } },
      })),
    },
  }));
  const spreadsheetId = created.result.spreadsheetId;
  const folderId = await getActivityFolder();
  await gapiCall(window.gapi.client.drive.files.update({
    fileId: spreadsheetId,
    addParents: folderId,
    fields: 'id, parents',
  })).catch(() => {});

  const memberRows = FLATS.map((flat) => {
    const info = flats.find((row) => String(row.flat) === flat) || {};
    const opted = optedFlats.includes(flat) ? 'Y' : 'N';
    return [flat, info.ownerName || '', opted, opted === 'Y' ? sheetNumber(target) : '0', '0', '', '', ''];
  });

  await gapiCall(window.gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'${ACTIVITY_TABS.GUIDE}'!A1`, values: [ACTIVITY_TAB_HEADERS[ACTIVITY_TABS.GUIDE], ['What this is', 'Optional collection for one named activity. Not every flat has to join.', 'Reuse this file if the same activity runs again.']] },
        { range: `'${ACTIVITY_TABS.CONFIGURATION}'!A1`, values: [ACTIVITY_TAB_HEADERS[ACTIVITY_TABS.CONFIGURATION], ['NAME', name, 'Configurable display name'], ['TARGET', sheetNumber(target), 'Suggested amount per opted-in flat'], ['STATUS', 'Open', 'Open or Closed'], ['NOTES', notes, '']] },
        { range: `'${ACTIVITY_TABS.MEMBERS}'!A1`, values: [ACTIVITY_TAB_HEADERS[ACTIVITY_TABS.MEMBERS], ...memberRows] },
        { range: `'${ACTIVITY_TABS.EXPENSES}'!A1`, values: [ACTIVITY_TAB_HEADERS[ACTIVITY_TABS.EXPENSES]] },
        { range: `'${ACTIVITY_TABS.SUMMARY}'!A1`, values: [
          ACTIVITY_TAB_HEADERS[ACTIVITY_TABS.SUMMARY],
          ['Collected', `=SUM('${ACTIVITY_TABS.MEMBERS}'!E:E)`, 'Sum of Amount Paid'],
          ['Spent', `=SUM('${ACTIVITY_TABS.EXPENSES}'!C:C)`, 'Sum of expenses'],
          ['Balance', '=B2-B3', 'Collected minus spent'],
        ] },
      ],
    },
  }));

  return spreadsheetId;
}

async function shareWithSociety(spreadsheetId, acl) {
  for (const row of acl) {
    if (row.status !== 'Active' || !row.email) continue;
    const driveRole = DRIVE_ROLE_BY_APP_ROLE[row.role] || 'reader';
    await shareFile(spreadsheetId, row.email, driveRole).catch(() => {});
  }
}

export async function startActivityFund({ name, target = 0, notes = '', optedFlats = [], flats = [] }) {
  return withOwnerWrite(async () => {
    const { user, acl } = await requireOwner();
    const displayName = normalizeActivityName(name);
    if (!displayName) throw new Error('Give this activity a name.');

    await dedupeActivityFunds().catch(() => []);
    const existing = await listActivityFunds();
    const sameName = existing.find((row) => normalizeActivityName(row.name).toLowerCase() === displayName.toLowerCase());

    const folderId = await getActivityFolder();
    const files = await listWorkbooksByName(activityFileName(displayName), folderId);
    const keep = pickCanonicalActivityFile(files, sameName?.spreadsheetId);
    if (files.length > 1 && keep) await trashDuplicateWorkbooks(files, keep.id);

    if (sameName?.spreadsheetId || keep?.id) {
      const spreadsheetId = keep?.id || sameName.spreadsheetId;
      const activity = {
        ...sameName,
        id: sameName?.id || `${ACTIVITY_FILE_PREFIX}${Date.now()}`,
        name: displayName,
        spreadsheetId,
        status: 'Open',
        created: sameName?.created || new Date().toISOString().slice(0, 10),
        createdBy: sameName?.createdBy || user.email,
        target: Number(target) || sameName?.target || 0,
        notes: notes || sameName?.notes || '',
      };
      await upsertRegistry(activity);
      return activity;
    }

    const spreadsheetId = await createActivityWorkbook(displayName, target, notes, optedFlats, flats);
    await shareWithSociety(spreadsheetId, acl);

    const activity = {
      id: `${ACTIVITY_FILE_PREFIX}${Date.now()}`,
      name: displayName,
      spreadsheetId,
      status: 'Open',
      created: new Date().toISOString().slice(0, 10),
      createdBy: user.email,
      target: Number(target) || 0,
      notes,
    };
    await upsertRegistry(activity);
    return activity;
  });
}

export async function getActivityDetail(spreadsheetId) {
  await ensureValidToken();
  const response = await gapiCall(window.gapi.client.sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [
      `'${ACTIVITY_TABS.CONFIGURATION}'!A2:B20`,
      `'${ACTIVITY_TABS.MEMBERS}'!A2:H50`,
      `'${ACTIVITY_TABS.EXPENSES}'!A2:F200`,
      `'${ACTIVITY_TABS.SUMMARY}'!A2:B10`,
    ],
    valueRenderOption: 'UNFORMATTED_VALUE',
  }));
  const ranges = response.result.valueRanges || [];
  const config = {};
  (ranges[0]?.values || []).forEach(([key, value]) => {
    if (key) config[key] = value;
  });
  const members = (ranges[1]?.values || []).filter((row) => row[0]).map((row) => ({
    flat: row[0],
    name: row[1] || '',
    optedIn: String(row[2] || 'N').toUpperCase() === 'Y',
    amountDue: Number(row[3]) || 0,
    amountPaid: Number(row[4]) || 0,
    paymentDate: row[5] || '',
    paymentMode: row[6] || '',
    remarks: row[7] || '',
  }));
  const expenses = (ranges[2]?.values || []).filter((row) => row[0] || row[1]).map((row) => ({
    date: row[0] || '',
    description: row[1] || '',
    amount: Number(row[2]) || 0,
    paidBy: row[3] || '',
    paymentMode: row[4] || '',
    remarks: row[5] || '',
  }));
  const collected = Number(ranges[3]?.values?.[0]?.[1]) || members.reduce((sum, row) => sum + row.amountPaid, 0);
  const spent = Number(ranges[3]?.values?.[1]?.[1]) || expenses.reduce((sum, row) => sum + row.amount, 0);
  return {
    config,
    members,
    expenses,
    collected,
    spent,
    balance: collected - spent,
  };
}

export async function saveActivityMembers(spreadsheetId, members) {
  return withOwnerWrite(async () => {
    const values = members.map((row) => [
      row.flat,
      sheetText(row.name, 60),
      row.optedIn ? 'Y' : 'N',
      sheetNumber(row.amountDue),
      sheetNumber(row.amountPaid),
      sheetText(row.paymentDate, 20),
      sheetText(row.paymentMode, 20),
      sheetText(row.remarks, 120),
    ]);
    await gapiCall(window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${ACTIVITY_TABS.MEMBERS}'!A2:H50`,
      valueInputOption: 'RAW',
      resource: { values },
    }));
  });
}

export async function addActivityExpense(spreadsheetId, expense) {
  return withOwnerWrite(async () => {
    const detail = await getActivityDetail(spreadsheetId);
    const duplicate = firstDuplicateExpense([expense], detail.expenses);
    if (duplicate) {
      throw new Error(duplicateExpenseMessage(duplicate));
    }
    await gapiCall(window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${ACTIVITY_TABS.EXPENSES}'!A:F`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          sheetText(expense.date, 20),
          sheetText(expense.description, 120),
          sheetNumber(expense.amount),
          sheetText(expense.paidBy, 60),
          sheetText(expense.paymentMode, 20),
          sheetText(expense.remarks, 120),
        ]],
      },
    }));
  });
}

export async function closeActivityFund(activity) {
  return withOwnerWrite(async () => {
    await upsertRegistry({ ...activity, status: 'Closed' });
    await gapiCall(window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: activity.spreadsheetId,
      range: `'${ACTIVITY_TABS.CONFIGURATION}'!B4`,
      valueInputOption: 'RAW',
      resource: { values: [['Closed']] },
    })).catch(() => {});
  });
}
