/**
 * Writes a local CSV stand-in for APP-TPT-Tracker so money math can be
 * checked without Google APIs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLocalWorkbookCsv } from '../src/utils/workbookCsv.js';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'test-fixtures', 'APP-TPT-Tracker');
mkdirSync(outDir, { recursive: true });

const files = buildLocalWorkbookCsv();
for (const [name, csv] of Object.entries(files)) {
  const file = join(outDir, `${name}.csv`);
  writeFileSync(file, csv, 'utf8');
  console.log(`Wrote ${file}`);
}
