import { describe, expect, it } from 'vitest';
import { LIVE_APP_START } from '../config/constants';
import { LIVE_SUMMARY_EXPENSE_ROWS } from '../config/liveWorkbook';
import {
  columnLetter,
  liveMonthHeaders,
  liveSummaryCollectionFormula,
  liveSummaryNeedsFormulaRepair,
  liveSummaryStaticAndFormulaGrid,
  LIVE_SUMMARY_FORMULA_VERSION,
  nextSequentialMonthLabel,
  parseLiveSummarySnapshot,
  coerceMonthLabel,
  incrementMonthLabel,
  pickDefaultWorkingMonth,
  plannedLiveMonths,
  workingMonthLabels,
} from './liveSummaryLayout';

describe('liveMonthHeaders', () => {
  it('starts at Aug-26 and does not prebuild a full year', () => {
    expect(LIVE_APP_START).toBe('2026-08');
    expect(liveMonthHeaders()).toEqual(['Aug-26']);
    const months = liveMonthHeaders('2026-08', 3);
    expect(months).toEqual(['Aug-26', 'Sep-26', 'Oct-26']);
    expect(months).not.toContain('Jul-26');
  });
});

describe('nextSequentialMonthLabel', () => {
  it('starts at Aug-26 and appends the next calendar month', () => {
    expect(nextSequentialMonthLabel([])).toBe('Aug-26');
    expect(nextSequentialMonthLabel(['Aug-26'])).toBe('Sep-26');
    expect(nextSequentialMonthLabel(['Dec-26'])).toBe('Aug-26');
    expect(nextSequentialMonthLabel(['Aug-26', 'Dec-26'])).toBe('Sep-26');
    expect(incrementMonthLabel('Dec-26')).toBe('Jan-27');
    expect(nextSequentialMonthLabel(['Aug-26', 'Oct-26'])).toBe('Sep-26');
    expect(workingMonthLabels(['Sep-26'])).toEqual(['Aug-26', 'Sep-26']);
    expect(plannedLiveMonths(['Jul-26', 'Sep-26', 'Sep-26'])).toEqual(['Aug-26', 'Sep-26']);
    expect(plannedLiveMonths([])).toEqual(['Aug-26']);
    expect(pickDefaultWorkingMonth(['Aug-26', 'Sep-26'], 'Sep-26')).toBe('Sep-26');
    expect(pickDefaultWorkingMonth(['Aug-26'], 'Oct-26')).toBe('Aug-26');
  });

  it('reads Aug-26 from text or from an Excel date serial', () => {
    expect(coerceMonthLabel('Aug-26')).toBe('Aug-26');
    const serial = Math.round((Date.UTC(2026, 7, 1) - Date.UTC(1899, 11, 30)) / 86400000);
    expect(coerceMonthLabel(serial)).toBe('Aug-26');
  });
});

describe('columnLetter', () => {
  it('maps 0 to A and 2 to C', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(2)).toBe('C');
  });
});

