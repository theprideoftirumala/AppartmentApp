/**
 * Top Navbar (Mobile)
 */

import { Menu, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { pageTitleForPath } from '../../utils/pageTitles';

export default function Navbar({ onRefresh, refreshing }) {
  const { toggleSidebar } = useApp();
  const { pathname } = useLocation();
  const title = pageTitleForPath(pathname);

  return (
    <header className="navbar mobile-only">
      <button
        className="btn-ghost btn-icon"
        onClick={toggleSidebar}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <h1 className="navbar-title">{title}</h1>
      {onRefresh ? (
        <button
          className={`btn-ghost btn-icon ${refreshing ? 'animate-spin' : ''}`}
          onClick={onRefresh}
          aria-label="Refresh data"
          disabled={refreshing}
        >
          <RefreshCw size={20} />
        </button>
      ) : (
        <span className="navbar-spacer" aria-hidden="true" />
      )}
    </header>
  );
}
