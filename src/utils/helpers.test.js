import { describe, expect, it } from 'vitest';
import { formatCurrency, maskIdNumber, maskPhone, sanitizeForSheet, sheetAvailableBalance } from './helpers';

describe('sanitizeForSheet', () => {
  it('strips formula prefixes', () => {
    expect(sanitizeForSheet('=HYPERLINK("https://evil.com")')).toBe('HYPERLINK("https://evil.com")');
    expect(sanitizeForSheet('+cmd')).toBe('cmd');
    expect(sanitizeForSheet('@sum')).toBe('sum');
  });

  it('returns empty for nullish values', () => {
    expect(sanitizeForSheet(null)).toBe('');
    expect(sanitizeForSheet(undefined)).toBe('');
  });
});

describe('maskPhone', () => {
  it('masks a 10-digit Indian mobile', () => {
    expect(maskPhone('9876543210')).toBe('98******10');
  });

  it('returns an em dash when empty', () => {
    expect(maskPhone('')).toBe('—');
  });
});

describe('maskIdNumber', () => {
  it('keeps only the last 4 characters', () => {
    expect(maskIdNumber('123456789012')).toBe('********9012');
  });
});

describe('formatCurrency', () => {
  it('formats rupees with the Indian grouping', () => {
    expect(formatCurrency(3000)).toBe('₹3,000');
    expect(formatCurrency(null)).toBe('₹0');
  });
});

describe('sheetAvailableBalance', () => {
  it('reads a finite number from Configuration', () => {
    expect(sheetAvailableBalance({ AVAILABLE_BALANCE: 1732.54 })).toBe(1732.54);
  });

  it('returns 0 when the sheet value is missing', () => {
    expect(sheetAvailableBalance({})).toBe(0);
    expect(sheetAvailableBalance(undefined)).toBe(0);
  });
});
