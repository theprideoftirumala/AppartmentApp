import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, isThemeId, resolveTheme } from './themes';

describe('resolveTheme', () => {
  it('keeps a known theme', () => {
    expect(resolveTheme('temple')).toBe('temple');
  });

  it('falls back to daylight for unknown values', () => {
    expect(resolveTheme('neon')).toBe(DEFAULT_THEME);
    expect(resolveTheme('')).toBe(DEFAULT_THEME);
  });
});

describe('isThemeId', () => {
  it('accepts only defined theme ids', () => {
    expect(isThemeId('daylight')).toBe(true);
    expect(isThemeId('midnight')).toBe(true);
    expect(isThemeId('paper')).toBe(false);
  });
});
