/**
 * Dashboard Page
 * Premium financial overview with cards, charts, and widgets
 */

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingDown, IndianRupee, Users, AlertCircle,
  RefreshCw, Calendar, Bell, Phone, ArrowRight,
  PieChart, Wallet, Plus, Building2, Info, Table2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { getDashboardData, getAccessControl, parseApiError, ensureSheetStructure } from '../services/googleSheets';
import { STORAGE_KEYS } from '../config/constants';
import { effectiveAppRole, isFoundingOwner } from '../config/accessPolicy';
import { formatCurrency, getCurrentMonthLabel, getCollectionPercentage, daysUntil, getRelativeTime, groupExpensesByCategory, parseJsonSafe, normalizeEmail } from '../utils/helpers';
import { cashStatus } from '../utils/ledgerMath';
import { isMissingSocietySheetError } from '../utils/setupFlow';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Navbar from '../components/common/Navbar';

export default function Dashboard() {
  const { user, isGuest, signOut, signOutGuest } = useAuth();
  const { dashboardData, setDashboardData, setConfig, setUserRole, showToast, setLastSync, lastSync, isOwner, resetSetup } = useApp();
  const [loading, setLoading] = useState(!dashboardData);
  const [refreshing, setRefreshing] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [sheetUpgrade, setSheetUpgrade] = useState(
    sessionStorage.getItem('tpt_sheet_layout_v20') ? 'done' : null
  );
  const [upgradingSheet, setUpgradingSheet] = useState(false);
  const navigate = useNavigate();

  const applySheetLayout = useCallback(async () => {
    setUpgradingSheet(true);
    setSheetUpgrade('pending');
    try {
      await ensureSheetStructure();
      sessionStorage.setItem('tpt_sheet_layout_v20', '1');
      setSheetUpgrade('done');
      showToast('Google Sheet tabs and Balance formulas are up to date.', 'success');
    } catch (err) {
      setSheetUpgrade('error');
      showToast(err.message || 'Could not update the Google Sheet layout', 'error');
    } finally {
      setUpgradingSheet(false);
    }
  }, [showToast]);
  const currentMonth = getCurrentMonthLabel();

  const fetchData = useCallback(async (showRefresh = false) => {
    // Guest users have no Google token — serve cached data from localStorage
    if (isGuest) {
      const data = parseJsonSafe(localStorage.getItem(STORAGE_KEYS.CACHED_DASHBOARD), null);
      if (data) {
        setDashboardData(data);
        setConfig(data.config);
        setUserRole('Reader');
      } else {
        setAccessError(
          'No cached data available for guest access.\n\nAn Owner must sign in with Google on this device first — the app caches data automatically when they visit the Dashboard.'
        );
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await getDashboardData();
      setDashboardData(data);
      setConfig(data.config);
      setLastSync(new Date().toISOString());

      // Determine user role from Access Control sheet
      const userEmail = user?.email;
      if (userEmail) {
        try {
          const acl = await getAccessControl();
          const userAccess = acl.find(a => normalizeEmail(a.email) === normalizeEmail(userEmail) && a.status === 'Active');
          const role = effectiveAppRole(userEmail, userAccess);
          if (role) {
            setUserRole(role);
            if (role === 'Owner' && !sessionStorage.getItem('tpt_sheet_layout_v20')) {
              await applySheetLayout();
            }
          } else {
            signOut();
            navigate('/login');
            showToast(`Access denied: this account is not on the society access list. Contact the founding owner.`, 'error');
            return;
          }
        } catch (aclErr) {
          console.warn('ACL check failed in dashboard:', aclErr);
          if (isFoundingOwner(userEmail)) setUserRole('Owner');
          else setAccessError('Could not verify your role from the Access Control sheet. Check your connection and retry.');
        }
      }

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      if (isMissingSocietySheetError(err) && isFoundingOwner(user?.email)) {
        resetSetup();
        navigate('/setup', { replace: true });
        return;
      }
      const msg = parseApiError(err);
      setAccessError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isGuest, setDashboardData, setConfig, setUserRole, showToast, setLastSync, signOut, navigate, applySheetLayout, resetSetup]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="main-content">
        <Navbar />
        <div className="full-page-center">
          <LoadingSpinner text="Loading dashboard..." />
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="main-content">
        <Navbar />
        <div className="full-page-center">
          <div className="card" style={{ maxWidth: 480, textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={40} style={{ color: 'var(--color-danger)', margin: '0 auto 1rem' }} />
            <h3>Unable to Load Data</h3>
            <p className="text-muted mt-2" style={{ whiteSpace: 'pre-wrap' }}>{accessError}</p>
            <button className="btn btn-primary mt-4" onClick={() => { setAccessError(null); fetchData(); }}>
              <RefreshCw size={16} /> Retry
            </button>
            {isFoundingOwner(user?.email) ? (
              <button
                className="btn btn-secondary mt-2"
                onClick={() => {
                  resetSetup();
                  setAccessError(null);
                  navigate('/setup');
                }}
              >
                Reconnect society sheet
              </button>
            ) : (
              <p className="text-muted text-sm mt-3">
                Only the founding owner can create or reconnect the society spreadsheet.
                Ask that owner to add you as a Reader and share APP-TPT-Tracker as Viewer.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const data = dashboardData;
  const config = data?.config || {};
  const totals = data?.totals || {};
  const currentMonthMaintenance = (data?.maintenance || []).filter(m => m.month === currentMonth);
  const collectionPct = getCollectionPercentage(currentMonthMaintenance);
  const pendingFlats = currentMonthMaintenance.filter(m => m.status === 'PENDING');
  const currentMonthExpenses = (data?.expenses || []).filter(e => e.month === currentMonth);
  const currentMonthExpenseTotal = currentMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const currentMonthCollection = currentMonthMaintenance.reduce((s, m) => s + m.amountPaid, 0);
  const sheetCollection = currentMonthCollection;
  const sheetExpenses = currentMonthExpenseTotal;
  const monthNet = sheetCollection - sheetExpenses;
  const monthStatus = cashStatus(monthNet);
  const availableStatus = totals.availableStatus || cashStatus(totals.currentBalance);

  // Upcoming reminders
  const upcomingReminders = (data?.reminders || [])
    .filter(r => r.status === 'Active' && r.nextDue)
    .sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue))
    .slice(0, 5);

  // Emergency contacts (first 3)
  const quickContacts = (data?.contacts || []).slice(0, 3);

  // Expense categories for current month
  const categoryGroups = groupExpensesByCategory(currentMonthExpenses);
  const categoryEntries = Object.entries(categoryGroups).sort((a, b) => b[1].total - a[1].total);
  const topCategories = categoryEntries.slice(0, 5);
  const stillDueThisMonth = currentMonthMaintenance.reduce((s, m) => s + (Number(m.stillDue) || 0), 0);
  const remindersDueSoon = upcomingReminders.filter((r) => {
    const days = daysUntil(r.nextDue);
    return days <= 7;
  }).length;

  return (
    <div className="main-content">
      <Navbar onRefresh={() => fetchData(true)} refreshing={refreshing} />

      {isGuest && (
        <div className="guest-banner">
          <Info size={16} />
          <span>
            <strong>Guest View</strong> — Read-only. Data from last Owner sync
            {lastSync ? ` on ${new Date(lastSync).toLocaleDateString('en-IN')}` : ''}.
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => { signOutGuest(); navigate('/login'); }}>
            Sign out guest
          </button>
        </div>
      )}

      {isOwner && sheetUpgrade !== 'done' && (
        <div className="guest-banner">
          <Table2 size={16} />
          <span>
            <strong>Update the Google Sheet</strong> — adds the Balance tab and formulas so anyone can see surplus or deficit in Drive.
          </span>
          <button className="btn btn-primary btn-sm" disabled={upgradingSheet} onClick={applySheetLayout}>
            {upgradingSheet || sheetUpgrade === 'pending' ? 'Updating…' : 'Update sheet'}
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {config.APARTMENT_NAME || 'The Pride of Tirumala'} — {currentMonth}
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/expenses')}>
              <Plus size={16} /> Add expenses
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="dashboard-cards grid grid-cols-4 animate-stagger">
        {/* Current Balance */}
        <div className="stat-card stat-card-balance">
          <div className="stat-card-header">
            <span className="stat-card-label">Available balance</span>
            <div className="stat-card-icon-wrap stat-icon-primary">
              <Wallet size={20} />
            </div>
          </div>
          <div className="stat-card-value">
            {formatCurrency(totals.currentBalance || 0)}
          </div>
          <div className="stat-card-trend">
            <span className={availableStatus === 'DEFICIT' ? 'text-danger' : 'text-success'}>
              {availableStatus}
            </span>
            <span className="text-muted"> — opening ₹{Number(totals.openingSurplus || 612).toLocaleString('en-IN')} + collected − spent</span>
          </div>
        </div>

        {/* Monthly Collection */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Collection ({currentMonth})</span>
            <div className="stat-card-icon-wrap stat-icon-success">
              <IndianRupee size={20} />
            </div>
          </div>
          <div className="stat-card-value">{formatCurrency(sheetCollection)}</div>
          <div className="stat-card-trend">
            <span className="text-success">{collectionPct}%</span> collected
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Expenses ({currentMonth})</span>
            <div className="stat-card-icon-wrap stat-icon-danger">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="stat-card-value">{formatCurrency(sheetExpenses)}</div>
          <div className="stat-card-trend">
            {currentMonthExpenses.length} transactions
          </div>
        </div>

        {/* Pending Payments */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Pending Payments</span>
            <div className="stat-card-icon-wrap stat-icon-warning">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-card-value">{pendingFlats.length}</div>
          <div className="stat-card-trend">
            {pendingFlats.length > 0 ? (
              <span className="text-warning">
                Flats: {pendingFlats.map(f => f.flat).join(', ')}
              </span>
            ) : (
              <span className="text-success">All collected! 🎉</span>
            )}
          </div>
        </div>
      </div>

      <div className="widget-row">
        <div className="widget-card">
          <span className="widget-label">Still due this month</span>
          <strong className="widget-value">{formatCurrency(stillDueThisMonth)}</strong>
          <span className="widget-hint">{pendingFlats.length} flat(s) pending</span>
        </div>
        <div className="widget-card">
          <span className="widget-label">This month ({currentMonth})</span>
          <strong className="widget-value">{formatCurrency(monthNet)}</strong>
          <span className="widget-hint">{monthStatus} — collected minus spent</span>
        </div>
        <div className="widget-card">
          <span className="widget-label">Available balance</span>
          <strong className="widget-value">{formatCurrency(Number.isFinite(totals.currentBalance) ? totals.currentBalance : 612)}</strong>
          <span className="widget-hint">{availableStatus} — same figure as the Balance tab in the Google Sheet</span>
        </div>
        <div className="widget-card">
          <span className="widget-label">Reminders due soon</span>
          <strong className="widget-value">{remindersDueSoon}</strong>
          <span className="widget-hint">Due in the next 7 days</span>
        </div>
        <div className="widget-card">
          <span className="widget-label">Last sync</span>
          <strong className="widget-value widget-value-sm">
            {lastSync ? new Date(lastSync).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
          </strong>
          <span className="widget-hint">Use refresh if numbers look stale</span>
        </div>
      </div>

      {/* Second Row: Collection Gauge + Expense Categories */}
      <div className="grid grid-cols-2 mt-6">
        {/* Collection Progress */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">Collection Progress — {currentMonth}</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/maintenance')}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          {/* Progress Ring */}
          <div className="gauge-container">
            <svg className="gauge-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--glass-border)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${collectionPct * 3.14} 314`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="var(--color-success)" />
                </linearGradient>
              </defs>
              <text x="60" y="55" textAnchor="middle" className="gauge-value" fill="var(--color-text)">
                {collectionPct}%
              </text>
              <text x="60" y="72" textAnchor="middle" className="gauge-label" fill="var(--color-text-muted)">
                Collected
              </text>
            </svg>
          </div>

          {/* Flat-wise status */}
          <div className="flat-status-grid">
            {currentMonthMaintenance.map(m => (
              <div
                key={m.flat}
                className={`flat-status-item flat-status-${m.status.toLowerCase()}`}
                title={`Flat ${m.flat}: ${m.status}`}
              >
                <Building2 size={14} />
                <span>{m.flat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">Expense Breakdown — {currentMonth}</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          {topCategories.length > 0 ? (
            <div className="expense-breakdown">
              {topCategories.map(([category, data], i) => {
                const pct = currentMonthExpenseTotal > 0
                  ? Math.round((data.total / currentMonthExpenseTotal) * 100)
                  : 0;
                const colors = [
                  'var(--color-primary)',
                  'var(--color-secondary)',
                  'var(--color-success)',
                  'var(--color-warning)',
                  'var(--color-info)',
                ];
                return (
                  <div key={category} className="expense-bar-item">
                    <div className="expense-bar-header">
                      <span className="expense-bar-label">{category}</span>
                      <span className="expense-bar-value">{formatCurrency(data.total)}</span>
                    </div>
                    <div className="expense-bar-track">
                      <div
                        className="expense-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: colors[i % colors.length],
                          '--progress': `${pct}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: '2rem' }}>
              <PieChart size={40} style={{ opacity: 0.3 }} />
              <p className="mt-2">No expenses recorded for {currentMonth}</p>
            </div>
          )}
        </div>
      </div>

      {/* Third Row: Reminders + Quick Actions + Emergency */}
      <div className="grid grid-cols-3 mt-6">
        {/* Upcoming Reminders */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">
              <Bell size={18} /> Upcoming
            </h4>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reminders')}>
              All <ArrowRight size={14} />
            </button>
          </div>

          {upcomingReminders.length > 0 ? (
            <div className="reminder-list">
              {upcomingReminders.map(r => {
                const days = daysUntil(r.nextDue);
                const urgency = days < 0 ? 'overdue' : days <= 2 ? 'urgent' : days <= 7 ? 'soon' : 'normal';
                return (
                  <div key={r.id} className={`reminder-item reminder-${urgency}`}>
                    <div className="reminder-dot" />
                    <div className="reminder-info">
                      <span className="reminder-title">{r.title}</span>
                      <span className="reminder-due">{getRelativeTime(r.nextDue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted text-sm" style={{ padding: '1rem 0' }}>No upcoming reminders</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h4 className="card-title mb-4">Quick Actions</h4>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => navigate('/expenses')}>
              <Plus size={20} />
              <span>Add Expense</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/maintenance')}>
              <IndianRupee size={20} />
              <span>Record Payment</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/reports')}>
              <Calendar size={20} />
              <span>Monthly Report</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/reminders')}>
              <Bell size={20} />
              <span>Add Reminder</span>
            </button>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">
              <Phone size={18} /> Emergency
            </h4>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/contacts')}>
              All <ArrowRight size={14} />
            </button>
          </div>

          {quickContacts.length > 0 ? (
            <div className="emergency-quick-list">
              {quickContacts.map((c, i) => (
                <a key={i} href={`tel:${c.phone}`} className="emergency-quick-item">
                  <div className="emergency-quick-info">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted">{c.category}</span>
                  </div>
                  <Phone size={16} className="text-success" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm" style={{ padding: '1rem 0' }}>No contacts added yet</p>
          )}
        </div>
      </div>

      {/* Deficit/Opening Balance Note */}
      <div className="deficit-banner mt-6 animate-fade-in deficit-banner-info">
        <AlertCircle size={20} />
        <div>
          <strong>Available balance from the Summary tab: {formatCurrency(sheetAvailableBalance(config))}</strong>
          <p className="text-sm">
            That is the green Available balance cell on the Summary tab. Late fees and surplus/deficit rows from that sheet are not used. History from Summary and Exp-Detailed loads into Maintenance and Expenses so you can view and export it.
          </p>
        </div>
      </div>
    </div>
  );
}
