import { describe, expect, it } from 'vitest';
import { cashPathLayout, donutLayout, flatCollectionLayout, horizontalBarLayout } from './analysisCharts';

describe('analysis chart layouts', () => {
  it('draws collected and spent bars plus a running-cash line for each month', () => {
    const layout = cashPathLayout([
      { month: 'Sep-26', collection: 25500, expenses: 14400, running: 11712 },
      { month: 'Oct-26', collection: 15000, expenses: 20000, running: 6712 },
    ], 640, 260);

    expect(layout.empty).toBe(false);
    expect(layout.bars.filter((bar) => bar.kind === 'collected')).toHaveLength(2);
    expect(layout.bars.filter((bar) => bar.kind === 'spent')).toHaveLength(2);
    expect(layout.running).toMatch(/^M/);
    expect(layout.labels.map((label) => label.month)).toEqual(['Sep-26', 'Oct-26']);
    const collected = layout.bars.filter((bar) => bar.kind === 'collected');
    expect(collected[0].height).toBeGreaterThan(collected[1].height);
    expect(layout.bars.every((bar) => bar.height >= 0 && bar.width >= 0)).toBe(true);
  });

  it('does not invent geometry when there are no months', () => {
    const layout = cashPathLayout([], 400, 200);
    expect(layout.empty).toBe(true);
    expect(layout.bars).toEqual([]);
    expect(layout.running).toBe('');
  });

  it('builds a donut whose slices cover the full circle', () => {
    const layout = donutLayout([
      { key: 'PAID', label: 'Paid', value: 8 },
      { key: 'PARTIAL', label: 'Partial', value: 1 },
      { key: 'PENDING', label: 'Pending', value: 1 },
      { key: 'WAIVED', label: 'Waived', value: 0 },
    ]);
    expect(layout.arcs.map((arc) => arc.key)).toEqual(['PAID', 'PARTIAL', 'PENDING']);
    expect(layout.total).toBe(10);
    expect(layout.arcs[0].path.length).toBeGreaterThan(0);
    const sweep = layout.arcs.reduce((sum, arc) => sum + (arc.endAngle - arc.startAngle), 0);
    expect(sweep).toBeCloseTo(Math.PI * 2, 5);
    expect(donutLayout([]).empty).toBe(true);
  });

  it('scales category bars by the amount recorded', () => {
    const layout = horizontalBarLayout([
      { key: 'Watchman Salary', label: 'Watchman Salary', amount: 12000 },
      { key: 'Common Electricity', label: 'Common Electricity', amount: 2400 },
    ], 400);
    expect(layout.bars[0].width).toBeCloseTo(layout.bars[1].width * 5, 5);
    expect(horizontalBarLayout([{ key: 'None', label: 'None', amount: 0 }]).bars[0].width).toBe(0);
  });

  it('draws due and paid lengths for the flats that have a row', () => {
    const layout = flatCollectionLayout([
      { flat: '101', due: 3000, paid: 3000, stillDue: 0 },
      { flat: '501', due: 3000, paid: 0, stillDue: 3000 },
    ], 500);
    expect(layout.bars.map((bar) => bar.flat)).toEqual(['101', '501']);
    expect(layout.bars[0].paidWidth).toBeCloseTo(layout.bars[0].dueWidth, 5);
    expect(layout.bars[1].paidWidth).toBe(0);
    expect(layout.bars[1].dueWidth).toBeGreaterThan(0);
  });
});