describe('liveSummaryStaticAndFormulaGrid', () => {
  it('uses Summary-tab expense labels and formula cells for collections and Sundry', () => {
    expect(LIVE_SUMMARY_EXPENSE_ROWS.some((row) => row.label === 'Sundry expenses')).toBe(true);
    const { values, formulas } = liveSummaryStaticAndFormulaGrid(1732.54, ['Sep-26', 'Oct-26']);
    expect(values[1][1]).toBe(1732.54);
    expect(values[4][2]).toBe('Sep-26');
    expect(formulas.C6).toMatch(/ARRAYFORMULA/);
    expect(formulas.C6).toContain('TO_TEXT');
    expect(formulas.C6).toContain('VALUE');
    expect(formulas.C6).toContain('"Sep-26"');
    expect(formulas.C6).not.toMatch(/C\$5/);
    expect(formulas.D6).toContain('"Oct-26"');
    expect(formulas.D6).not.toMatch(/C\$5/);
    expect(formulas.C6).toBe(liveSummaryCollectionFormula('Sep-26', 6));
    expect(liveSummaryCollectionFormula('Aug-26', 6)).toContain('=2026');
    expect(liveSummaryCollectionFormula('Aug-26', 6)).toContain('=8');
    expect(values[3][0]).toBe(LIVE_SUMMARY_FORMULA_VERSION);
    expect(formulas.C32).toMatch(/C16/);
    expect(formulas.C33).toMatch(/\$B\$2/);
    expect(formulas.D33).toMatch(/C33/);
    const sundryRow = values.find((row) => row[0] === 'Sundry expenses');
    expect(sundryRow[1]).toBe('Sundry');
    const serviceRow = values.find((row) => row[0] === 'Service charges');
    expect(serviceRow[1]).toBe('Repairs & Maintenance');
    const serviceCell = Object.entries(formulas).find(([cell, formula]) => {
      const rowIndex = Number(cell.replace(/^[A-Z]+/, ''));
      return rowIndex === values.findIndex((row) => row[0] === 'Service charges') + 1 && formula === '=0';
    });
    expect(serviceCell).toBeTruthy();
    expect(Object.values(formulas).some((f) => f.includes('Sundry'))).toBe(true);
  });
});

describe('parseLiveSummarySnapshot', () => {
  it('reads collection, surplus, and running from the formula rows', () => {
    const rows = [];
    rows[1] = ['Opening', 100];
    rows[4] = ['Flat', 'Owner', 'Sep-26'];
    rows[15] = ['Collection total', '', 30000];
    rows[30] = ['Total expenses', '', 10000];
    rows[31] = ['Monthly surplus (deficit)', '', 20000];
    rows[32] = ['Running available balance', '', 20100];
    const snap = parseLiveSummarySnapshot(rows, 'Sep-26');
    expect(snap.collection).toBe(30000);
    expect(snap.surplus).toBe(20000);
    expect(snap.running).toBe(20100);
  });
});

describe('liveSummaryNeedsFormulaRepair', () => {
  it('repairs the Sep-26 column that still points at C$5', () => {
    expect(liveSummaryNeedsFormulaRepair([
      '=IFERROR(SUMIFS(Maintenance!D:D,Maintenance!A:A,C$5,Maintenance!B:B,$A15),0)',
    ], LIVE_SUMMARY_FORMULA_VERSION)).toBe(true);
  });

  it('repairs text-month SUMIFS that still fail when month or flat types differ', () => {
    expect(liveSummaryNeedsFormulaRepair([
      '=IFERROR(SUMIFS(Maintenance!D:D,Maintenance!A:A,"Aug-26",Maintenance!B:B,$A6),0)',
    ], LIVE_SUMMARY_FORMULA_VERSION)).toBe(true);
  });

  it('repairs SUMPRODUCT formulas that Google Sheets cannot expand', () => {
    expect(liveSummaryNeedsFormulaRepair([
      '=IFERROR(SUMPRODUCT((((TO_TEXT(Maintenance!A$2:A$5000)="Aug-26")+(IFERROR(TEXT(Maintenance!A$2:A$5000,"MMM-YY"),"")="Aug-26"))>0)*(TO_TEXT(Maintenance!B$2:B$5000)=TO_TEXT($A6))*(N(Maintenance!D$2:D$5000))),0)',
    ], LIVE_SUMMARY_FORMULA_VERSION)).toBe(true);
  });

  it('leaves ARRAYFORMULA lookups alone when the version stamp is present', () => {
    expect(liveSummaryNeedsFormulaRepair([
      liveSummaryCollectionFormula('Aug-26', 6),
    ], LIVE_SUMMARY_FORMULA_VERSION)).toBe(false);
  });

  it('repairs when the version stamp is missing', () => {
    expect(liveSummaryNeedsFormulaRepair([
      '=IFERROR(SUMIFS(Maintenance!D:D,Maintenance!A:A,"Aug-26",Maintenance!B:B,$A6),0)',
    ], '')).toBe(true);
  });
});
