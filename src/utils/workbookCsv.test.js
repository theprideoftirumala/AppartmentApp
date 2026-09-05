import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIRST_APP_MONTH_LABEL, OPENING_SURPLUS, SHEET_FILE_NAME, SHEET_NAMES } from '../config/constants';
import { buildLedger } from './ledgerMath';
import {
  buildLocalWorkbookCsv,
  expensesFromCsvRows,
  maintenanceFromCsvRows,
  parseCsv,
} from './workbookCsv';

describe('local APP-TPT-Tracker CSV workbook', () => {
  it('writes every core tab and evaluates surplus from the files', () => {
    const csvByTab = buildLocalWorkbookCsv();
    const outDir = join(process.cwd(), 'test-fixtures', 'APP-TPT-Tracker');
    mkdirSync(outDir, { recursive: true });

    for (const [name, csv] of Object.entries(csvByTab)) {
      writeFileSync(join(outDir, `${name}.csv`), csv, 'utf8');
    }

    expect(SHEET_FILE_NAME).toBe('APP-TPT-Tracker');
    expect(csvByTab[SHEET_NAMES.BALANCE]).toMatch(/Opening surplus/);
    expect(csvByTab[SHEET_NAMES.CONFIGURATION]).toMatch(String(OPENING_SURPLUS));
    expect(csvByTab[SHEET_NAMES.MAINTENANCE]).toMatch(FIRST_APP_MONTH_LABEL);
    expect(csvByTab[SHEET_NAMES.MONTHLY_SUMMARY]).toMatch('SURPLUS');

    const maintenance = maintenanceFromCsvRows(parseCsv(readFileSync(join(outDir, 'Maintenance.csv'), 'utf8')));
    const expenses = expensesFromCsvRows(parseCsv(readFileSync(join(outDir, 'Expenses.csv'), 'utf8')));
    const ledger = buildLedger({ opening: OPENING_SURPLUS, maintenance, expenses });

    expect(ledger.months[0].month).toBe('Sep-26');
    expect(ledger.opening).toBe(612);
    expect(ledger.available).toBe(6712);
    expect(ledger.status).toBe('SURPLUS');
    expect(ledger.months[1].status).toBe('DEFICIT');
  });
});
