/**
 * One society workbook for everyone.
 * Members you grant access reuse APP-TPT-Tracker. They never create.
 * The founding owner may create it once, only after Drive search finds none.
 * Login never auto-creates a sheet.
 */

import { canCreateSocietySpreadsheet, isFoundingOwner } from '../config/accessPolicy';

export function shouldOfferSheetCreation({
  isFounder = false,
  searchConfirmedEmpty = false,
  lookupFailed = false,
  alreadyBound = false,
  existingSheetId = null,
} = {}) {
  if (existingSheetId) return false;
  return Boolean(isFounder && searchConfirmedEmpty && !lookupFailed && !alreadyBound);
}

export function shouldShowMissingSheetHelp({
  searchConfirmedEmpty = false,
  lookupFailed = false,
  alreadyBound = false,
} = {}) {
  return Boolean(searchConfirmedEmpty && !lookupFailed && !alreadyBound);
}

/** Stale v1 setup can leave SETUP_COMPLETE true with no APP-TPT-Tracker bound. */
export function shouldSendFounderToSetup({ isGuest = false, isFounder = false, hasBoundSheet = false } = {}) {
  return Boolean(!isGuest && isFounder && !hasBoundSheet);
}

export function isMissingSocietySheetError(error) {
  return error?.code === 'SHEET_NOT_BOUND' || error?.message === 'SHEET_NOT_BOUND';
}

/** Login, Setup, and granted members must never spawn a workbook by themselves. */
export function shouldAutoCreateSocietySheet() {
  return false;
}

/** If a society sheet already exists, createSpreadsheet must return that id. */
export function shouldCreateNewSocietySpreadsheet({ email, existingSheetId = null } = {}) {
  if (existingSheetId) return false;
  return canCreateSocietySpreadsheet(email);
}

/**
 * Decide whether this sign-in reuses APP-TPT-Tracker, waits, or may create once.
 * Granted Owners/Readers always reuse. They cannot create a second copy.
 */
export function planSocietyWorkbook({
  email,
  existingSheetId = null,
  alreadyBound = false,
  searchConfirmedEmpty = false,
  lookupFailed = false,
} = {}) {
  if (existingSheetId) {
    return {
      action: 'reuse',
      allowCreate: false,
      autoCreate: false,
      spreadsheetId: existingSheetId,
    };
  }
  if (!isFoundingOwner(email)) {
    return { action: 'deny-create', allowCreate: false, autoCreate: false };
  }
  const allowCreate = shouldOfferSheetCreation({
    isFounder: true,
    searchConfirmedEmpty,
    lookupFailed,
    alreadyBound,
  });
  if (allowCreate) {
    return { action: 'create-once', allowCreate: true, autoCreate: false };
  }
  return { action: 'hold', allowCreate: false, autoCreate: false };
}
