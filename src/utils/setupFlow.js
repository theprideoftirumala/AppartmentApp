/**
 * Founding owner may create APP-TPT-Tracker when Drive search finds none.
 * Members never create a society workbook.
 */

export function shouldOfferSheetCreation({
  isFounder = false,
  searchConfirmedEmpty = false,
  lookupFailed = false,
  alreadyBound = false,
} = {}) {
  return Boolean(isFounder && searchConfirmedEmpty && !lookupFailed && !alreadyBound);
}

export function shouldShowMissingSheetHelp({
  searchConfirmedEmpty = false,
  lookupFailed = false,
  alreadyBound = false,
} = {}) {
  return Boolean(searchConfirmedEmpty && !lookupFailed && !alreadyBound);
}
