/**
 * Google Sheets Service
 * CRUD operations for all sheets in the maintenance tracker
 * Google Sheet is the single source of truth / database
 */

import { SHEET_NAMES, SHEET_HEADERS, DEFAULT_CONFIG, FLATS, STORAGE_KEYS } from '../config/constants';
import {
  FOUNDING_OWNER_EMAIL,
  canGrantOwner,
  canManageUsers,
  canRemoveUser,
  canWriteFinancialData,
  effectiveAppRole,
  isFoundingOwner,
  normalizeRequestedRole,
} from '../config/accessPolicy';
import { ensureValidToken, getCurrentUser } from './googleAuth';
import { findSocietySpreadsheet, getSpreadsheetFileMeta, isPrivateCopyOwnedByUser } from './googleDrive';
import {
  sanitizeForSheet,
  truncateForSheet,
  sheetText,
  sheetNumber,
  normalizeEmail,
  sanitizeDriveUrl,
  isValidSpreadsheetId,
  bindSpreadsheet,
  unbindSpreadsheet,
} from '../utils/helpers';
import {
  createSpreadsheet as createSpreadsheetWorkbook,
  ensureSheetStructure,
  archiveAndCreateFresh,
} from './sheetSetup';

export { createSpreadsheetWorkbook as createSpreadsheet, ensureSheetStructure, archiveAndCreateFresh };

/**
 * Get the spreadsheet ID from localStorage
 */
function getSpreadsheetId() {
  const id = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  return isValidSpreadsheetId(id) ? id : null;
}

/**
 * Wrapper to ensure auth before any API call
 */
async function withAuth(fn) {
  await ensureValidToken();
  return fn();
}

/**
 * SECURITY: Sheets writes must match Access Control, not just a Drive writer grant.
 * A Reader who still has leftover writer permission cannot mutate through this app.
 */
async function assertCanWriteFinancialData() {
  const user = getCurrentUser();
  if (!user?.email) throw new Error('Not authenticated');
  if (isFoundingOwner(user.email)) return;
  let entry = null;
  try {
    const acl = await getAccessControl();
    entry = acl.find((u) => normalizeEmail(u.email) === normalizeEmail(user.email) && u.status === 'Active') || null;
  } catch {
    throw new Error('Could not verify your access. Read-only until the society Owner confirms your role.');
  }
  const role = effectiveAppRole(user.email, entry);
  if (!canWriteFinancialData(user.email, role)) {
    throw new Error('You have read-only access. Ask the society Owner to grant write permission.');
  }
}

async function withWriteAuth(fn) {
  await ensureValidToken();
  await assertCanWriteFinancialData();
  return fn();
}

async function assertCanManageUsers() {
  const user = getCurrentUser();
  if (!user?.email) throw new Error('Not authenticated');
  if (isFoundingOwner(user.email)) return user;
  const acl = await getAccessControl();
  const entry = acl.find((u) => normalizeEmail(u.email) === normalizeEmail(user.email) && u.status === 'Active') || null;
  const role = effectiveAppRole(user.email, entry);
  if (!canManageUsers(user.email, role)) {
    throw new Error('Only the society Owner can manage users.');
  }
  return user;
}

/**
 * Parse a Google API error into a user-friendly message.
 */
export function parseApiError(error) {
  if (error?.code === 'SHEET_NOT_ACCESSIBLE' || error?.message === 'SHEET_NOT_ACCESSIBLE') {
    return 'This browser is pointing at a Google Sheet your account cannot open. If you are a resident, ask the society Owner to add you. Only the founding owner can create the society workbook.';
  }
  if (!navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection.';
  }
  const apiErr = error?.result?.error || error?.error;
  if (apiErr) {
    const { code, message } = apiErr;
    const msg = String(message || '');

    // Common OAuth verification/test-user failure
    if (msg.includes('access_denied') || msg.includes('has not completed the Google verification process')) {
      return 'Google sign-in is blocked for this account. Add this email as a Test User in Google Cloud Console > OAuth consent screen, or publish and verify the app.';
    }

    // Common API enablement failures
    if (msg.includes('Google Drive API has not been used') || msg.includes('drive.googleapis.com')) {
      return 'Google Drive API is not enabled for this project. Enable it in Google Cloud Console: https://console.cloud.google.com/apis/library/drive.googleapis.com, wait 5-10 minutes, then try again.';
    }

    if (msg.includes('Google Sheets API has not been used') || msg.includes('sheets.googleapis.com')) {
      return 'Google Sheets API is not enabled for this project. Enable it in Google Cloud Console: https://console.cloud.google.com/apis/library/sheets.googleapis.com, wait 5-10 minutes, then try again.';
    }

    switch (code) {
      case 400: return `Bad request: ${message}`;
      case 401: return 'Session expired. Please sign in again.';
      case 403: return 'This Google account cannot open the society spreadsheet. Ask the founding owner to add you in Settings → Access Control and share the sheet as Viewer.';
      case 404: return 'The society Google Sheet was not found or is not shared with this account. Ask the founding owner to add you as a Reader.';
      case 429: return 'Google API quota exceeded. Please wait a moment and try again.';
      case 500:
      case 503: return 'Google Sheets service is temporarily unavailable. Please try again.';
      default: return message || 'An unexpected Google API error occurred.';
    }
  }
  return error?.message || 'An unexpected error occurred. Please try again.';
}

