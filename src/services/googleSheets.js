/**
 * Google Sheets Service
 * CRUD operations for all sheets in the maintenance tracker
 * Google Sheet is the single source of truth / database
 */

import { SHEET_NAMES, SHEET_HEADERS, DEFAULT_CONFIG, FLATS, STORAGE_KEYS, SHEET_FILE_NAME } from '../config/constants';
import { ensureValidToken } from './googleAuth';

/**
 * Get the spreadsheet ID from localStorage
 */
function getSpreadsheetId() {
  return localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
}

/**
 * Wrapper to ensure auth before any API call
 */
async function withAuth(fn) {
  await ensureValidToken();
  return fn();
}

/**
 * Parse a Google API error into a user-friendly message.
 */
export function parseApiError(error) {
  if (!navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection.';
  }
  const apiErr = error?.result?.error || error?.error;
  if (apiErr) {
    const { code, message } = apiErr;
    switch (code) {
      case 400: return `Bad request: ${message}`;
      case 401: return 'Session expired. Please sign in again.';
      case 403: return `Permission denied: ${message}. Ensure the spreadsheet is shared with your account.`;
      case 404: return 'Resource not found. The Google Sheet or folder may have been deleted or moved.';
      case 429: return 'Google API quota exceeded. Please wait a moment and try again.';
      case 500:
      case 503: return 'Google Sheets service is temporarily unavailable. Please try again.';
      default: return message || 'An unexpected Google API error occurred.';
    }
  }
  return error?.message || 'An unexpected error occurred. Please try again.';
}

// ═══════════════════════════════════════════════════════════════
// SPREADSHEET CREATION & SETUP
// ═══════════════════════════════════════════════════════════════

/**
 * Create the main spreadsheet with all required sheets
 * @param {string} folderId - Google Drive folder ID to create the sheet in
 * @returns {string} Spreadsheet ID
 */
export async function createSpreadsheet(folderId) {
  return withAuth(async () => {
    const sheetNames = Object.values(SHEET_NAMES);

    // Create spreadsheet with all sheets
    const response = await window.gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: SHEET_FILE_NAME,
        },
        sheets: sheetNames.map((name, index) => ({
          properties: {
            sheetId: index,
            title: name,
            index: index,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        })),
      },
    });

    const spreadsheetId = response.result.spreadsheetId;

    // Move to the correct folder
    await window.gapi.client.drive.files.update({
      fileId: spreadsheetId,
      addParents: folderId,
      fields: 'id, parents',
    });

    // Add headers to all sheets
    const batchData = [];
    for (const [sheetName, headers] of Object.entries(SHEET_HEADERS)) {
      batchData.push({
        range: `'${sheetName}'!A1`,
        values: [headers],
      });
    }

    await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data: batchData,
      },
    });

    // Add default configuration
    const configData = Object.entries(DEFAULT_CONFIG).map(([key, value]) => {
      const descriptions = {
        APARTMENT_NAME: 'Name of the apartment complex',
        MONTHLY_MAINTENANCE: 'Monthly maintenance amount per flat (₹)',
        CORPUS_FUND: 'Corpus fund balance (₹)',
        DEFICIT_LAST_YEAR: 'Deficit/surplus carried from last year (₹)',
        FISCAL_YEAR_START: 'Start month of fiscal year (YYYY-MM)',
        TREASURER_FLAT: 'Flat number of the current Treasurer',
        PRESIDENT_FLAT: 'Flat number of the current President',
        LATE_FEE: 'Late payment penalty per month (₹)',
        LATE_FEE_AFTER_DAY: 'Day of month after which late fee applies',
        EMERGENCY_RESERVE: 'Minimum balance to maintain (₹)',
        MAX_USERS: 'Maximum number of users allowed',
        MAX_OWNERS: 'Maximum number of owner-role users',
      };
      return [key, String(value), descriptions[key] || ''];
    });

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_NAMES.CONFIGURATION}'!A2`,
      valueInputOption: 'RAW',
      resource: { values: configData },
    });

    // Add default flat data
    const flatData = FLATS.map(flat => [flat, '', '', '', '', '', '', 'Member']);
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_NAMES.FLATS}'!A2`,
      valueInputOption: 'RAW',
      resource: { values: flatData },
    });

    // Format headers (bold, background color)
    const formatRequests = sheetNames.map((_, index) => ({
      repeatCell: {
        range: {
          sheetId: index,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.15, green: 0.15, blue: 0.2, alpha: 1 },
            textFormat: {
              bold: true,
              foregroundColor: { red: 0.8, green: 0.85, blue: 0.95, alpha: 1 },
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    }));

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests: formatRequests },
    });

    // Save spreadsheet ID
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId);

    return spreadsheetId;
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
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.CONFIGURATION}'!A2:C20`,
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
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();

    // Find the row with this key
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.CONFIGURATION}'!A2:A20`,
    });

    const rows = response.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === key);

    if (rowIndex >= 0) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SHEET_NAMES.CONFIGURATION}'!B${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values: [[String(value)]] },
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
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.FLATS}'!A2:H12`,
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
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const flatIndex = FLATS.indexOf(flatNumber);
    if (flatIndex < 0) throw new Error(`Invalid flat: ${flatNumber}`);

    const rowNum = flatIndex + 2; // +1 for header, +1 for 1-indexed
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_NAMES.FLATS}'!A${rowNum}:H${rowNum}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[
          flatNumber,
          data.ownerName || '',
          data.phone || '',
          data.email || '',
          data.member2Name || '',
          data.member2Phone || '',
          data.member2Email || '',
          data.role || 'Member',
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
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();

    // Check if record exists
    const existing = await getMaintenanceRecords();
    const existingIndex = existing.findIndex(r => r.month === month && r.flat === flat);

    const row = [
      month,
      flat,
      String(data.amountDue || 0),
      String(data.amountPaid || 0),
      data.paymentDate || '',
      data.paymentMode || '',
      data.upiRef || '',
      data.status || 'PENDING',
      String(data.lateFee || 0),
      data.remarks || '',
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
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const rows = FLATS.map(flat => [
      month, flat, String(amount), '0', '', '', '', 'PENDING', '0', '',
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
 * Add a new expense
 */
export async function addExpense(data) {
  return withAuth(async () => {
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
          data.date || new Date().toISOString().split('T')[0],
          data.month || '',
          data.description || '',
          data.category || '',
          String(data.amount || 0),
          data.paymentMode || '',
          data.billReceipt || 'N',
          data.approvedBy || '',
          data.receiptLink || '',
          data.remarks || '',
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
  return withAuth(async () => {
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
 * Add an emergency contact
 */
export async function addEmergencyContact(data) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.EMERGENCY_CONTACTS}'!A:G`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          data.category || '',
          data.name || '',
          data.role || '',
          data.phone || '',
          data.altPhone || '',
          data.address || '',
          data.notes || '',
        ]],
      },
    });
  });
}

