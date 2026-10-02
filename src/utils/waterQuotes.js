/**
 * One public-domain water line per month on the books.
 * Sep-26 is the Franklin line already used on the report. Later months step through
 * the list, then repeat. The same month always returns the same line.
 */

import { FIRST_APP_MONTH_LABEL, REPORT_WATER_QUOTE, REPORT_WATER_QUOTE_BY } from '../config/constants';
import { parseMonthLabel } from './months';

export const WATER_QUOTES = [
  { text: REPORT_WATER_QUOTE, by: REPORT_WATER_QUOTE_BY },
  { text: 'We never know the worth of water till the well is dry.', by: 'Thomas Fuller' },
  { text: 'Water, water, every where, nor any drop to drink.', by: 'Samuel Taylor Coleridge' },
  { text: 'Water is the best of things.', by: 'Pindar' },
  { text: 'Man may be without fire, but never was any man without water.', by: 'Plutarch' },
  {
    text: 'Little drops of water, little grains of sand, make the mighty ocean and the pleasant land.',
    by: 'Julia Carney',
  },
];

export function waterQuoteForMonth(monthLabel) {
  const target = parseMonthLabel(monthLabel);
  const start = parseMonthLabel(FIRST_APP_MONTH_LABEL);
  if (!target || !start) return WATER_QUOTES[0];
  const index = (target.year - start.year) * 12 + (target.month - start.month);
  const slot = index < 0 ? 0 : index % WATER_QUOTES.length;
  return WATER_QUOTES[slot];
}