export function isPermissionError(error) {
  const code = error?.result?.error?.code || error?.error?.code;
  return code === 403 || code === 404 || error?.code === 'SHEET_NOT_ACCESSIBLE';
}

async function canReadSpreadsheet(spreadsheetId) {
  if (!isValidSpreadsheetId(spreadsheetId)) return false;
  try {
    await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'spreadsheetId',
    });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Attach the society spreadsheet this Google account is allowed to open.
 * Clears a stale ID from another login, and ignores private copies members created.
 */
export async function resolveSpreadsheetForUser(email) {
  return withAuth(async () => {
    const boundEmail = normalizeEmail(localStorage.getItem(STORAGE_KEYS.BOUND_EMAIL));
    const currentId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
    const emailMismatch = Boolean(boundEmail && email && boundEmail !== normalizeEmail(email));

    if (isValidSpreadsheetId(currentId) && !emailMismatch) {
      const meta = await getSpreadsheetFileMeta(currentId);
      const privateCopy = isPrivateCopyOwnedByUser(meta, email);
      if (!privateCopy && await canReadSpreadsheet(currentId)) {
        bindSpreadsheet(currentId, email);
        return currentId;
      }
      unbindSpreadsheet();
    } else if (emailMismatch) {
      unbindSpreadsheet();
    }

    const found = await findSocietySpreadsheet(email);
    if (found?.id && !isPrivateCopyOwnedByUser(found, email) && await canReadSpreadsheet(found.id)) {
      bindSpreadsheet(found.id, email);
      return found.id;
    }

    return null;
  });
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Read all configuration values
 */
export async function getConfiguration() {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) throw new Error('Spreadsheet is not connected.');
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.CONFIGURATION}'!A2:C100`,
    });

    const rows = response.result.values || [];
    const config = {};
    rows.forEach(([key, value]) => {
      if (key) {
        // Convert numeric strings to numbers
        const numVal = Number(value);
        config[key] = isNaN(numVal) ? value : numVal;
      }
    });

    // Cache config
    localStorage.setItem(STORAGE_KEYS.CACHED_CONFIG, JSON.stringify(config));
    return { ...DEFAULT_CONFIG, ...config };
  });
}

/**
 * Update a single configuration value
 */
export async function updateConfiguration(key, value) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) throw new Error('Spreadsheet is not connected.');

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.CONFIGURATION}'!A2:A100`,
    });

    const rows = response.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === key);

    if (rowIndex >= 0) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SHEET_NAMES.CONFIGURATION}'!B${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values: [[sheetText(value, 200)]] },
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// FLATS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all flat details
 */
export async function getFlats() {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) throw new Error('Spreadsheet is not connected.');
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.FLATS}'!A2:H50`,
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      flat: row[0] || '',
      ownerName: row[1] || '',
      phone: row[2] || '',
      email: row[3] || '',
      member2Name: row[4] || '',
      member2Phone: row[5] || '',
      member2Email: row[6] || '',
      role: row[7] || 'Member',
    }));
  });
}

/**
 * Update a flat's details
 */
export async function updateFlat(flatNumber, data) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) throw new Error('Spreadsheet is not connected.');
    if (!FLATS.includes(flatNumber)) throw new Error(`Invalid flat: ${flatNumber}`);

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.FLATS}'!A2:A50`,
    });
    const rows = response.result.values || [];
    const rowIndex = rows.findIndex(r => String(r[0]) === String(flatNumber));
    if (rowIndex < 0) throw new Error(`Flat ${flatNumber} was not found in the Flats sheet.`);

    const rowNum = rowIndex + 2;
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_NAMES.FLATS}'!A${rowNum}:H${rowNum}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          flatNumber,
          sheetText(data.ownerName, 100),
          sheetText(data.phone, 20),
          normalizeEmail(data.email),
          sheetText(data.member2Name, 100),
          sheetText(data.member2Phone, 20),
          normalizeEmail(data.member2Email),
          sheetText(data.role || 'Member', 40),
        ]],
      },
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE
// ═══════════════════════════════════════════════════════════════

/**
 * Get maintenance records, optionally filtered
 */
export async function getMaintenanceRecords(month = null) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.MAINTENANCE}'!A2:J5000`,
    });

    const rows = response.result.values || [];
    let records = rows.map(row => ({
      month: row[0] || '',
      flat: row[1] || '',
      amountDue: Number(row[2]) || 0,
      amountPaid: Number(row[3]) || 0,
      paymentDate: row[4] || '',
      paymentMode: row[5] || '',
      upiRef: row[6] || '',
      status: row[7] || 'PENDING',
      lateFee: Number(row[8]) || 0,
      remarks: row[9] || '',
    }));

    if (month) {
      records = records.filter(r => r.month === month);
    }

    return records;
  });
}

