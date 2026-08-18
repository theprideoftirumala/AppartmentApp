/**
 * Reports Page
 * Comprehensive monthly report with:
 * - Payment Received Summary
 * - Expenses Report (detailed + category)
 * - Activities Performed
 * - Watchman Details
 * - PDF Download + Share (mobile)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Download, RefreshCw, Send, Share2, FileText,
  IndianRupee, Receipt, Activity, Shield, Eye, Users
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  getMaintenanceRecords, getExpenses, getConfiguration, getFlats,
  updateMonthlySummary, getMonthlySummaries,
  getWatchmanDetails, getAuditLogForMonth, getReminders,
} from '../services/googleSheets';
import { downloadReport, shareReport } from '../services/pdfExport';
import { formatCurrency, formatDate, getCurrentMonthLabel, getFiscalMonthOptions, groupExpensesByCategory } from '../utils/helpers';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Navbar from '../components/common/Navbar';

export default function Reports() {
  const { showToast } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthLabel());
  const [reportData, setReportData] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');
  const monthOptions = getFiscalMonthOptions();

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const [maintenance, expenses, config, flats, watchman, activities, reminders] = await Promise.all([
        getMaintenanceRecords(selectedMonth),
        getExpenses(selectedMonth),
        getConfiguration(),
        getFlats(),
        getWatchmanDetails(),
        getAuditLogForMonth(selectedMonth).catch(() => []),
        getReminders().catch(() => []),
      ]);

      const totalCollection = maintenance.reduce((s, r) => s + r.amountPaid, 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const netBalance = totalCollection - totalExpenses;

      // Find reminders completed in this month
      const remindersCompleted = reminders.filter(r => {
        if (!r.lastCompleted) return false;
        try {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const parts = selectedMonth.split('-');
          const monthIdx = monthNames.indexOf(parts[0]);
          const fullYear = 2000 + Number(parts[1]);
          const completedDate = new Date(r.lastCompleted);
          return completedDate.getMonth() === monthIdx && completedDate.getFullYear() === fullYear;
        } catch {
          return false;
        }
      });

      setReportData({
        month: selectedMonth,
        apartmentName: config.APARTMENT_NAME || 'The Pride of Tirumala',
        config,
        maintenance,
        expenses,
        flats,
        watchman: watchman.filter(w => w.status === 'Active'),
        activities,
        remindersCompleted,
        totalCollection,
        totalExpenses,
        netBalance,
        cumulativeBalance: netBalance + (config.DEFICIT_LAST_YEAR || 0),
      });
    } catch (err) {
      showToast('Failed to load report data', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, showToast]);

  const loadSummaries = useCallback(async () => {
    try {
      const data = await getMonthlySummaries();
      setSummaries(data);
    } catch (err) {
      console.error('Failed to load summaries:', err);
    }
  }, []);

  useEffect(() => {
    loadReport();
    loadSummaries();
  }, [loadReport, loadSummaries]);

  const handleDownload = () => {
    if (!reportData) return;
    try {
      downloadReport(reportData);
      showToast('PDF report downloaded!', 'success');
    } catch (err) {
      showToast('Failed to generate PDF', 'error');
    }
  };

  const handleShare = async () => {
    if (!reportData) return;
    try {
      setSharing(true);
      const result = await shareReport(reportData);
      if (result.shared) {
        showToast('Report shared successfully!', 'success');
      } else if (result.downloaded) {
        showToast('Report downloaded! Share from your file manager.', 'info');
      } else if (result.cancelled) {
        // User cancelled sharing
      }
    } catch (err) {
      showToast('Failed to share report', 'error');
    } finally {
      setSharing(false);
    }
  };

  const handleUpdateSummary = async () => {
    try {
      setGenerating(true);
      await updateMonthlySummary(selectedMonth);
      showToast('Monthly summary updated in Google Sheet', 'success');
      loadSummaries();
    } catch (err) {
      showToast('Failed to update summary', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Compute category groups for display
  const categoryGroups = reportData ? groupExpensesByCategory(reportData.expenses) : {};
  const sortedCategories = Object.entries(categoryGroups).sort((a, b) => b[1].total - a[1].total);

  const sections = [
    { id: 'summary', label: 'Summary', icon: IndianRupee },
    { id: 'payments', label: 'Payments', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'activities', label: 'Activities', icon: Activity },
    { id: 'watchman', label: 'Watchman', icon: Shield },
    { id: 'ytd', label: 'Year-to-Date', icon: FileText },
  ];

  return (
    <div className="main-content">
      <Navbar />

      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Reports</h1>
          <p className="page-subtitle">Comprehensive financial report with PDF export</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            className="form-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: 130 }}
          >
            {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={handleUpdateSummary} disabled={generating}>
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            Sync Sheet
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleDownload} disabled={!reportData || loading}>
            <Download size={14} /> PDF
          </button>
          <button className="btn btn-success btn-sm" onClick={handleShare} disabled={!reportData || loading || sharing}>
            <Send size={14} /> {sharing ? 'Sharing...' : 'Send'}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading report data..." />
      ) : reportData ? (
        <>
          {/* Section Tabs */}
          <div className="report-tabs">
            {sections.map(s => (
              <button
                key={s.id}
                className={`report-tab ${activeSection === s.id ? 'report-tab-active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <s.icon size={14} /> {s.label}
              </button>
            ))}
          </div>

          <div className="report-content animate-fade-in">
            {/* ─── SUMMARY ─────────────────────────────────────── */}
            {activeSection === 'summary' && (
              <div className="card">
                <div className="report-header">
                  <h2>{reportData.apartmentName}</h2>
                  <p className="text-muted">Monthly Financial Report — {reportData.month}</p>
                </div>

                {/* Financial Summary Cards */}
                <div className="report-summary-grid">
                  <div className="report-summary-card report-income">
                    <span className="report-summary-label">Total Collection</span>
                    <span className="report-summary-value">{formatCurrency(reportData.totalCollection)}</span>
                    <span className="report-summary-sub">
                      {reportData.maintenance.filter(m => m.status === 'PAID').length}/{reportData.maintenance.length} flats paid
                    </span>
                  </div>
                  <div className="report-summary-card report-expense">
                    <span className="report-summary-label">Total Expenses</span>
                    <span className="report-summary-value">{formatCurrency(reportData.totalExpenses)}</span>
                    <span className="report-summary-sub">
                      {reportData.expenses.length} transaction(s)
                    </span>
                  </div>
                  <div className={`report-summary-card ${reportData.netBalance >= 0 ? 'report-surplus' : 'report-deficit'}`}>
                    <span className="report-summary-label">Net Balance</span>
                    <span className="report-summary-value">{formatCurrency(reportData.netBalance)}</span>
                    <span className="report-summary-sub">
                      Cumulative: {formatCurrency(reportData.cumulativeBalance)}
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="report-quick-stats mt-6">
                  <div className="report-stat">
                    <span>Monthly Maintenance</span>
                    <strong>{formatCurrency(reportData.config.MONTHLY_MAINTENANCE)} × 10 flats</strong>
                  </div>
                  <div className="report-stat">
                    <span>Expected Collection</span>
                    <strong>{formatCurrency((reportData.config.MONTHLY_MAINTENANCE || 3000) * 10)}</strong>
                  </div>
                  <div className="report-stat">
                    <span>Deficit Carry Forward</span>
                    <strong className="text-danger">{formatCurrency(reportData.config.DEFICIT_LAST_YEAR)}</strong>
                  </div>
                  <div className="report-stat">
                    <span>Activities This Month</span>
                    <strong>{reportData.activities.length}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ─── PAYMENTS RECEIVED ───────────────────────────── */}
            {activeSection === 'payments' && (
              <div className="card">
                <h3 className="card-title mb-4">Received Payment Summary — {reportData.month}</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Flat</th>
                        <th>Owner</th>
                        <th>Due</th>
                        <th>Paid</th>
                        <th>Date</th>
                        <th>Mode</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.maintenance
                        .sort((a, b) => a.flat.localeCompare(b.flat))
                        .map(r => {
                          const flatInfo = reportData.flats.find(f => f.flat === r.flat);
                          return (
                            <tr key={r.flat}>
                              <td className="font-semibold">{r.flat}</td>
                              <td>{flatInfo?.ownerName || `Flat ${r.flat}`}</td>
                              <td>{formatCurrency(r.amountDue)}</td>
                              <td className={r.amountPaid > 0 ? 'text-success font-medium' : ''}>
                                {formatCurrency(r.amountPaid)}
                              </td>
                              <td className="text-muted">{r.paymentDate || '-'}</td>
                              <td>{r.paymentMode || '-'}</td>
                              <td><StatusBadge status={r.status} /></td>
                            </tr>
                          );
                        })}
                      <tr style={{ background: 'var(--glass-bg)' }}>
                        <td colSpan={2} className="font-bold">TOTAL</td>
                        <td className="font-bold">{formatCurrency(reportData.maintenance.reduce((s, r) => s + r.amountDue, 0))}</td>
                        <td className="font-bold text-success">{formatCurrency(reportData.totalCollection)}</td>
                        <td colSpan={3}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── EXPENSES ────────────────────────────────────── */}
            {activeSection === 'expenses' && (
              <>
                <div className="card">
                  <h3 className="card-title mb-4">Expenses Report — {reportData.month}</h3>

                  {reportData.expenses.length > 0 ? (
                    <>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Description</th>
                              <th>Category</th>
                              <th>Amount</th>
                              <th>Mode</th>
                              <th>Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.expenses.map(e => (
                              <tr key={e.id}>
                                <td className="text-muted">{formatDate(e.date)}</td>
                                <td className="font-medium">{e.description}</td>
                                <td><span className="badge badge-primary">{e.category}</span></td>
                                <td className="font-semibold text-danger">{formatCurrency(e.amount)}</td>
                                <td>{e.paymentMode}</td>
                                <td>{e.billReceipt === 'Y' ? '✓' : '—'}</td>
                              </tr>
                            ))}
                            <tr style={{ background: 'var(--glass-bg)' }}>
                              <td colSpan={3} className="font-bold">TOTAL EXPENSES</td>
                              <td className="font-bold text-danger">{formatCurrency(reportData.totalExpenses)}</td>
                              <td colSpan={2}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Category Breakdown */}
                      <h4 className="mt-6 mb-4">Category-wise Breakdown</h4>
                      <div className="expense-breakdown">
                        {sortedCategories.map(([category, data], i) => {
                          const pct = reportData.totalExpenses > 0
                            ? Math.round((data.total / reportData.totalExpenses) * 100) : 0;
                          const colors = [
                            'var(--color-primary)', 'var(--color-secondary)', 'var(--color-success)',
                            'var(--color-warning)', 'var(--color-info)', 'var(--color-danger)',
                          ];
                          return (
                            <div key={category} className="expense-bar-item">
                              <div className="expense-bar-header">
                                <span className="expense-bar-label">{category} ({data.count})</span>
                                <span className="expense-bar-value">{formatCurrency(data.total)} ({pct}%)</span>
                              </div>
                              <div className="expense-bar-track">
                                <div
                                  className="expense-bar-fill"
                                  style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted text-center" style={{ padding: '2rem' }}>
                      No expenses recorded for {reportData.month}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ─── ACTIVITIES ──────────────────────────────────── */}
            {activeSection === 'activities' && (
              <div className="card">
                <h3 className="card-title mb-4">Activities Performed — {reportData.month}</h3>

                {reportData.activities.length > 0 ? (
                  <div className="activities-list">
                    {reportData.activities
                      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
                      .map((activity, i) => (
                        <div key={i} className="activity-item">
                          <div className="activity-dot" />
                          <div className="activity-content">
                            <div className="activity-action">
                              <span className="badge badge-info">{activity.action}</span>
                              <span className="activity-user">{activity.user?.split('@')[0]}</span>
                            </div>
                            <p className="activity-details">{activity.details}</p>
                            <span className="activity-time">{formatDate(activity.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted text-center" style={{ padding: '2rem' }}>
                    No activities recorded for {reportData.month}
                  </p>
                )}

                {/* Completed Reminders */}
                {reportData.remindersCompleted.length > 0 && (
                  <>
                    <h4 className="mt-6 mb-4">Reminders / Tasks Completed</h4>
                    <div className="completed-reminders">
                      {reportData.remindersCompleted.map((r, i) => (
                        <div key={i} className="completed-reminder-item">
                          <span className="completed-check">✅</span>
                          <div>
                            <span className="font-medium">{r.title}</span>
                            {r.lastCompleted && (
                              <span className="text-muted text-xs ml-2">
                                Completed: {formatDate(r.lastCompleted)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─── WATCHMAN DETAILS ────────────────────────────── */}
            {activeSection === 'watchman' && (
              <div className="card">
                <h3 className="card-title mb-4">Watchman Details</h3>

                {reportData.watchman.length > 0 ? (
                  <div className="watchman-grid">
                    {reportData.watchman.map((w, i) => (
                      <div key={i} className="watchman-card">
                        <div className="watchman-card-header">
                          <div className="watchman-avatar">
                            <Shield size={24} />
                          </div>
                          <div>
                            <h4 className="watchman-name">{w.name}</h4>
                            <span className="badge badge-success">{w.status}</span>
                          </div>
                        </div>
                        <div className="watchman-details-grid">
                          <div className="watchman-detail">
                            <span className="watchman-detail-label">Phone</span>
                            <a href={`tel:${w.phone}`} className="watchman-detail-value text-success">{w.phone || '-'}</a>
                          </div>
                          <div className="watchman-detail">
                            <span className="watchman-detail-label">Alt. Phone</span>
                            <span className="watchman-detail-value">{w.altPhone || '-'}</span>
                          </div>
                          <div className="watchman-detail">
                            <span className="watchman-detail-label">Shift</span>
                            <span className="watchman-detail-value">{w.shiftTiming || '-'}</span>
                          </div>
                          <div className="watchman-detail">
                            <span className="watchman-detail-label">Salary</span>
                            <span className="watchman-detail-value font-semibold">{formatCurrency(w.salary)}</span>
                          </div>
                          <div className="watchman-detail">
                            <span className="watchman-detail-label">Join Date</span>
                            <span className="watchman-detail-value">{w.joinDate || '-'}</span>
                          </div>
                          <div className="watchman-detail">
                            <span className="watchman-detail-label">ID Proof</span>
                            <span className="watchman-detail-value">{w.idProofType ? `${w.idProofType}: ${w.idProofNumber}` : '-'}</span>
                          </div>
                          <div className="watchman-detail">
                            <span className="watchman-detail-label">Address</span>
                            <span className="watchman-detail-value">{w.address || '-'}</span>
                          </div>
                          <div className="watchman-detail">
                            <span className="watchman-detail-label">Emergency Contact</span>
                            <span className="watchman-detail-value">{w.emergencyContact ? `${w.emergencyContact} (${w.emergencyPhone})` : '-'}</span>
                          </div>
                        </div>
                        {w.remarks && (
                          <p className="watchman-remarks text-muted text-sm mt-3">
                            Note: {w.remarks}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center" style={{ padding: '2rem' }}>
                    No watchman details added yet. Go to Settings to add watchman information.
                  </p>
                )}
              </div>
            )}

            {/* ─── YEAR-TO-DATE ────────────────────────────────── */}
            {activeSection === 'ytd' && summaries.length > 0 && (
              <div className="card">
                <h3 className="card-title mb-4">Year-to-Date Summary</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Collection</th>
                        <th>Expenses</th>
                        <th>Net</th>
                        <th>Cumulative</th>
                        <th>Collection %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaries.map(s => (
                        <tr key={s.month} className={s.month === selectedMonth ? 'row-highlight' : ''}>
                          <td className="font-medium">{s.month}</td>
                          <td className="text-success">{formatCurrency(s.totalCollection)}</td>
                          <td className="text-danger">{formatCurrency(s.totalExpenses)}</td>
                          <td className={s.netBalance >= 0 ? 'text-success' : 'text-danger'}>
                            {formatCurrency(s.netBalance)}
                          </td>
                          <td>{formatCurrency(s.cumulativeBalance)}</td>
                          <td>{s.collectionPct}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
