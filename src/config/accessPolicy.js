/**
 * Society access policy (authorization).
 *
 * SECURITY: This app has no backend. Google Drive file ACLs are the real
 * write barrier. This module is the in-app policy layer so the UI and
 * Sheets writes cannot self-promote a random Google login to Owner, and
 * cannot create a second "society" spreadsheet.
 *
 * Rules:
 *  1. One founding owner (FOUNDING_OWNER_EMAIL below)
 *  2. One society workbook APP-TPT-Tracker in Drive folder TPT-APP-Tracker.
 *  3. New members default to Reader (view-only) until the founding owner promotes them
 *  4. The founding owner cannot be demoted or removed from Access Control
 *
 * Keep the full founding address only in this file. Docs and examples should
 * use maskEmail() so personal inboxes are not copied into git.
 */

import { normalizeEmail } from '../utils/helpers';

/** The only identity that may create/connect APP-TPT-Tracker and grant Owner. */
export const FOUNDING_OWNER_EMAIL = 'theprideoftirumala@gmail.com';

/**
 * Mask an email for docs, logs, and screenshots: ja***@example.com
 * Do not use this for Access Control matching — compare full addresses.
 */
export function maskEmail(email) {
  const normalized = normalizeEmail(email);
  const at = normalized.indexOf('@');
  if (at < 1) return '***';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

/** Mask every email-like token in a free-text audit or report line. */
export function maskEmailsInText(text) {
  return String(text || '').replace(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    (email) => maskEmail(email),
  );
}

/** Default role when the founding owner adds a resident. */
export const DEFAULT_MEMBER_ROLE = 'Reader';

/** Drive permission to apply when sharing the workbook. */
export const DRIVE_ROLE_BY_APP_ROLE = {
  Owner: 'writer',
  Reader: 'reader',
};

export function isFoundingOwner(email) {
  return normalizeEmail(email) === normalizeEmail(FOUNDING_OWNER_EMAIL);
}

/**
 * Resolve the role the app will honor.
 * Founding owner is always Owner, even if the Access Control tab is empty
 * or a stale private sheet listed someone else as Owner.
 */
export function effectiveAppRole(email, aclEntry) {
  if (isFoundingOwner(email)) return 'Owner';
  if (!aclEntry || String(aclEntry.status) !== 'Active') return null;
  return aclEntry.role === 'Owner' ? 'Owner' : 'Reader';
}

export function canCreateSocietySpreadsheet(email) {
  return isFoundingOwner(email);
}

export function canManageUsers(email, role) {
  return isFoundingOwner(email) || role === 'Owner';
}

export function canWriteFinancialData(email, role) {
  return isFoundingOwner(email) || role === 'Owner';
}

export function canGrantOwner(actorEmail) {
  return isFoundingOwner(actorEmail);
}

export function canRemoveUser(targetEmail) {
  return !isFoundingOwner(targetEmail);
}

/**
 * Map a requested role to what this actor is allowed to assign.
 * Non-founders cannot mint Owners — extra Owner rows are forced to Reader.
 */
export function normalizeRequestedRole(requestedRole, actorEmail) {
  if (requestedRole === 'Owner' && canGrantOwner(actorEmail)) return 'Owner';
  return DEFAULT_MEMBER_ROLE;
}
