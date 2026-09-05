import { describe, expect, it } from 'vitest';
import {
  coerceMonthLabel,
  nextMonthLabel,
  nextSequentialMonthLabel,
  pickDefaultWorkingMonth,
  sortMonthLabels,
  workingMonthsFromRows,
} from './months';

describe('months', () => {
  it('keeps MMM-YY labels as text', () => {
    expect(coerceMonthLabel('Sep-26')).toBe('Sep-26');
    expect(nextMonthLabel('Sep-26')).toBe('Oct-26');
    expect(nextMonthLabel('Dec-26')).toBe('Jan-27');
  });

  it('sorts and sequences from Sep-26', () => {
    expect(sortMonthLabels(['Oct-26', 'Sep-26'])).toEqual(['Sep-26', 'Oct-26']);
    expect(nextSequentialMonthLabel(['Sep-26'])).toBe('Oct-26');
    expect(workingMonthsFromRows(['Oct-26'], [], 'Sep-26')).toEqual(['Sep-26', 'Oct-26']);
    expect(pickDefaultWorkingMonth(['Sep-26', 'Oct-26'], 'Nov-26')).toBe('Oct-26');
  });
});