/**
 * Add or update a maintenance payment
 */
export async function upsertMaintenancePayment(month, flat, data) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();

    // Check if record exists
    const existing = await getMaintenanceRecords();
    const existingIndex = existing.findIndex(r => r.month === month && r.flat === flat);

    const row = [
      sheetText(month, 12),
      sheetText(flat, 8),
      sheetNumber(data.amountDue),
      sheetNumber(data.amountPaid),
      sheetText(data.paymentDate, 12),
      sheetText(data.paymentMode, 40),
      sheetText(data.upiRef, 80),
      sheetText(data.status || 'PENDING', 16),
      sheetNumber(data.lateFee),
      sheetText(data.remarks, 300),
    ];

    if (existingIndex >= 0) {
      // Count all rows to find the actual row position
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${SHEET_NAMES.MAINTENANCE}'!A2:B5000`,
      });
      const allRows = response.result.values || [];
      const rowIdx = allRows.findIndex(r => r[0] === month && r[1] === flat);
      if (rowIdx >= 0) {
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${SHEET_NAMES.MAINTENANCE}'!A${rowIdx + 2}:J${rowIdx + 2}`,
          valueInputOption: 'RAW',
          resource: { values: [row] },
        });
        return;
      }
    }

    // Append new record
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.MAINTENANCE}'!A:J`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [row] },
    });
  });
}

/**
 * Initialize maintenance records for a month
 */
export async function initializeMonthMaintenance(month, amount) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const existing = await getMaintenanceRecords(month);
    if (existing.length > 0) {
      throw new Error(`${month} already has ${existing.length} maintenance rows. Refresh instead of initializing again.`);
    }
    const rows = FLATS.map(flat => [
      sheetText(month, 12), flat, sheetNumber(amount), '0', '', '', '', 'PENDING', '0', '',
    ]);

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.MAINTENANCE}'!A:J`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: rows },
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all expenses, optionally filtered by month
 */
export async function getExpenses(month = null) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.EXPENSES}'!A2:K5000`,
    });

    const rows = response.result.values || [];
    let expenses = rows.map(row => ({
      id: row[0] || '',
      date: row[1] || '',
      month: row[2] || '',
      description: row[3] || '',
      category: row[4] || '',
      amount: Number(row[5]) || 0,
      paymentMode: row[6] || '',
      billReceipt: row[7] || 'N',
      approvedBy: row[8] || '',
      receiptLink: row[9] || '',
      remarks: row[10] || '',
    }));

    if (month) {
      expenses = expenses.filter(e => e.month === month);
    }

    return expenses;
  });
}

/**
 * Add a new expense.
 *
 * Security: all user-supplied text fields are sanitized with sanitizeForSheet()
 * before being written to the sheet, preventing formula injection attacks
 * (e.g. =HYPERLINK("https://evil.com","click me")).
 *
 * The `amount` field is coerced to a Number so a string like "=1+2" cannot
 * reach the sheet as a formula.
 */
export async function addExpense(data) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const id = `EXP-${Date.now()}`;

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.EXPENSES}'!A:K`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          id,
          sheetText(data.date || new Date().toISOString().split('T')[0], 12),
          sheetText(data.month, 12),
          sheetText(data.description, 200),
          sheetText(data.category, 60),
          sheetNumber(data.amount),
          sheetText(data.paymentMode, 40),
          data.billReceipt === 'Y' ? 'Y' : 'N',
          sheetText(data.approvedBy, 100),
          sanitizeDriveUrl(data.receiptLink),
          sheetText(data.remarks, 300),
        ]],
      },
    });

    return id;
  });
}

/**
 * Delete an expense by ID
 */
export async function deleteExpense(expenseId) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();

    // Find the row
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.EXPENSES}'!A2:A5000`,
    });

    const rows = response.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === expenseId);

    if (rowIndex >= 0) {
      // Get sheet ID
      const sheetMeta = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties',
      });

      const sheet = sheetMeta.result.sheets.find(
        s => s.properties.title === SHEET_NAMES.EXPENSES
      );

      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex + 1, // +1 for header
                endIndex: rowIndex + 2,
              },
            },
          }],
        },
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// EMERGENCY CONTACTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all emergency contacts
 */
export async function getEmergencyContacts() {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.EMERGENCY_CONTACTS}'!A2:G200`,
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      category: row[0] || '',
      name: row[1] || '',
      role: row[2] || '',
      phone: row[3] || '',
      altPhone: row[4] || '',
      address: row[5] || '',
      notes: row[6] || '',
    }));
  });
}

/**
 * Add an emergency contact — sanitized against formula injection.
 */
export async function addEmergencyContact(data) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.EMERGENCY_CONTACTS}'!A:G`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          sanitizeForSheet(data.category),
          truncateForSheet(sanitizeForSheet(data.name), 100),
          truncateForSheet(sanitizeForSheet(data.role), 100),
          sanitizeForSheet(data.phone),
          sanitizeForSheet(data.altPhone),
          truncateForSheet(sanitizeForSheet(data.address), 200),
          truncateForSheet(sanitizeForSheet(data.notes), 300),
        ]],
      },
    });
  });
}

