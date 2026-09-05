/**
 * Sidebar Navigation (Desktop)
 */

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Receipt, FileBarChart,
  Bell, Phone, Settings, LogOut, ExternalLink,
  ChevronLeft, Shield, HelpCircle, PartyPopper, IndianRupee
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { getSpreadsheetUrl } from '../../services/googleDrive';
import { APP_NAME, APP_VERSION } from '../../config/constants';
import ThemePicker from './ThemePicker';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/maintenance', icon: Building2, label: 'Maintenance' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/activities', icon: PartyPopper, label: 'Activity Funds' },
  { to: '/payees', icon: IndianRupee, label: 'Payees' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/contacts', icon: Phone, label: 'Emergency' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { sidebarOpen, setSidebarOpen, userRole } = useApp();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  const sheetUrl = getSpreadsheetUrl();

  return (
    <>
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Shield size={24} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">{APP_NAME}</span>
            <span className="sidebar-brand-sub">Expense Tracker · v{APP_VERSION}</span>
          </div>
          <button
            className="btn-ghost btn-icon sidebar-close mobile-only"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
              end={item.to === '/'}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Google Sheet link */}
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-link"
              title={userRole === 'Owner' ? 'Open and edit the spreadsheet' : 'View spreadsheet (read-only)'}
            >
              <ExternalLink size={20} />
              <span>Open Sheet</span>
            </a>
          )}

          <NavLink
            to="/help"
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <HelpCircle size={20} />
            <span>Help</span>
          </NavLink>
        </nav>

        {/* User section */}
        <div className="sidebar-footer">
          <ThemePicker compact />
          {user && (
            <div className="sidebar-user">
              <img
                src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=4f7cff&color=fff&size=32`}
                alt={user.name}
                className="sidebar-avatar"
              />
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-role badge badge-primary">
                  {userRole || '…'}
                </span>
              </div>
            </div>
          )}
          <button
            className="btn btn-ghost sidebar-logout"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
