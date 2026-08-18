/**
 * Top Navbar (Mobile)
 */

import { Menu, RefreshCw } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { APP_SHORT_NAME } from '../../config/constants';

export default function Navbar({ onRefresh, refreshing }) {
  const { toggleSidebar } = useApp();

  return (
    <header className="navbar mobile-only">
      <button
        className="btn-ghost btn-icon"
        onClick={toggleSidebar}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <h1 className="navbar-title">{APP_SHORT_NAME}</h1>
      {onRefresh && (
        <button
          className={`btn-ghost btn-icon ${refreshing ? 'animate-spin' : ''}`}
          onClick={onRefresh}
          aria-label="Refresh data"
          disabled={refreshing}
        >
          <RefreshCw size={20} />
        </button>
      )}
    </header>
  );
}
