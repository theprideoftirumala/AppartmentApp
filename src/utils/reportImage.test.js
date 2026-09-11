import { describe, expect, it } from 'vitest';
import { reportImageFileName, reportImageScale } from './reportImage';

describe('reportImageFileName', () => {
  it('uses the month label in a PNG name', () => {
    expect(reportImageFileName('Sep-26')).toBe('TPT_Report_Sep-26.png');
  });
});

describe('reportImageScale', () => {
  it('stays between 1 and 2', () => {
    const scale = reportImageScale();
    expect(scale).toBeGreaterThanOrEqual(1);
    expect(scale).toBeLessThanOrEqual(2);
  });
});
