import { describe, expect, it } from 'vitest';
import { maintenanceStillDueFormula, monthlySummaryFormulaRow } from './sheetFormulas';

describe('maintenanceStillDueFormula', () => {
  it('is due minus paid and stays blank when the row has no month', () => {
    expect(maintenanceStillDueFormula(12)).toBe('=IF(OR(A12="",C12=""),"",MAX(0,N(C12)-N(D12)))');
  });
});

describe('monthlySummaryFormulaRow', () => {
  it('sums Maintenance and Expenses using a text month even if column A is a date', () => {
    const row = monthlySummaryFormulaRow(2);
    expect(row[0]).toContain('SUMIF(Maintenance!A:A');
    expect(row[0]).toContain('TEXT(A2,"MMM-YY")');
    expect(row[2]).toContain('SUMIF(Expenses!C:C');
  });
});
