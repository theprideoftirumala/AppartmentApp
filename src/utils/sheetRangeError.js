/**
 * Google Sheets returns HTTP 400 "Unable to parse range: 'Tab'!A1"
 * when that tab is missing (or the bound file is still Excel).
 */

export function isMissingSheetRangeError(error) {
  const msg = String(
    error?.result?.error?.message
    || error?.error?.message
    || error?.message
    || '',
  );
  return /Unable to parse range/i.test(msg);
}