/**
 * Delete an emergency contact by row index
 */
export async function deleteEmergencyContact(rowIndex) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const sheetMeta = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });

    const sheet = sheetMeta.result.sheets.find(
      s => s.properties.title === SHEET_NAMES.EMERGENCY_CONTACTS
    );

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex + 1,
              endIndex: rowIndex + 2,
            },
          },
        }],
      },
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// REMINDERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all reminders
 */
export async function getReminders() {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.REMINDERS}'!A2:J200`,
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      id: row[0] || '',
      title: row[1] || '',
      description: row[2] || '',
      frequency: row[3] || '',
      nextDue: row[4] || '',
      lastCompleted: row[5] || '',
      assignedTo: row[6] || '',
      status: row[7] || 'Active',
      createdBy: row[8] || '',
      createdDate: row[9] || '',
    }));
  });
}

/**
 * Add a new reminder
 */
export async function addReminder(data) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const id = `REM-${Date.now()}`;

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.REMINDERS}'!A:J`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          id,
          sheetText(data.title, 120),
          sheetText(data.description, 400),
          sheetText(data.frequency || 'Monthly', 20),
          sheetText(data.nextDue, 12),
          sheetText(data.lastCompleted, 12),
          sheetText(data.assignedTo, 80),
          'Active',
          sheetText(data.createdBy, 80),
          new Date().toISOString().split('T')[0],
        ]],
      },
    });

    return id;
  });
}

/**
 * Mark a reminder as completed
 */
export async function completeReminder(reminderId) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.REMINDERS}'!A2:A200`,
    });

    const rows = response.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === reminderId);

    if (rowIndex >= 0) {
      const today = new Date().toISOString().split('T')[0];
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SHEET_NAMES.REMINDERS}'!F${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values: [[today]] },
      });
    }
  });
}

/**
 * Delete a reminder
 */
export async function deleteReminder(reminderId) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.REMINDERS}'!A2:A200`,
    });

    const rows = response.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === reminderId);

    if (rowIndex >= 0) {
      const sheetMeta = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties',
      });
      const sheet = sheetMeta.result.sheets.find(
        s => s.properties.title === SHEET_NAMES.REMINDERS
      );

      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex + 1,
                endIndex: rowIndex + 2,
              },
            },
          }],
        },
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// ACCESS CONTROL
// ═══════════════════════════════════════════════════════════════

/**
 * Get all access control entries
 */
export async function getAccessControl() {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A2:F50`,
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      email: normalizeEmail(row[0]),
      role: row[1] || 'Reader',
      flat: row[2] || '',
      addedBy: row[3] || '',
      addedDate: row[4] || '',
      status: row[5] || 'Active',
    }));
  });
}

/**
 * Guarantee the founding owner row exists as Active Owner.
 * Called after the society workbook is created or reconnected.
 */
export async function ensureFoundingOwnerEntry(addedBy = 'System') {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) return;
    const existing = await getAccessControl();
    const founder = existing.find((u) => isFoundingOwner(u.email));
    if (founder?.status === 'Active' && founder.role === 'Owner') return;

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A2:F50`,
    });
    const rows = response.result.values || [];
    const rowIndex = rows.findIndex((r) => isFoundingOwner(r[0]));
    const values = [[
      normalizeEmail(FOUNDING_OWNER_EMAIL),
      'Owner',
      '',
      normalizeEmail(addedBy) || 'System',
      new Date().toISOString().split('T')[0],
      'Active',
    ]];

    if (rowIndex >= 0) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A${rowIndex + 2}:F${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values },
      });
      return;
    }

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A:F`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });
  });
}

/**
 * Add a user to the access control list.
 * New members default to Reader. Only the founding owner may grant Owner.
 */
export async function addAccessControl(data) {
  return withAuth(async () => {
    const actor = await assertCanManageUsers();
    const spreadsheetId = getSpreadsheetId();

    const email = normalizeEmail(data.email);
    if (!email || !email.includes('@')) throw new Error('Enter a valid email address');

    // Never demote the founding owner; never let a non-founder mint Owners.
    const role = isFoundingOwner(email)
      ? 'Owner'
      : normalizeRequestedRole(data.role, actor.email);

    const existing = await getAccessControl();
    const activeUsers = existing.filter((u) => u.status === 'Active');

    if (activeUsers.length >= DEFAULT_CONFIG.MAX_USERS) {
      throw new Error(`Maximum ${DEFAULT_CONFIG.MAX_USERS} users allowed`);
    }

    if (role === 'Owner' && !isFoundingOwner(email)) {
      const owners = activeUsers.filter((u) => u.role === 'Owner' && !isFoundingOwner(u.email));
      // Founding owner + at most one additional Owner (MAX_OWNERS = 2).
      if (owners.length + 1 >= DEFAULT_CONFIG.MAX_OWNERS) {
        throw new Error(`Maximum ${DEFAULT_CONFIG.MAX_OWNERS} owners allowed`);
      }
      if (!canGrantOwner(actor.email)) {
        throw new Error('Only the founding owner can grant Owner access.');
      }
    }

    if (existing.some((u) => normalizeEmail(u.email) === email && u.status === 'Active')) {
      throw new Error('User already has access');
    }

    const inactiveIndex = existing.findIndex(
      (u) => normalizeEmail(u.email) === email && u.status !== 'Active',
    );
    if (inactiveIndex >= 0) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A${inactiveIndex + 2}:F${inactiveIndex + 2}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[
            email,
            role,
            sheetText(data.flat, 8),
            normalizeEmail(data.addedBy || actor.email),
            new Date().toISOString().split('T')[0],
            'Active',
          ]],
        },
      });
      return role;
    }

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A:F`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          email,
          role,
          sheetText(data.flat, 8),
          normalizeEmail(data.addedBy || actor.email),
          new Date().toISOString().split('T')[0],
          'Active',
        ]],
      },
    });
    return role;
  });
}

