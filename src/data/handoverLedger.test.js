import { describe, expect, it } from 'vitest';
import {
  HANDOVER_CASH_SURPLUS,
  HANDOVER_META,
  HANDOVER_MONTHS,
  handoverLifetimeTotals,
  handoverSummaryRows,
  parseHandoverSummaryRows,
} from './handoverLedger';

describe('handover ledger from the I&E Excel', () => {
  it('uses the cash handed over on 29 Aug 2026', () => {
    expect(HANDOVER_CASH_SURPLUS).toBe(612);
    expect(HANDOVER_META.date).toBe('2026-08-29');
    expect(HANDOVER_META.lastClosedMonth).toBe("August '26");
  });

  it('matches lifetime totals copied from the Summary tab', () => {
    const totals = handoverLifetimeTotals();
    expect(HANDOVER_MONTHS).toHaveLength(70);
    expect(totals.collection).toBe(2725200);
    expect(totals.expenses).toBe(2723487.46);
    expect(totals.net).toBe(1712.54);
  });

  it('keeps August 2026 category amounts from the Summary tab', () => {
    const august = HANDOVER_MONTHS[HANDOVER_MONTHS.length - 1];
    expect(august.collection).toBe(30000);
    expect(august.expenses).toBe(29422);
    expect(august.surplus).toBe(578);
    expect(august.byCategory['Watchman salary']).toBe(8500);
    expect(august.byCategory.Garbage).toBe(1500);
    expect(august.byCategory.Water).toBe(1417);
    expect(august.byCategory.Electricity).toBe(2008);
    expect(august.byCategory.Sundry).toBe(13997);
  });

  it('writes one sheet row per month without owner names', () => {
    const rows = handoverSummaryRows();
    expect(rows).toHaveLength(70);
    expect(rows[0][0]).toBe("Nov'20");
    expect(JSON.stringify(rows)).not.toMatch(/Rama|Pavan|Vijay|Nanaji|Veera|Pramod/i);
  });

  it('reads Handover Summary sheet rows back into month objects', () => {
    const parsed = parseHandoverSummaryRows(handoverSummaryRows().slice(-1));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].label).toBe("August '26");
    expect(parsed[0].collection).toBe(30000);
    expect(parsed[0].byCategory['Watchman salary']).toBe(8500);
  });
});
