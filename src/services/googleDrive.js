/**
 * Google Drive Service
 * Handles folder creation, file uploads, backups, and sharing
 */

import { DRIVE_ROOT_FOLDER, DRIVE_EXPENSES_FOLDER, DRIVE_BACKUPS_FOLDER, STORAGE_KEYS, SHEET_FILE_NAME } from '../config/constants';
import { FOUNDING_OWNER_EMAIL, isFoundingOwner } from '../config/accessPolicy';
import { ensureValidToken, getCurrentUser } from './googleAuth';
import { escapeDriveQuery, isAllowedReceiptFile, isValidSpreadsheetId, normalizeEmail } from '../utils/helpers';

/**
 * Wrapper to ensure auth before any API call
 */
async function withAuth(fn) {
  await ensureValidToken();
  return fn();
}

/**
 * Get the root folder ID from localStorage
 */
function getRootFolderId() {
  return localStorage.getItem(STORAGE_KEYS.ROOT_FOLDER_ID);
}

// ═══════════════════════════════════════════════════════════════
// SPREADSHEET DISCOVERY
// ═══════════════════════════════════════════════════════════════

const TRACKER_FILE_FIELDS = 'id, name, webViewLink, owners(emailAddress), shared, capabilities(canEdit)';

/**
 * Optional published ID (GitHub Pages / public/sheet-config.json).
 * Lets members open the society workbook even if Drive search misses it.
 */
export async function loadPublishedSpreadsheetId() {
  try {
    const url = `${import.meta.env.BASE_URL}sheet-config.json`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return isValidSpreadsheetId(data?.spreadsheetId) ? data.spreadsheetId : null;
  } catch {
    return null;
  }
}

function ownerEmails(file) {
  return (file?.owners || []).map((o) => normalizeEmail(o.emailAddress)).filter(Boolean);
}

/**
 * SECURITY: A workbook this Google account created privately is NOT the
 * society source of truth. Members used to become "Owner" of their own copy.
 */
export function isPrivateCopyOwnedByUser(file, email) {
  if (!file || !email) return false;
  const mine = ownerEmails(file);
  const me = normalizeEmail(email);
  if (!mine.includes(me)) return false;
  if (mine.includes(normalizeEmail(FOUNDING_OWNER_EMAIL))) return false;
  return true;
}

/**
 * Accept only the society tracker: published ID, founding-owner file,
 * or a file shared with a member — never a stray personal copy.
 */
export function isSocietyWorkbook(file, email) {
  if (!file?.id || file.name !== SHEET_FILE_NAME) return false;
  if (isFoundingOwner(email)) return true;
  if (isPrivateCopyOwnedByUser(file, email)) return false;
  const owners = ownerEmails(file);
  return owners.includes(normalizeEmail(FOUNDING_OWNER_EMAIL)) || file.shared === true;
}

