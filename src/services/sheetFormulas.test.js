import { describe, expect, it } from 'vitest';
import { FIRST_APP_MONTH_LABEL, OPENING_SURPLUS } from '../config/constants';
import {
  balanceFormulaCells,
  maintenanceStillDueFormula,
  monthlySummaryFormulaRow,
  pendingDuesStaticRows,
} from './sheetFormulas';

describe('sheet formulas', () => {
  it('still due is due minus paid', () => {
    expect(maintenanceStillDueFormula(2)).toContain('N(C2)-N(D2)');
  });

  it('monthly summary starts running balance from OPENING_SURPLUS', () => {
    const first = monthlySummaryFormulaRow(2);
    expect(first[0]).toContain('SUMIF(Maintenance');
    expect(first[2]).toContain('N(B2)-N(C2)');
    expect(first[3]).toContain('OPENING_SURPLUS');
    expect(first[3]).toContain(String(OPENING_SURPLUS));
    expect(first[4]).toContain('SURPLUS');
    expect(first[4]).toContain('DEFICIT');
  });

  it('Balance tab formulas show available cash and status', () => {
    const cells = balanceFormulaCells();
    expect(cells.B5).toContain('OPENING_SURPLUS');
    expect(cells.B8).toBe('=N(B5)+N(B6)-N(B7)');
    expect(cells.B9).toContain('SURPLUS');
  });

  it('Pending Dues starts on Sep-26', () => {
    const rows = pendingDuesStaticRows();
    expect(rows[2][1]).toBe(FIRST_APP_MONTH_LABEL);
  });
});
