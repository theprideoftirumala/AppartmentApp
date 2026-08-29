import { describe, expect, it } from 'vitest';
import { LIVE_APP_START } from '../config/constants';
import { LIVE_SUMMARY_EXPENSE_ROWS } from '../config/liveWorkbook';
import {
  columnLetter,
  liveMonthHeaders,
  liveSummaryStaticAndFormulaGrid,
} from './liveSummaryLayout';

describe('liveMonthHeaders', () => {
  it('starts at Sep-26 and stays on live months', () => {
    expect(LIVE_APP_START).toBe('2026-09');
    const months = liveMonthHeaders('2026-09', 12);
    expect(months[0]).toBe('Sep-26');
    expect(months[11]).toBe('Aug-27');
    expect(months).not.toContain('Aug-26');
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
    expect(formulas.C6).toMatch(/SUMIFS\(Maintenance!D:D/);
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
