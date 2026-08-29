/**
 * gapi.client methods return a Thenable with .then, but not always .catch.
 * Wrap every Google client call so await / .catch always work (especially on phones).
 */
export function gapiCall(thenable) {
  return Promise.resolve(thenable);
}

/** Same wrap, with a fallback when the sheet tab is missing or the call fails. */
export function gapiCallSafe(thenable, fallback) {
  return gapiCall(thenable).catch(() => fallback);
}
