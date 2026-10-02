import { describe, expect, it } from 'vitest';
import {
  coerceMonthLabel,
  nextMonthLabel,
  nextSequentialMonthLabel,
  dropdownMonthOnOptions,
  pickDefaultWorkingMonth,
  previousMonthLabel,
  sortMonthLabels,
  workingMonthsFromRows,
} from './months';

describe('months', () => {
  it('keeps MMM-YY labels as text', () => {
    expect(coerceMonthLabel('Sep-26')).toBe('Sep-26');
    expect(nextMonthLabel('Sep-26')).toBe('Oct-26');
    expect(nextMonthLabel('Dec-26')).toBe('Jan-27');
    expect(previousMonthLabel('Sep-26')).toBe('Aug-26');
    expect(previousMonthLabel('Jan-27')).toBe('Dec-26');
  });

  it('sorts and sequences from Sep-26', () => {
    expect(sortMonthLabels(['Oct-26', 'Sep-26'])).toEqual(['Sep-26', 'Oct-26']);
    expect(nextSequentialMonthLabel(['Sep-26'])).toBe('Oct-26');
    expect(workingMonthsFromRows(['Oct-26'], [], 'Sep-26')).toEqual(['Sep-26', 'Oct-26']);
    expect(pickDefaultWorkingMonth(['Sep-26', 'Oct-26'], 'Nov-26')).toBe('Oct-26');
    expect(pickDefaultWorkingMonth(['Sep-26', 'Oct-26'], 'Oct-26')).toBe('Oct-26');
  });

  it('selects the current month once the real list is ready, and keeps a later choice', () => {
    const months = ['Sep-26', 'Oct-26'];
    expect(dropdownMonthOnOptions({
      months,
      selected: 'Sep-26',
      settle: false,
      currentLabel: 'Oct-26',
    })).toBe('Oct-26');
    expect(dropdownMonthOnOptions({
      months,
      selected: 'Sep-26',
      settle: true,
      currentLabel: 'Oct-26',
    })).toBe('Sep-26');
    expect(dropdownMonthOnOptions({
      months,
      selected: '',
      settle: true,
      currentLabel: 'Oct-26',
    })).toBe('');
    expect(dropdownMonthOnOptions({
      months,
      selected: 'Nov-26',
      settle: true,
      currentLabel: 'Oct-26',
    })).toBe('Oct-26');
  });

  it('uses the latest real month when the current month is not on the sheet', () => {
    expect(pickDefaultWorkingMonth(['Sep-26'], 'Oct-26')).toBe('Sep-26');
    expect(pickDefaultWorkingMonth([], 'Oct-26')).toBe('Oct-26');
    expect(pickDefaultWorkingMonth([], '')).toBe('Sep-26');
    expect(dropdownMonthOnOptions({
      months: ['Sep-26', null, ''],
      selected: 'Oct-26',
      settle: false,
      currentLabel: 'Oct-26',
    })).toBe('Sep-26');
  });

  it('keeps a newly added month after the list has already settled', () => {
    expect(dropdownMonthOnOptions({
      months: ['Sep-26', 'Oct-26', 'Nov-26'],
      selected: 'Nov-26',
      settle: true,
      currentLabel: 'Oct-26',
    })).toBe('Nov-26');
  });
});
