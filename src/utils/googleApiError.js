/**
 * Google error bodies often include apis.google.com URLs even when the API
 * is enabled (403, 429, quota). Only treat the real "not enabled" text.
 */

export function isGoogleApiNotEnabledMessage(message, apiLabel) {
  const msg = String(message || '');
  if (!msg) return false;
  const named = new RegExp(`${apiLabel} API has not been used`, 'i');
  return named.test(msg) || /accessNotConfigured/i.test(msg);
}
