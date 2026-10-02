import { describe, expect, it } from 'vitest';
import { REPORT_WATER_QUOTE, REPORT_WATER_QUOTE_BY } from '../config/constants';
import { WATER_QUOTES, waterQuoteForMonth } from './waterQuotes';

describe('waterQuoteForMonth', () => {
  it('keeps September on the Franklin line and gives October a different line', () => {
    const sep = waterQuoteForMonth('Sep-26');
    const oct = waterQuoteForMonth('Oct-26');
    expect(sep.text).toBe(REPORT_WATER_QUOTE);
    expect(sep.by).toBe(REPORT_WATER_QUOTE_BY);
    expect(oct.text).not.toBe(sep.text);
    expect(oct.by).toBe('Thomas Fuller');
  });

  it('returns the same line for the same month, and the next line for the next month', () => {
    expect(waterQuoteForMonth('Nov-26')).toEqual(waterQuoteForMonth('Nov-26'));
    expect(waterQuoteForMonth('Nov-26').text).not.toBe(waterQuoteForMonth('Oct-26').text);
    expect(waterQuoteForMonth('Dec-26').text).not.toBe(waterQuoteForMonth('Nov-26').text);
  });

  it('does not invent a line for an unreadable month', () => {
    expect(waterQuoteForMonth('')).toEqual(WATER_QUOTES[0]);
    expect(waterQuoteForMonth('not-a-month')).toEqual(WATER_QUOTES[0]);
  });

  it('keeps resident wording free of society and the workbook name', () => {
    for (const quote of WATER_QUOTES) {
      expect(`${quote.text} ${quote.by}`).not.toMatch(/society/i);
      expect(quote.text).not.toMatch(/APP-TPT-Tracker/);
    }
  });
});