/**
 * Change an existing user's app role. Founding owner row cannot be changed.
 */
export async function updateAccessControlRole(email, requestedRole) {
  return withAuth(async () => {
    const actor = await assertCanManageUsers();
    if (!canRemoveUser(email)) {
      throw new Error('The founding owner cannot be changed or removed.');
    }
    const role = normalizeRequestedRole(requestedRole, actor.email);
    const spreadsheetId = getSpreadsheetId();
    const existing = await getAccessControl();
    const rowIndex = existing.findIndex((u) => normalizeEmail(u.email) === normalizeEmail(email));
    if (rowIndex < 0) throw new Error('User was not found');

    if (role === 'Owner' && existing[rowIndex].role !== 'Owner') {
      const extraOwners = existing.filter((u) => u.status === 'Active' && u.role === 'Owner' && !isFoundingOwner(u.email));
      if (extraOwners.length + 1 >= DEFAULT_CONFIG.MAX_OWNERS) {
        throw new Error(`Maximum ${DEFAULT_CONFIG.MAX_OWNERS} owners allowed`);
      }
    }

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_NAMES.ACCESS_CONTROL}'!B${rowIndex + 2}`,
      valueInputOption: 'RAW',
      resource: { values: [[role]] },
    });
    return role;
  });
}

/**
 * Remove a user from the access control list (soft delete)
 */
export async function removeAccessControl(email) {
  return withAuth(async () => {
    await assertCanManageUsers();
    if (!canRemoveUser(email)) {
      throw new Error('The founding owner cannot be removed.');
    }
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A2:A50`,
    });

    const rows = response.result.values || [];
    const rowIndex = rows.findIndex((r) => normalizeEmail(r[0]) === normalizeEmail(email));

    if (rowIndex >= 0) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SHEET_NAMES.ACCESS_CONTROL}'!F${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values: [['Inactive']] },
      });
    }
  });
}

/**
 * Check if a user has access
 */
export async function checkAccess(email) {
  const accessList = await getAccessControl();
  const user = accessList.find(u => normalizeEmail(u.email) === normalizeEmail(email) && u.status === 'Active');
  return user || null;
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════

/**
 * Add an audit log entry
 */
export async function addAuditLog(user, action, details) {
  try {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) return;

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.AUDIT_LOG}'!A:D`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          new Date().toISOString(),
          sheetText(user || 'System', 80),
          sheetText(action, 40),
          sheetText(details, 400),
        ]],
      },
    });
  } catch (error) {
    // Don't throw on audit log failures — non-critical
    console.warn('Audit log failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// WATER TANKER LOG
// ═══════════════════════════════════════════════════════════════

/**
 * Get water tanker records
 */
export async function getWaterTankerLogs() {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.WATER_TANKER}'!A2:F500`,
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      date: row[0] || '',
      vendor: row[1] || '',
      litres: Number(row[2]) || 0,
      cost: Number(row[3]) || 0,
      orderedBy: row[4] || '',
      remarks: row[5] || '',
    }));
  });
}

/**
 * Add a water tanker entry
 */
export async function addWaterTankerLog(data) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.WATER_TANKER}'!A:F`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          sheetText(data.date || new Date().toISOString().split('T')[0], 12),
          sheetText(data.vendor, 80),
          sheetNumber(data.litres),
          sheetNumber(data.cost),
          sheetText(data.orderedBy, 80),
          sheetText(data.remarks, 300),
        ]],
      },
    });
  });
}

