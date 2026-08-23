/**
 * gapi.client methods return a Thenable with .then, but not always .catch.
 * Wrap every Google client call so await / .catch always work (especially on phones).
 */
export function gapiCall(thenable) {
  return Promise.resolve(thenable);
}
