import { describe, expect, it } from 'vitest';
import { OPENING_SURPLUS, buildLedger, pdfMoneySummary } from '../utils/ledgerMath';
import { downloadReport, generateMonthlyReport } from './pdfExport';
import {
  PDF_EDITIONS,
  editionFileName,
  isClassicEdition,
  renderEdition,
} from './pdfEditions';

function sampleReport() {
  const maintenance = [
    { flat: '101', status: 'PAID', amountDue: 3000, amountPaid: 3000, stillDue: 0, month: 'Sep-26' },
    { flat: '202', status: 'PENDING', amountDue: 3000, amountPaid: 0, stillDue: 3000, month: 'Sep-26' },
  ];
  const expenses = [
    { id: 'e1', month: 'Sep-26', date: '2026-09-04', category: 'Water', description: 'Tanker', amount: 1400, paymentMode: 'UPI' },
  ];
  const ledger = buildLedger({ opening: OPENING_SURPLUS, maintenance, expenses });
  const money = pdfMoneySummary(ledger, 'Sep-26');
  return {
    month: 'Sep-26',
    apartmentName: 'The Pride of Tirumala',
    config: { TREASURER_FLAT: '401', PRESIDENT_FLAT: '102', MONTHLY_MAINTENANCE: 3000 },
    maintenance,
    expenses,
    flats: [{ flat: '202', ownerName: 'DoNotPrint' }],
    ledger,
    totalCollection: money.monthCollection,
    totalExpenses: money.monthExpenses,
    netBalance: money.monthNet,
    cumulativeBalance: money.availableBalance,
    openingSurplus: money.openingSurplus,
    openingFromMonth: money.openingFromMonth,
    monthStatus: money.monthStatus,
    availableStatus: money.availableStatus,
  };
}

function pdfText(doc) {
  return [...String(doc.output()).matchAll(/\(((?:\\\)|[^)])*)\) Tj/g)]
    .map((match) => match[1].replace(/\\([()])/g, '$1'))
    .join('\n');
}

describe('pdf editions', () => {
  it('keeps classic on the existing generator', () => {
    expect(PDF_EDITIONS.map((item) => item.version)).toEqual([1, 2, 3, 4, 5]);
    expect(isClassicEdition('classic')).toBe(true);
    expect(editionFileName('classic', 'Sep-26')).toBe('TPT_Report_Sep-26.pdf');
    expect(typeof downloadReport).toBe('function');
    expect(typeof generateMonthlyReport).toBe('function');
  });

  it('refuses to rebuild the classic PDF from the new module', async () => {
    await expect(renderEdition('classic', sampleReport())).rejects.toThrow(/Classic/);
  });

  it('prints the same story in versions 2–5 without naming a flat', async () => {
    const report = sampleReport();
    for (const edition of PDF_EDITIONS.filter((item) => item.version > 1)) {
      const doc = await renderEdition(edition.id, report);
      const text = pdfText(doc);
      expect(text).toContain('Sep-26');
      expect(text).toContain('612');
      expect(text).toContain('Google Sheet is the source of truth');
      expect(text).toContain('When the well is dry');
      expect(text.toLowerCase()).not.toContain('society');
      expect(text).not.toContain('APP-TPT-Tracker');
      expect(text).not.toMatch(/flat\s*202/i);
      expect(text).not.toContain('DoNotPrint');
      expect(doc.internal.getNumberOfPages()).toBeGreaterThan(0);
      if (edition.id === 'brief' || edition.id === 'notice') {
        expect(doc.internal.getNumberOfPages()).toBe(1);
      }
    }
  });

  it('prints Franklin on a September classic PDF and the next line on every October edition', async () => {
    const september = pdfText(await generateMonthlyReport(sampleReport()));
    expect(september).toContain('When the well is dry');
    expect(september).toContain('Benjamin Franklin');

    const october = { ...sampleReport(), month: 'Oct-26' };
    const classic = pdfText(await generateMonthlyReport(october));
    expect(classic).toContain('We never know the worth of water');
    expect(classic).toContain('Thomas Fuller');
    expect(classic).not.toContain('When the well is dry');

    for (const edition of PDF_EDITIONS.filter((item) => item.version > 1)) {
      const text = pdfText(await renderEdition(edition.id, october));
      expect(text).toContain('Thomas Fuller');
      expect(text).not.toContain('When the well is dry');
      expect(text.toLowerCase()).not.toContain('society');
    }
  });
});