function parseMonthlySummaryRow(row) {
  const isNewLayout = String(row[6] || '').includes('%');
  if (isNewLayout) {
    return {
      month: row[0] || '',
      totalCollection: Number(row[1]) || 0,
      totalMiscFunds: Number(row[2]) || 0,
      totalExpenses: Number(row[3]) || 0,
      netBalance: Number(row[4]) || 0,
      cumulativeBalance: Number(row[5]) || 0,
      collectionPct: row[6] || '0%',
      pendingFlats: row[7] || '',
      status: row[8] || '',
    };
  }
  return {
    month: row[0] || '',
    totalCollection: Number(row[1]) || 0,
    totalMiscFunds: 0,
    totalExpenses: Number(row[2]) || 0,
    netBalance: Number(row[3]) || 0,
    cumulativeBalance: Number(row[4]) || 0,
    collectionPct: row[5] || '0%',
    pendingFlats: row[6] || '',
    status: '',
  };
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Update monthly summary with full financial picture for Google Sheets clarity.
 * Columns: Month | Collection | Misc Funds | Total Expenses | Net Balance | Cumulative | Collection% | Pending Flats | Status
 */
export async function updateMonthlySummary(month) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();

    const [maintenance, expenses, miscFundsData] = await Promise.all([
      getMaintenanceRecords(month),
      getExpenses(month),
      getMiscFunds(month).catch(() => []),
    ]);

    const totalCollection = maintenance.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalMiscFunds = miscFundsData.reduce((sum, f) => sum + f.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalCollection + totalMiscFunds - totalExpenses;
    const paidCount = maintenance.filter(r => r.status === 'PAID').length;
    const collectionPct = maintenance.length > 0
      ? Math.round((paidCount / maintenance.length) * 100)
      : 0;
    const pendingFlats = maintenance
      .filter(r => r.status !== 'PAID')
      .map(r => `${r.flat}(${r.status})`)
      .join(', ');
    const statusLabel = netBalance >= 0 ? 'SURPLUS' : 'DEFICIT';

    // Get existing summaries to check if month row exists and compute cumulative
    const existing = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A2:I100`,
    });

    const rows = existing.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === month);

    // Compute cumulative balance (sum of all net balances up to and including this month)
    let cumulativeBalance = netBalance;
    rows.forEach((r, i) => {
      if (r[0] !== month && i !== rowIndex) {
        const nb = Number(r[4]) || 0;
        cumulativeBalance += nb;
      }
    });

    const summaryRow = [
      month,
      String(totalCollection),
      String(totalMiscFunds),
      String(totalExpenses),
      String(netBalance),
      String(cumulativeBalance),
      `${collectionPct}%`,
      pendingFlats,
      statusLabel,
    ];

    // Ensure headers are present (first write only)
    const headerCheck = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A1:I1`,
    });
    if (!headerCheck.result.values?.[0]?.[0]) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A1`,
        valueInputOption: 'RAW',
        resource: { values: [SHEET_HEADERS[SHEET_NAMES.MONTHLY_SUMMARY]] },
      });
    }

    if (rowIndex >= 0) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A${rowIndex + 2}:I${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values: [summaryRow] },
      });
    } else {
      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A:I`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [summaryRow] },
      });
    }
  });
}

/**
 * Get all monthly summaries
 */
