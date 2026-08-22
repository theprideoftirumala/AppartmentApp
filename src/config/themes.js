/**
 * Visual themes. Colors live in styles/variables.css as [data-theme="…"].
 * Persist the id in localStorage (STORAGE_KEYS.THEME).
 */

export const DEFAULT_THEME = 'daylight';

export const THEMES = [
  {
    id: 'daylight',
    label: 'Daylight',
    hint: 'Soft paper, easy on the eyes',
    swatch: '#f3efe6',
    accent: '#2f6fed',
    metaColor: '#f3efe6',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    hint: 'Calm navy dark',
    swatch: '#161c28',
    accent: '#6b93ff',
    metaColor: '#121722',
  },
  {
    id: 'temple',
    label: 'Temple',
    hint: 'Warm cream and saffron',
    swatch: '#f6e6c4',
    accent: '#c45c12',
    metaColor: '#f3e3bc',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    hint: 'Deep teal evening',
    swatch: '#0e2630',
    accent: '#2bb3a8',
    metaColor: '#0b1f27',
  },
];

export function isThemeId(value) {
  return THEMES.some((theme) => theme.id === value);
}

export function resolveTheme(value) {
  return isThemeId(value) ? value : DEFAULT_THEME;
}
