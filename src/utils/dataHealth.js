/**
 * Workbook data-quality checks. Pure — no Google calls.
 * Duplicate maintenance keys and expense fingerprints overstate money.
 */

import { FLATS } from '../config/constants';
import { expenseFingerprint } from './expenseDuplicate';
import { coerceMonthLabel } from './months';

export function maintenanceKey(month, flat) {
  const monthLabel = coerceMonthLabel(month) || String(month || '').trim();
  const flatLabel = String(flat || '').trim();
  if (!monthLabel || !flatLabel) return '';
  return `${monthLabel}|${flatLabel}`;
}

export function findDuplicateMaintenanceKeys(records = []) {
  const map = new Map();
  (records || []).forEach((row, index) => {
    const key = maintenanceKey(row.month, row.flat);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ ...row, index });
  });
  return [...map.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({ key, count: rows.length, rows }));
}

export function findDuplicateExpenseFingerprints(expenses = []) {
  const map = new Map();
  (expenses || []).forEach((row, index) => {
    if (!String(row?.description || '').trim()) return;
    const key = expenseFingerprint(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ ...row, index });
  });
  return [...map.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({ key, count: rows.length, rows }));
}

export function findUnknownFlats(records = [], known = FLATS) {
  const allowed = new Set((known || []).map((flat) => String(flat)));
  return [...new Set(
    (records || [])
      .map((row) => String(row.flat || '').trim())
      .filter((flat) => flat && !allowed.has(flat)),
  )];
}

export function findInvalidMonthLabels(records = []) {
  return [...new Set(
    (records || [])
      .map((row) => row.month)
      .filter((month) => {
        const label = coerceMonthLabel(month);
        return Boolean(month) && !/^[A-Za-z]{3}-\d{2}$/.test(label);
      }),
  )];
}

export function findNegativeAmounts(maintenance = [], expenses = []) {
  return [
    ...(maintenance || []).filter((row) => Number(row.amountPaid) < 0 || Number(row.amountDue) < 0),
    ...(expenses || []).filter((row) => Number(row.amount) < 0),
  ];
}

export function findPaidAboveDue(maintenance = []) {
  return (maintenance || []).filter((row) => {
    const due = Number(row.amountDue) || 0;
    const paid = Number(row.amountPaid) || 0;
    return due > 0 && paid > due;
  });
}

export function findStatusAmountMismatches(maintenance = []) {
  return (maintenance || []).filter((row) => {
    const status = String(row.status || '').toUpperCase();
    const due = Number(row.amountDue) || 0;
    const paid = Number(row.amountPaid) || 0;
    if (status === 'PAID' && due > 0 && paid < due) return true;
    if (status === 'PENDING' && paid > 0) return true;
    return false;
  });
}

export function flatsStillDue(records = []) {
  return (records || []).filter((row) => {
    const status = String(row.status || '').toUpperCase();
    if (status === 'PAID' || status === 'WAIVED') return false;
    const fromSheet = Number(row.stillDue);
    const fallback = Math.max(0, (Number(row.amountDue) || 0) - (Number(row.amountPaid) || 0));
    const still = Number.isFinite(fromSheet) ? fromSheet : fallback;
    return still > 0;
  });
}

export function assessDataHealth({ maintenance = [], expenses = [], flats = [] } = {}) {
  const duplicateMaintenance = findDuplicateMaintenanceKeys(maintenance);
  const duplicateExpenses = findDuplicateExpenseFingerprints(expenses);
  const unknownFlats = findUnknownFlats([...maintenance, ...flats]);
  const invalidMonths = findInvalidMonthLabels([...maintenance, ...expenses]);
  const negativeAmounts = findNegativeAmounts(maintenance, expenses);
  const paidAboveDue = findPaidAboveDue(maintenance);
  const statusMismatches = findStatusAmountMismatches(maintenance);

  const issues = [];
  if (duplicateMaintenance.length) {
    issues.push({
      severity: 'high',
      code: 'DUP_MAINT',
      title: 'Duplicate maintenance rows',
      detail: `${duplicateMaintenance.length} month/flat key(s) appear more than once. Totals add every row.`,
      items: duplicateMaintenance.map((row) => row.key),
    });
  }
  if (duplicateExpenses.length) {
    issues.push({
      severity: 'high',
      code: 'DUP_EXP',
      title: 'Duplicate expenses',
      detail: `${duplicateExpenses.length} bill(s) share the same date, description, and amount.`,
      items: duplicateExpenses.map((row) => row.key),
    });
  }
  if (unknownFlats.length) {
    issues.push({
      severity: 'medium',
      code: 'UNKNOWN_FLAT',
      title: 'Unknown flat numbers',
      detail: 'These flats are not in the 10-flat list.',
      items: unknownFlats,
    });
  }
  if (invalidMonths.length) {
    issues.push({
      severity: 'medium',
      code: 'BAD_MONTH',
      title: 'Invalid month labels',
      detail: 'Use MMM-YY such as Sep-26.',
      items: invalidMonths.map(String),
    });
  }
  if (negativeAmounts.length) {
    issues.push({
      severity: 'medium',
      code: 'NEG_AMT',
      title: 'Negative amounts',
      detail: `${negativeAmounts.length} row(s) have a negative amount.`,
    });
  }
  if (paidAboveDue.length) {
    issues.push({
      severity: 'low',
      code: 'OVERPAY',
      title: 'Paid more than due',
      detail: `${paidAboveDue.length} maintenance row(s) have Amount Paid above Amount Due.`,
    });
  }
  if (statusMismatches.length) {
    issues.push({
      severity: 'low',
      code: 'STATUS',
      title: 'Status does not match amounts',
      detail: `${statusMismatches.length} row(s) say PAID but still owe, or PENDING but already paid something.`,
    });
  }

  return {
    issues,
    blocking: issues.some((issue) => issue.severity === 'high'),
    duplicateMaintenance,
    duplicateExpenses,
    summary: issues.length
      ? `${issues.length} data-health item(s) to review`
      : 'Workbook looks healthy',
  };
}
