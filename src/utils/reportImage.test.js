import { describe, expect, it } from 'vitest';
import { reportImageFileName } from './reportImage';

describe('reportImageFileName', () => {
  it('uses the month label in a PNG name', () => {
    expect(reportImageFileName('Sep-26')).toBe('TPT_Report_Sep-26.png');
  });
});
