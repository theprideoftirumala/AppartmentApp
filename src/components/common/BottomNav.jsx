/**
 * Bottom Navigation Bar (Mobile)
 */

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Receipt, FileBarChart, Menu } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

const bottomNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/maintenance', icon: Building2, label: 'Payments' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
];

export default function BottomNav() {
  const { toggleSidebar } = useApp();
  const { isGuest } = useAuth();
  const items = isGuest ? bottomNavItems.filter((item) => item.to === '/') : bottomNavItems;

  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'bottom-nav-active' : ''}`
          }
          end={item.to === '/'}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button
        className="bottom-nav-item"
        onClick={toggleSidebar}
        aria-label="More options"
      >
        <Menu size={20} />
        <span>More</span>
      </button>
    </nav>
  );
}