/**
 * Delete an emergency contact by row index
 */
export async function deleteEmergencyContact(rowIndex) {
  return withAuth(async () => {
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
  return withAuth(async () => {
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
          data.title || '',
          data.description || '',
          data.frequency || 'Monthly',
          data.nextDue || '',
          data.lastCompleted || '',
          data.assignedTo || '',
          'Active',
          data.createdBy || '',
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
  return withAuth(async () => {
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
  return withAuth(async () => {
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
      email: row[0] || '',
      role: row[1] || 'Reader',
      flat: row[2] || '',
      addedBy: row[3] || '',
      addedDate: row[4] || '',
      status: row[5] || 'Active',
    }));
  });
}

/**
 * Add a user to the access control list
 */
export async function addAccessControl(data) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();

    // Check limits
    const existing = await getAccessControl();
    const activeUsers = existing.filter(u => u.status === 'Active');

    if (activeUsers.length >= DEFAULT_CONFIG.MAX_USERS) {
      throw new Error(`Maximum ${DEFAULT_CONFIG.MAX_USERS} users allowed`);
    }

    if (data.role === 'Owner') {
      const owners = activeUsers.filter(u => u.role === 'Owner');
      if (owners.length >= DEFAULT_CONFIG.MAX_OWNERS) {
        throw new Error(`Maximum ${DEFAULT_CONFIG.MAX_OWNERS} owners allowed`);
      }
    }

    // Check if email already exists
    if (existing.some(u => u.email === data.email && u.status === 'Active')) {
      throw new Error('User already has access');
    }

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A:F`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          data.email,
          data.role || 'Reader',
          data.flat || '',
          data.addedBy || '',
          new Date().toISOString().split('T')[0],
          'Active',
        ]],
      },
    });
  });
}

/**
 * Remove a user from the access control list (soft delete)
 */
export async function removeAccessControl(email) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.ACCESS_CONTROL}'!A2:A50`,
    });

    const rows = response.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === email);

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
  const user = accessList.find(u => u.email === email && u.status === 'Active');
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
          user || 'System',
          action || '',
          details || '',
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
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_NAMES.WATER_TANKER}'!A:F`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          data.date || new Date().toISOString().split('T')[0],
          data.vendor || '',
          String(data.litres || 0),
          String(data.cost || 0),
          data.orderedBy || '',
          data.remarks || '',
        ]],
      },
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Update monthly summary (calculate from maintenance + expenses)
 */
