/**
 * Short titles for the mobile navbar so residents know which page they are on.
 * Longer page headings stay in each screen's header.
 */

export const PAGE_TITLES = {
  '/': 'Home',
  '/maintenance': 'Payments',
  '/expenses': 'Expenses',
  '/reports': 'Report',
  '/activities': 'Activities',
  '/payees': 'Payees',
  '/reminders': 'Reminders',
  '/contacts': 'Emergency',
  '/settings': 'Settings',
  '/help': 'Help',
  '/health': 'Data Health',
  '/setup': 'Setup',
  '/login': 'Sign in',
};

const FALLBACK_TITLE = 'TPT';

export function pageTitleForPath(pathname) {
  if (!pathname) return FALLBACK_TITLE;
  const path = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return PAGE_TITLES[path] || FALLBACK_TITLE;
}