async function listTrackerFiles(extraQuery) {
  const safeName = escapeDriveQuery(SHEET_FILE_NAME);
  let query = `name='${safeName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  if (extraQuery) query += ` and ${extraQuery}`;
  const response = await window.gapi.client.drive.files.list({
    q: query,
    fields: `files(${TRACKER_FILE_FIELDS})`,
    spaces: 'drive',
    corpora: 'user',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 10,
    orderBy: 'modifiedTime desc',
  });
  return response.result.files || [];
}

export async function getSpreadsheetFileMeta(fileId) {
  if (!isValidSpreadsheetId(fileId)) return null;
  try {
    const response = await window.gapi.client.drive.files.get({
      fileId,
      fields: TRACKER_FILE_FIELDS,
      supportsAllDrives: true,
    });
    return response.result || null;
  } catch {
    return null;
  }
}

/**
 * Find the one society spreadsheet this account is allowed to use.
 * Founding owner: owned tracker (or published ID).
 * Everyone else: shared-with-me / founding-owned only — never create a second copy.
 */
export async function findSocietySpreadsheet(email) {
  return withAuth(async () => {
    const published = await loadPublishedSpreadsheetId();
    if (published) {
      const meta = await getSpreadsheetFileMeta(published);
      // Published ID is the society workbook. Reject only a private copy this user owns.
      if (meta && !isPrivateCopyOwnedByUser(meta, email)) return meta;
    }

    if (isFoundingOwner(email)) {
      const owned = await listTrackerFiles("'me' in owners");
      const exact = owned.find((f) => f.name === SHEET_FILE_NAME);
      if (exact) return exact;
    }

    // Members (and founder fallback): files shared with this account.
    const shared = await listTrackerFiles('sharedWithMe=true');
    const society = shared.find((f) => isSocietyWorkbook(f, email));
    if (society) return society;

    if (isFoundingOwner(email)) {
      const any = await listTrackerFiles('');
      return any.find((f) => f.name === SHEET_FILE_NAME) || null;
    }

    return null;
  });
}

/** @deprecated Use findSocietySpreadsheet — kept so older callers keep compiling. */
export async function findExistingSpreadsheet(name = SHEET_FILE_NAME) {
  const user = getCurrentUser();
  const found = await findSocietySpreadsheet(user?.email);
  if (found && (!name || found.name === name || name === SHEET_FILE_NAME)) return found;
  return found;
}

// ═══════════════════════════════════════════════════════════════
// FOLDER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a folder in Google Drive
 * @param {string} name - Folder name
 * @param {string} parentId - Parent folder ID (optional)
 * @returns {string} Created folder ID
 */
export async function createFolder(name, parentId = null) {
  return withAuth(async () => {
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const response = await window.gapi.client.drive.files.create({
      resource: metadata,
      fields: 'id',
    });

    return response.result.id;
  });
}

/**
 * Find a folder by name under a parent
 */
export async function findFolder(name, parentId = null) {
  return withAuth(async () => {
    let query = `name='${escapeDriveQuery(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${escapeDriveQuery(parentId)}' in parents`;
    }

    const response = await window.gapi.client.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = response.result.files || [];
    return files.length > 0 ? files[0].id : null;
  });
}

/**
 * Set up the complete folder structure
 * TPT-AppartmentApp/
 *   ├── expenses-evidence/
 *   └── backups/
 */
export async function setupFolderStructure() {
  return withAuth(async () => {
    // Check if root folder already exists
    let rootId = await findFolder(DRIVE_ROOT_FOLDER);
    if (!rootId) {
      rootId = await createFolder(DRIVE_ROOT_FOLDER);
    }

    // Create subfolders
    let expensesId = await findFolder(DRIVE_EXPENSES_FOLDER, rootId);
    if (!expensesId) {
      expensesId = await createFolder(DRIVE_EXPENSES_FOLDER, rootId);
    }

    let backupsId = await findFolder(DRIVE_BACKUPS_FOLDER, rootId);
    if (!backupsId) {
      backupsId = await createFolder(DRIVE_BACKUPS_FOLDER, rootId);
    }

    // Save root folder ID
    localStorage.setItem(STORAGE_KEYS.ROOT_FOLDER_ID, rootId);

    return { rootId, expensesId, backupsId };
  });
}

/**
 * Get or create a monthly subfolder under expenses-evidence
 * e.g., expenses-evidence/2026-09/
 */
export async function getMonthlyFolder(yearMonth) {
  return withAuth(async () => {
    const rootId = getRootFolderId();
    if (!rootId) throw new Error('Root folder not set up');

    const expensesId = await findFolder(DRIVE_EXPENSES_FOLDER, rootId);
    if (!expensesId) throw new Error('Expenses folder not found');

    let monthlyId = await findFolder(yearMonth, expensesId);
    if (!monthlyId) {
      monthlyId = await createFolder(yearMonth, expensesId);
    }

    return monthlyId;
  });
}

// ═══════════════════════════════════════════════════════════════
// FILE UPLOADS
// ═══════════════════════════════════════════════════════════════

/**
 * Upload a file to Google Drive
 * @param {File} file - File object from input
 * @param {string} folderId - Target folder ID
 * @param {string} customName - Custom file name (optional)
 * @returns {object} { id, name, webViewLink }
 */
export async function uploadFile(file, folderId, customName = null) {
  return withAuth(async () => {
    if (!isAllowedReceiptFile(file)) {
      throw new Error('Only images or PDFs up to 5 MB can be uploaded.');
    }
    const metadata = {
      name: customName || file.name,
      parents: [folderId],
    };

    // Use multipart upload for files < 5MB
    const boundary = '-------TPTUploadBoundary';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelimiter = '\r\n--' + boundary + '--';

    const reader = new FileReader();
    const fileContent = await new Promise((resolve) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsArrayBuffer(file);
    });

    // Convert ArrayBuffer to base64
    const base64Data = btoa(
      new Uint8Array(fileContent).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + file.type + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      closeDelimiter;

    const response = await window.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: {
        uploadType: 'multipart',
        fields: 'id, name, webViewLink, webContentLink',
      },
      headers: {
        'Content-Type': 'multipart/related; boundary=' + boundary,
      },
      body: multipartBody,
    });

    return {
      id: response.result.id,
      name: response.result.name,
      webViewLink: response.result.webViewLink,
      webContentLink: response.result.webContentLink,
    };
  });
}

/**
 * Upload an expense receipt to the correct monthly folder
 */
export async function uploadReceipt(file, yearMonth) {
  const folderId = await getMonthlyFolder(yearMonth);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = file.name.split('.').pop();
  const customName = `receipt_${timestamp}.${ext}`;
  return uploadFile(file, folderId, customName);
}

// ═══════════════════════════════════════════════════════════════
// BACKUPS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a backup of the spreadsheet
 * @returns {object} { id, name }
 */
export async function createBackup() {
  return withAuth(async () => {
    const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
    const rootId = getRootFolderId();
    if (!isValidSpreadsheetId(spreadsheetId) || !rootId) throw new Error('Setup not complete');

    const backupsId = await findFolder(DRIVE_BACKUPS_FOLDER, rootId);
    if (!backupsId) throw new Error('Backups folder not found');

    const now = new Date();
    const timestamp = now.toISOString()
      .replace('T', '_')
      .replace(/[:.]/g, '')
      .slice(0, 15);
    const backupName = `TPT-MaintenanceTracker_${timestamp}`;

    const response = await window.gapi.client.drive.files.copy({
      fileId: spreadsheetId,
      resource: {
        name: backupName,
        parents: [backupsId],
      },
      fields: 'id, name, createdTime',
    });

    return {
      id: response.result.id,
      name: response.result.name,
      createdTime: response.result.createdTime,
    };
  });
}

/**
 * List all backups
 */
export async function listBackups() {
  return withAuth(async () => {
    const rootId = getRootFolderId();
    if (!rootId) return [];

    const backupsId = await findFolder(DRIVE_BACKUPS_FOLDER, rootId);
    if (!backupsId) return [];

    const response = await window.gapi.client.drive.files.list({
      q: `'${backupsId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime, size)',
      orderBy: 'createdTime desc',
      pageSize: 50,
    });

    return response.result.files || [];
  });
}