export async function updateMonthlySummary(month) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();

    const [maintenance, expenses] = await Promise.all([
      getMaintenanceRecords(month),
      getExpenses(month),
    ]);

    const totalCollection = maintenance.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalCollection - totalExpenses;
    const paidCount = maintenance.filter(r => r.status === 'PAID').length;
    const collectionPct = maintenance.length > 0
      ? Math.round((paidCount / maintenance.length) * 100)
      : 0;
    const pendingFlats = maintenance
      .filter(r => r.status === 'PENDING')
      .map(r => r.flat)
      .join(', ');

    // Check if this month already exists
    const existing = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A2:A50`,
    });

    const rows = existing.result.values || [];
    const rowIndex = rows.findIndex(r => r[0] === month);

    const summaryRow = [
      month,
      String(totalCollection),
      String(totalExpenses),
      String(netBalance),
      '', // Cumulative — calculated separately
      `${collectionPct}%`,
      pendingFlats,
    ];

    if (rowIndex >= 0) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A${rowIndex + 2}:G${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values: [summaryRow] },
      });
    } else {
      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A:G`,
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
      range: `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A2:G50`,
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      month: row[0] || '',
      totalCollection: Number(row[1]) || 0,
      totalExpenses: Number(row[2]) || 0,
      netBalance: Number(row[3]) || 0,
      cumulativeBalance: Number(row[4]) || 0,
      collectionPct: row[5] || '0%',
      pendingFlats: row[6] || '',
    }));
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
    const spreadsheetId = getSpreadsheetId();

    const response = await window.gapi.client.sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: [
        `'${SHEET_NAMES.CONFIGURATION}'!A2:C20`,
        `'${SHEET_NAMES.MAINTENANCE}'!A2:J5000`,
        `'${SHEET_NAMES.EXPENSES}'!A2:K5000`,
        `'${SHEET_NAMES.REMINDERS}'!A2:J200`,
        `'${SHEET_NAMES.EMERGENCY_CONTACTS}'!A2:G200`,
        `'${SHEET_NAMES.FLATS}'!A2:H12`,
        `'${SHEET_NAMES.MONTHLY_SUMMARY}'!A2:G50`,
      ],
    });

    const ranges = response.result.valueRanges || [];

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

    // Parse summaries
    const summaryRows = ranges[6]?.values || [];
    const summaries = summaryRows.map(row => ({
      month: row[0] || '',
      totalCollection: Number(row[1]) || 0,
      totalExpenses: Number(row[2]) || 0,
      netBalance: Number(row[3]) || 0,
      cumulativeBalance: Number(row[4]) || 0,
      collectionPct: row[5] || '0%',
      pendingFlats: row[6] || '',
    }));

    // Calculate aggregates
    const totalCollected = maintenance.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentBalance = totalCollected - totalExpenseAmount + config.DEFICIT_LAST_YEAR + config.CORPUS_FUND;

    // Cache dashboard data
    const dashboardData = {
      config,
      maintenance,
      expenses,
      reminders,
      contacts,
      flats,
      summaries,
      totals: {
        totalCollected,
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
  return withAuth(async () => {
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
          data.date || new Date().toISOString().split('T')[0],
          data.month || '',
          data.flat || '',
          String(data.amount || 0),
          data.description || '',
          data.paymentMode || '',
          data.collectedBy || '',
          data.remarks || '',
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
  return withAuth(async () => {
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
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const range = `'${SHEET_NAMES.WATCHMAN_DETAILS}'!A:N`;

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          data.name,
          data.phone,
          data.altPhone || '',
          data.address || '',
          data.salary || 0,
          data.shiftTiming || '',
          data.joinDate || new Date().toISOString().split('T')[0],
          data.idProofType || '',
          data.idProofNumber || '',
          data.emergencyContact || '',
          data.emergencyPhone || '',
          data.photoDriveLink || '',
          data.status || 'Active',
          data.remarks || '',
        ]],
      },
    });
  });
}

/**
 * Update a watchman record by row index
 */
export async function updateWatchmanDetail(rowIndex, data) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const rowNum = rowIndex + 2; // +2 for header row and 0-index
    const range = `'${SHEET_NAMES.WATCHMAN_DETAILS}'!A${rowNum}:N${rowNum}`;

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          data.name,
          data.phone,
          data.altPhone || '',
          data.address || '',
          data.salary || 0,
          data.shiftTiming || '',
          data.joinDate || '',
          data.idProofType || '',
          data.idProofNumber || '',
          data.emergencyContact || '',
          data.emergencyPhone || '',
          data.photoDriveLink || '',
          data.status || 'Active',
          data.remarks || '',
        ]],
      },
    });
  });
}

/**
 * Delete a watchman record by row index
 */
export async function deleteWatchmanDetail(rowIndex) {
  return withAuth(async () => {
    const spreadsheetId = getSpreadsheetId();
    const rowNum = rowIndex + 2;
    const range = `'${SHEET_NAMES.WATCHMAN_DETAILS}'!A${rowNum}:N${rowNum}`;

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
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
