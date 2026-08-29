/**
 * Setup never creates a second society workbook.
 * The Pride of Tirumala-APP must already be in Drive as a Google Sheet.
 */

export function shouldOfferSheetCreation() {
  return false;
}

/** Show upload / convert help when Drive search confirms the APP file is missing. */
export function shouldShowMissingSheetHelp({
  searchConfirmedEmpty = false,
  lookupFailed = false,
  alreadyBound = false,
} = {}) {
  return Boolean(searchConfirmedEmpty && !lookupFailed && !alreadyBound);
}