// ═══════════════════════════════════════════════════════════════
// SHARING / PERMISSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create or update a Drive permission. Readers get view-only; Owners get writer.
 * Drive file ACL is the real write barrier — keep it in sync with app role.
 */
async function setFilePermission(fileId, email, role) {
  const address = normalizeEmail(email);
  const list = await window.gapi.client.drive.permissions.list({
    fileId,
    fields: 'permissions(id, emailAddress, role)',
    supportsAllDrives: true,
  });
  const existing = (list.result.permissions || []).find(
    (p) => normalizeEmail(p.emailAddress) === address,
  );
  if (existing) {
    if (existing.role === role) return;
    await window.gapi.client.drive.permissions.update({
      fileId,
      permissionId: existing.id,
      resource: { role },
      supportsAllDrives: true,
    });
    return;
  }
  await window.gapi.client.drive.permissions.create({
    fileId,
    resource: { type: 'user', role, emailAddress: address },
    sendNotificationEmail: false,
    supportsAllDrives: true,
  });
}

/**
 * Share the spreadsheet with a user
 * @param {string} email - Email to share with
 * @param {string} role - 'reader' or 'writer'
 */
export async function shareSpreadsheet(email, role = 'reader') {
  return withAuth(async () => {
    const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
    if (!isValidSpreadsheetId(spreadsheetId)) throw new Error('Spreadsheet not set up');
    await setFilePermission(spreadsheetId, email, role);
  });
}

/**
 * Share the root folder with a user
 */
export async function shareFolder(email, role = 'reader') {
  return withAuth(async () => {
    const rootId = getRootFolderId();
    if (!rootId) throw new Error('Root folder not set up');
    await setFilePermission(rootId, email, role);
  });
}

/**
 * Remove sharing for a user
 */
export async function removeSharing(email) {
  return withAuth(async () => {
    const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
    if (!isValidSpreadsheetId(spreadsheetId)) return;
    const address = normalizeEmail(email);

    const response = await window.gapi.client.drive.permissions.list({
      fileId: spreadsheetId,
      fields: 'permissions(id, emailAddress)',
      supportsAllDrives: true,
    });

    const permissions = response.result.permissions || [];
    const perm = permissions.find((p) => normalizeEmail(p.emailAddress) === address);

    if (perm) {
      await window.gapi.client.drive.permissions.delete({
        fileId: spreadsheetId,
        permissionId: perm.id,
        supportsAllDrives: true,
      });
    }
  });
}

/**
 * Get the spreadsheet's web view URL
 */
export function getSpreadsheetUrl() {
  const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  if (!isValidSpreadsheetId(spreadsheetId)) return null;
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

/**
 * Get the root folder URL
 */
export function getRootFolderUrl() {
  const rootId = getRootFolderId();
  if (!rootId) return null;
  return `https://drive.google.com/drive/folders/${rootId}`;
}
