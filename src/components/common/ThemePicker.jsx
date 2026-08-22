/**
 * Theme swatches — used on login, settings, and the sidebar.
 */

import { useTheme } from '../../contexts/ThemeContext';

export default function ThemePicker({ compact = false }) {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className={`theme-picker ${compact ? 'theme-picker-compact' : ''}`} role="group" aria-label="Color theme">
      {!compact && <p className="theme-picker-label">Appearance</p>}
      <div className="theme-picker-row">
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`theme-swatch ${theme === item.id ? 'theme-swatch-active' : ''}`}
            onClick={() => setTheme(item.id)}
            title={`${item.label} — ${item.hint}`}
            aria-pressed={theme === item.id}
          >
            <span className="theme-swatch-disc" style={{ background: item.swatch, boxShadow: `inset 0 0 0 3px ${item.accent}` }} />
            {!compact && <span className="theme-swatch-name">{item.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