export async function getMonthlySummaries() {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A2:I100`,
    });

    const rows = response.result.values || [];
    return rows.map(parseMonthlySummaryRow);
  });
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD AGGREGATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get all dashboard data in a single batch call (performance optimization)
 */
export async function getDashboardData() {
  return withAuth(async () => {
    const user = getCurrentUser();
    const spreadsheetId = await resolveSpreadsheetForUser(user?.email);
    if (!spreadsheetId) {
      const err = new Error('SHEET_NOT_ACCESSIBLE');
      err.code = 'SHEET_NOT_ACCESSIBLE';
      throw err;
    }

    const coreRanges = [
      `'${SHEET_NAMES.CONFIGURATION}'!A2:C100`,
      `'${SHEET_NAMES.MAINTENANCE}'!A2:J5000`,
      `'${SHEET_NAMES.EXPENSES}'!A2:K5000`,
      `'${SHEET_NAMES.REMINDERS}'!A2:J200`,
      `'${SHEET_NAMES.EMERGENCY_CONTACTS}'!A2:G200`,
      `'${SHEET_NAMES.FLATS}'!A2:H50`,
      `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A2:I100`,
    ];
    const rangesWithMisc = [
      ...coreRanges,
      `'${SHEET_NAMES.MISC_FUNDS}'!A2:I2000`,
    ];

    let ranges;
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: rangesWithMisc,
      });
      ranges = response.result.valueRanges || [];
    } catch (err) {
      if (isPermissionError(err)) throw err;
      const response = await window.gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: coreRanges,
      });
      ranges = response.result.valueRanges || [];
    }
    const parseMisc = (rows) => (rows || []).map(row => ({
      id: row[0] || '',
      date: row[1] || '',
      month: row[2] || '',
      flat: row[3] || '',
      amount: Number(row[4]) || 0,
      description: row[5] || '',
      paymentMode: row[6] || '',
      collectedBy: row[7] || '',
      remarks: row[8] || '',
    }));

    // Parse configuration
    const configRows = ranges[0]?.values || [];
    const config = { ...DEFAULT_CONFIG };
    configRows.forEach(([key, value]) => {
      if (key) {
        const numVal = Number(value);
        config[key] = isNaN(numVal) ? value : numVal;
      }
    });

    // Parse maintenance
    const maintenanceRows = ranges[1]?.values || [];
    const maintenance = maintenanceRows.map(row => ({
      month: row[0] || '',
      flat: row[1] || '',
      amountDue: Number(row[2]) || 0,
      amountPaid: Number(row[3]) || 0,
      paymentDate: row[4] || '',
      paymentMode: row[5] || '',
      upiRef: row[6] || '',
      status: row[7] || 'PENDING',
      lateFee: Number(row[8]) || 0,
      remarks: row[9] || '',
    }));

    // Parse expenses
    const expenseRows = ranges[2]?.values || [];
    const expenses = expenseRows.map(row => ({
      id: row[0] || '',
      date: row[1] || '',
      month: row[2] || '',
      description: row[3] || '',
      category: row[4] || '',
      amount: Number(row[5]) || 0,
      paymentMode: row[6] || '',
      billReceipt: row[7] || 'N',
      approvedBy: row[8] || '',
      receiptLink: row[9] || '',
      remarks: row[10] || '',
    }));

    // Parse reminders
    const reminderRows = ranges[3]?.values || [];
    const reminders = reminderRows.map(row => ({
      id: row[0] || '',
      title: row[1] || '',
      description: row[2] || '',
      frequency: row[3] || '',
      nextDue: row[4] || '',
      lastCompleted: row[5] || '',
      assignedTo: row[6] || '',
      status: row[7] || 'Active',
      createdBy: row[8] || '',
      createdDate: row[9] || '',
    }));

    // Parse emergency contacts
    const contactRows = ranges[4]?.values || [];
    const contacts = contactRows.map(row => ({
      category: row[0] || '',
      name: row[1] || '',
      role: row[2] || '',
      phone: row[3] || '',
      altPhone: row[4] || '',
      address: row[5] || '',
      notes: row[6] || '',
    }));

    // Parse flats
    const flatRows = ranges[5]?.values || [];
    const flats = flatRows.map(row => ({
      flat: row[0] || '',
      ownerName: row[1] || '',
      phone: row[2] || '',
      email: row[3] || '',
      member2Name: row[4] || '',
      member2Phone: row[5] || '',
      member2Email: row[6] || '',
      role: row[7] || 'Member',
    }));

    const summaryRows = ranges[6]?.values || [];
    const summaries = summaryRows.map(parseMonthlySummaryRow);
    const miscFunds = parseMisc(ranges[7]?.values);

    const totalCollected = maintenance.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalMiscFunds = miscFunds.reduce((sum, f) => sum + f.amount, 0);
    const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentBalance = totalCollected + totalMiscFunds - totalExpenseAmount + config.DEFICIT_LAST_YEAR + config.CORPUS_FUND;

    // Cache dashboard data
    const dashboardData = {
      config,
      maintenance,
      expenses,
      reminders,
      contacts,
      flats,
      summaries,
      miscFunds,
      totals: {
        totalCollected,
        totalMiscFunds,
        totalExpenses: totalExpenseAmount,
        currentBalance,
        deficit: config.DEFICIT_LAST_YEAR,
        corpusFund: config.CORPUS_FUND,
      },
    };

    localStorage.setItem(STORAGE_KEYS.CACHED_DASHBOARD, JSON.stringify(dashboardData));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    return dashboardData;
  });
}

// ═══════════════════════════════════════════════════════════════
// MISC FUNDS
// ═══════════════════════════════════════════════════════════════

/**
 * Ensure the Misc Funds sheet exists (for setups created before this feature).
 * Creates the sheet + headers if missing. Safe to call multiple times.
 */
async function ensureMiscFundsSheet(spreadsheetId) {
  try {
    const meta = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    });
    const titles = (meta.result.sheets || []).map(s => s.properties.title);
    if (titles.includes(SHEET_NAMES.MISC_FUNDS)) return;

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: SHEET_NAMES.MISC_FUNDS,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        }],
      },
    });

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_NAMES.MISC_FUNDS}'!A1`,
      valueInputOption: 'RAW',
      resource: { values: [SHEET_HEADERS[SHEET_NAMES.MISC_FUNDS]] },
    });
  } catch {
    // Readers cannot add tabs; dashboard reads skip this sheet instead.
  }
}

/**
 * Get misc fund records, optionally filtered by month
 */
export async function getMiscFunds(month = null) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    await ensureMiscFundsSheet(spreadsheetId);

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.MISC_FUNDS}'!A2:I2000`,
    });

    const rows = response.result.values || [];
    let records = rows.map(row => ({
      id: row[0] || '',
      date: row[1] || '',
      month: row[2] || '',
      flat: row[3] || '',
      amount: Number(row[4]) || 0,
      description: row[5] || '',
      paymentMode: row[6] || '',
      collectedBy: row[7] || '',
      remarks: row[8] || '',
    }));

    if (month) records = records.filter(r => r.month === month);
    return records;
  });
}

/**
 * Add a new misc fund entry
 */
