/**
 * Theme state for the whole app, including the login screen.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../config/constants';
import { DEFAULT_THEME, resolveTheme, THEMES } from '../config/themes';

const ThemeContext = createContext(null);

function applyThemeToDocument(themeId) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  document.documentElement.setAttribute('data-theme', theme.id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.metaColor);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return resolveTheme(localStorage.getItem(STORAGE_KEYS.THEME));
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    applyThemeToDocument(theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(resolveTheme(next));
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme,
    themes: THEMES,
  }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
