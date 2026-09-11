import { describe, expect, it } from 'vitest';
import { PAGE_TITLES, pageTitleForPath } from './pageTitles';

describe('pageTitleForPath', () => {
  it('returns the short label for known routes', () => {
    expect(pageTitleForPath('/')).toBe('Home');
    expect(pageTitleForPath('/reports')).toBe('Report');
    expect(pageTitleForPath('/health')).toBe('Data Health');
  });

  it('strips a trailing slash except on the home route', () => {
    expect(pageTitleForPath('/expenses/')).toBe('Expenses');
    expect(pageTitleForPath('/')).toBe('Home');
  });

  it('falls back for unknown or empty paths', () => {
    expect(pageTitleForPath('/not-a-page')).toBe('TPT');
    expect(pageTitleForPath('')).toBe('TPT');
    expect(pageTitleForPath()).toBe('TPT');
  });

  it('covers every signed-in route residents can open', () => {
    expect(Object.keys(PAGE_TITLES)).toEqual(expect.arrayContaining([
      '/',
      '/maintenance',
      '/expenses',
      '/reports',
      '/activities',
      '/payees',
      '/reminders',
      '/contacts',
      '/settings',
      '/help',
      '/health',
    ]));
  });
});