export async function addMiscFund(data) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    await ensureMiscFundsSheet(spreadsheetId);

    const id = `MISC-${Date.now()}`;
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.MISC_FUNDS}'!A:I`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          id,
          sheetText(data.date || new Date().toISOString().split('T')[0], 12),
          sheetText(data.month, 12),
          sheetText(data.flat, 8),
          sheetNumber(data.amount),
          sheetText(data.description, 200),
          sheetText(data.paymentMode, 40),
          sheetText(data.collectedBy, 80),
          sheetText(data.remarks, 300),
        ]],
      },
    });
    return id;
  });
}

/**
 * Delete a misc fund entry by ID
 */
export async function deleteMiscFund(fundId) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.MISC_FUNDS}'!A2:A2000`,
    });
    const rows = response.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === fundId);
    if (rowIndex < 0) return;

    const sheetMeta = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });
    const sheet = sheetMeta.result.sheets.find(s => s.properties.title === SHEET_NAMES.MISC_FUNDS);

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex + 1,
              endIndex: rowIndex + 2,
            },
          },
        }],
      },
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// WATCHMAN DETAILS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all watchman records
 */
export async function getWatchmanDetails() {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const range = `'${SHEET_NAMES.WATCHMAN_DETAILS}'!A2:N`;

    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.result.values || [];
      return rows.map((row, index) => ({
        index,
        name: row[0] || '',
        phone: row[1] || '',
        altPhone: row[2] || '',
        address: row[3] || '',
        salary: Number(row[4]) || 0,
        shiftTiming: row[5] || '',
        joinDate: row[6] || '',
        idProofType: row[7] || '',
        idProofNumber: row[8] || '',
        emergencyContact: row[9] || '',
        emergencyPhone: row[10] || '',
        photoDriveLink: row[11] || '',
        status: row[12] || 'Active',
        remarks: row[13] || '',
      }));
    } catch {
      return [];
    }
  });
}

/**
 * Add a new watchman record
 */
export async function addWatchmanDetail(data) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const range = `'${SHEET_NAMES.WATCHMAN_DETAILS}'!A:N`;

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          sheetText(data.name, 100),
          sheetText(data.phone, 20),
          sheetText(data.altPhone, 20),
          sheetText(data.address, 200),
          sheetNumber(data.salary),
          sheetText(data.shiftTiming, 60),
          sheetText(data.joinDate || new Date().toISOString().split('T')[0], 12),
          sheetText(data.idProofType, 40),
          sheetText(data.idProofNumber, 40),
          sheetText(data.emergencyContact, 80),
          sheetText(data.emergencyPhone, 20),
          sanitizeDriveUrl(data.photoDriveLink),
          sheetText(data.status || 'Active', 20),
          sheetText(data.remarks, 300),
        ]],
      },
    });
  });
}

/**
 * Update a watchman record by row index
 */
export async function updateWatchmanDetail(rowIndex, data) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const rowNum = rowIndex + 2; // +2 for header row and 0-index
    const range = `'${SHEET_NAMES.WATCHMAN_DETAILS}'!A${rowNum}:N${rowNum}`;

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          sheetText(data.name, 100),
          sheetText(data.phone, 20),
          sheetText(data.altPhone, 20),
          sheetText(data.address, 200),
          sheetNumber(data.salary),
          sheetText(data.shiftTiming, 60),
          sheetText(data.joinDate, 12),
          sheetText(data.idProofType, 40),
          sheetText(data.idProofNumber, 40),
          sheetText(data.emergencyContact, 80),
          sheetText(data.emergencyPhone, 20),
          sanitizeDriveUrl(data.photoDriveLink),
          sheetText(data.status || 'Active', 20),
          sheetText(data.remarks, 300),
        ]],
      },
    });
  });
}

/**
 * Delete a watchman record by row index
 */
export async function deleteWatchmanDetail(rowIndex) {
  return withWriteAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const rowNum = rowIndex + 2;
    const range = `'${SHEET_NAMES.WATCHMAN_DETAILS}'!A${rowNum}:N${rowNum}`;

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [['', '', '', '', '', '', '', '', '', '', '', '', 'Deleted', '']],
      },
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get audit log entries for a specific month
 * Used for monthly summary "Activities Performed" section
 * @param {string} monthLabel - e.g. "Sep-26"
 */
export async function getAuditLogForMonth(monthLabel) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const range = `'${SHEET_NAMES.AUDIT_LOG}'!A2:D`;

    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.result.values || [];
      // Parse month from label like "Sep-26"
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const parts = monthLabel.split('-');
      const monthIdx = monthNames.indexOf(parts[0]);
      const fullYear = 2000 + Number(parts[1]);

      return rows
        .map(row => ({
          timestamp: row[0] || '',
          user: row[1] || '',
          action: row[2] || '',
          details: row[3] || '',
        }))
        .filter(entry => {
          try {
            const date = new Date(entry.timestamp);
            return date.getMonth() === monthIdx && date.getFullYear() === fullYear;
          } catch {
            return false;
          }
        });
    } catch {
      return [];
    }
  });
}
