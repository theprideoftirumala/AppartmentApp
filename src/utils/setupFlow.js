/**
 * When the founding owner should see the create-sheet cards.
 * Only after Drive search succeeds and confirms the workbook is missing.
 * A failed lookup or an already-bound ID must never look like "first-time setup".
 */
export function shouldOfferSheetCreation({
  searchConfirmedEmpty = false,
  lookupFailed = false,
  alreadyBound = false,
} = {}) {
  return Boolean(searchConfirmedEmpty && !lookupFailed && !alreadyBound);
}
