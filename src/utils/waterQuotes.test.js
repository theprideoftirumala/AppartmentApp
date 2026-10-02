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

  it('steps one public-domain line per month and repeats after six', () => {
    const expected = [
      ['Sep-26', 'When the well is dry, we know the worth of water.', 'Benjamin Franklin'],
      ['Oct-26', 'We never know the worth of water till the well is dry.', 'Thomas Fuller'],
      ['Nov-26', 'Water, water, every where, nor any drop to drink.', 'Samuel Taylor Coleridge'],
      ['Dec-26', 'Water is the best of things.', 'Pindar'],
      ['Jan-27', 'Man may be without fire, but never was any man without water.', 'Plutarch'],
      ['Feb-27', 'Little drops of water, little grains of sand, make the mighty ocean and the pleasant land.', 'Julia Carney'],
    ];
    for (const [label, text, by] of expected) {
      expect(waterQuoteForMonth(label)).toEqual({ text, by });
    }
    expect(waterQuoteForMonth('Mar-27')).toEqual(waterQuoteForMonth('Sep-26'));
    expect(waterQuoteForMonth('Aug-26')).toEqual(WATER_QUOTES[0]);
    const lines = expected.map(([label]) => waterQuoteForMonth(label).text);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('keeps resident wording free of society and the workbook name', () => {
    for (const quote of WATER_QUOTES) {
      expect(`${quote.text} ${quote.by}`).not.toMatch(/society/i);
      expect(quote.text).not.toMatch(/APP-TPT-Tracker/);
    }
  });
});