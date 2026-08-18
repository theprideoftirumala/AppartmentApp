/**
 * Google Drive Service
 * Handles folder creation, file uploads, backups, and sharing
 */

import { DRIVE_ROOT_FOLDER, DRIVE_EXPENSES_FOLDER, DRIVE_BACKUPS_FOLDER, STORAGE_KEYS } from '../config/constants';
import { ensureValidToken } from './googleAuth';

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
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
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
    if (!spreadsheetId || !rootId) throw new Error('Setup not complete');

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
 * Share the spreadsheet with a user
 * @param {string} email - Email to share with
 * @param {string} role - 'reader' or 'writer'
 */
export async function shareSpreadsheet(email, role = 'reader') {
  return withAuth(async () => {
    const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
    if (!spreadsheetId) throw new Error('Spreadsheet not set up');

    await window.gapi.client.drive.permissions.create({
      fileId: spreadsheetId,
      resource: {
        type: 'user',
        role: role,
        emailAddress: email,
      },
      sendNotificationEmail: false,
    });
  });
}

/**
 * Share the root folder with a user
 */
export async function shareFolder(email, role = 'reader') {
  return withAuth(async () => {
    const rootId = getRootFolderId();
    if (!rootId) throw new Error('Root folder not set up');

    await window.gapi.client.drive.permissions.create({
      fileId: rootId,
      resource: {
        type: 'user',
        role: role,
        emailAddress: email,
      },
      sendNotificationEmail: false,
    });
  });
}

/**
 * Remove sharing for a user
 */
export async function removeSharing(email) {
  return withAuth(async () => {
    const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
    if (!spreadsheetId) return;

    // List permissions
    const response = await window.gapi.client.drive.permissions.list({
      fileId: spreadsheetId,
      fields: 'permissions(id, emailAddress)',
    });

    const permissions = response.result.permissions || [];
    const perm = permissions.find(p => p.emailAddress === email);

    if (perm) {
      await window.gapi.client.drive.permissions.delete({
        fileId: spreadsheetId,
        permissionId: perm.id,
      });
    }
  });
}

/**
 * Get the spreadsheet's web view URL
 */
export function getSpreadsheetUrl() {
  const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  if (!spreadsheetId) return null;
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
