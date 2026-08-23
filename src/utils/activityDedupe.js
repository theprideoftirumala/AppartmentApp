import { normalizeActivityName } from './activityName';

/**
 * Keep the registry/preferred file when several Drive copies share a name.
 * Otherwise keep the oldest created file.
 */
export function pickCanonicalActivityFile(files = [], preferredId = '') {
  if (!files.length) return null;
  if (preferredId) {
    const preferred = files.find((file) => file.id === preferredId);
    if (preferred) return preferred;
  }
  return [...files].sort((a, b) => String(a.createdTime || '').localeCompare(String(b.createdTime || '')))[0];
}

/**
 * Indexes of extra registry rows for the same activity name.
 * Prefer a row whose spreadsheetId is in keepSpreadsheetIds, then an Open row.
 */
export function registryRowsToDrop(rows = [], keepSpreadsheetIds = new Set()) {
  const keep = new Map();
  const drop = [];

  const score = (row) => {
    let value = 0;
    if (keepSpreadsheetIds.has(row.spreadsheetId)) value += 2;
    if (row.status === 'Open') value += 1;
    return value;
  };

  rows.forEach((row, index) => {
    const key = normalizeActivityName(row.name).toLowerCase();
    if (!key) return;
    if (!keep.has(key)) {
      keep.set(key, index);
      return;
    }
    const keptIndex = keep.get(key);
    if (score(row) > score(rows[keptIndex])) {
      drop.push(keptIndex);
      keep.set(key, index);
    } else {
      drop.push(index);
    }
  });

  return drop;
}
