/**
 * Loading Spinner Component
 */

export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = { sm: 24, md: 40, lg: 56 };
  const s = sizes[size] || sizes.md;

  return (
    <div className="loading-spinner-container">
      <div
        className="loading-spinner"
        style={{ width: s, height: s }}
        role="status"
        aria-label="Loading"
      >
        <svg viewBox="0 0 50 50">
          <circle
            cx="25" cy="25" r="20"
            fill="none"
            stroke="url(#spinner-gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="80, 200"
            strokeDashoffset="0"
          />
          <defs>
            <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-secondary)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}
