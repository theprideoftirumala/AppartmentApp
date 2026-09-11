/**
 * Expert monthly report — one scrollable brief for residents.
 * Charts + money tables. No audit log, watchman cards, or duplicate export.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Download, ImageDown, Send, Mail } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  getMaintenanceRecords, getExpenses, getConfiguration, getFlats,
  parseApiError,
} from '../services/googleSheets';
import { downloadReport, shareReport } from '../services/pdfExport';
import { formatCurrency, formatDate, getCurrentMonthLabel, sheetOpeningSurplus } from '../utils/helpers';
import { useWorkingMonths } from '../hooks/useWorkingMonths';
import { pickDefaultWorkingMonth } from '../utils/months';
import { buildLedger, pdfMoneySummary, ytdRowsFromLedger } from '../utils/ledgerMath';
import {
  categoryChartRows,
  collectionCounts,
  compareBarPercents,
  stillDueHighlights,
  ytdChartRows,
} from '../utils/expertReport';
import { exportReportImage } from '../utils/reportImage';
import { CategoryBars, CollectionDonut, CompareBars, YtdBars } from '../components/reports/ReportCharts';
import ReportSeal from '../components/reports/ReportSeal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Navbar from '../components/common/Navbar';
import { REPORT_NOTE_LINES, REPORT_NOTE_TITLE, SOCIETY_DISCLAIMER } from '../config/constants';

async function loadMonthReport(month) {
  const [allMaintenance, allExpenses, config, flats] = await Promise.all([
    getMaintenanceRecords(),
    getExpenses(),
    getConfiguration(),
    getFlats(),
  ]);
  const maintenance = allMaintenance.filter((row) => row.month === month);
  const expenses = allExpenses.filter((row) => row.month === month);
  const ledger = buildLedger({
    opening: sheetOpeningSurplus(config),
    maintenance: allMaintenance,
    expenses: allExpenses,
  });
  const money = pdfMoneySummary(ledger, month);
  return {
    month,
    apartmentName: config.APARTMENT_NAME || 'The Pride of Tirumala',
    config,
    maintenance,
    expenses,
    flats,
    totalCollection: money.monthCollection,
    totalExpenses: money.monthExpenses,
    netBalance: money.monthNet,
    cumulativeBalance: money.availableBalance,
    openingSurplus: money.openingSurplus,
    monthStatus: money.monthStatus,
    availableStatus: money.availableStatus,
    ledger,
  };
}

export default function Reports() {
  const { showToast } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthLabel());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const reportRef = useRef(null);

  const { months: monthOptions } = useWorkingMonths();

  useEffect(() => {
    if (!monthOptions.length) return;
    setSelectedMonth((current) => (
      monthOptions.includes(current) ? current : pickDefaultWorkingMonth(monthOptions, getCurrentMonthLabel())
    ));
  }, [monthOptions]);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setReportData(await loadMonthReport(selectedMonth));
    } catch (err) {
      showToast(parseApiError(err) || 'Failed to load report data', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const counts = useMemo(() => collectionCounts(reportData?.maintenance), [reportData]);
  const categories = useMemo(
    () => categoryChartRows(reportData?.expenses, reportData?.totalExpenses),
    [reportData],
  );
  const compare = useMemo(
    () => compareBarPercents(reportData?.totalCollection, reportData?.totalExpenses),
    [reportData],
  );
  const ytd = useMemo(
    () => ytdChartRows(reportData?.ledger ? ytdRowsFromLedger(reportData.ledger) : []),
    [reportData],
  );
  const stillDue = useMemo(
    () => stillDueHighlights(reportData?.maintenance),
    [reportData],
  );

  const handleDownload = async () => {
    if (!reportData) return;
    try {
      await downloadReport(reportData);
      showToast(`PDF downloaded: TPT_Report_${reportData.month}.pdf`, 'success');
    } catch (err) {
      showToast(parseApiError(err) || 'Failed to generate PDF', 'error');
    }
  };

  const handleShare = async () => {
    if (!reportData) return;
    try {
      setSharing(true);
      const result = await shareReport(reportData);
      if (result.shared) showToast('Report shared successfully!', 'success');
      else if (result.downloaded) showToast('Report downloaded! Share from your file manager.', 'info');
    } catch (err) {
      showToast(parseApiError(err) || 'Failed to share report', 'error');
    } finally {
      setSharing(false);
    }
  };

  const handleExportImage = async () => {
    if (!reportData) return;
    try {
      setExportingImage(true);
      const fileName = await exportReportImage(reportRef.current, reportData.month);
      showToast(`Image downloaded: ${fileName}`, 'success');
    } catch (err) {
      showToast(parseApiError(err) || 'Failed to export image', 'error');
    } finally {
      setExportingImage(false);
    }
  };

  const handleEmailShare = async () => {
    if (!reportData) return;
    const subject = encodeURIComponent(`${reportData.apartmentName} — ${reportData.month} Monthly Report`);
    const body = encodeURIComponent(
      `Dear Residents,\n\nMonthly report for ${reportData.month}.\n\n` +
      `Collected: ₹${Number(reportData.totalCollection || 0).toLocaleString('en-IN')}\n` +
      `Spent: ₹${Number(reportData.totalExpenses || 0).toLocaleString('en-IN')}\n` +
      `This month: ${reportData.monthStatus} ₹${Math.abs(reportData.netBalance).toLocaleString('en-IN')}\n` +
      `Available: ${reportData.availableStatus} ₹${Number(reportData.cumulativeBalance || 0).toLocaleString('en-IN')}\n\n` +
      `A PDF is in your downloads — please attach it if useful. We will sit with the Balance tab of the shared Google Sheet if any figure needs a second look.\n\nWith regards,\nTPT residents`,
    );
    await downloadReport(reportData);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    showToast('PDF downloaded — attach it to the email that opened.', 'info');
  };

  const rate = reportData?.config?.MONTHLY_MAINTENANCE || 3000;
  const expected = rate * 10;
  const available = reportData?.cumulativeBalance ?? 612;
  const monthClass = reportData?.netBalance < 0 ? 'report-deficit' : 'report-surplus';

  return (
    <div className="main-content">
      <Navbar />

      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Report</h1>
          <p className="page-subtitle">Collected, spent, and available — same figures as the Balance tab of the shared Google Sheet</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: 130 }}
          >
            {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleDownload} disabled={!reportData || loading}>
            <Download size={14} /> PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportImage} disabled={!reportData || loading || exportingImage}>
            <ImageDown size={14} /> {exportingImage ? 'Image…' : 'Image'}
          </button>
          <button className="btn btn-success btn-sm" onClick={handleShare} disabled={!reportData || loading || sharing}>
            <Send size={14} /> {sharing ? 'Sharing...' : 'WhatsApp'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleEmailShare} disabled={!reportData || loading}>
            <Mail size={14} /> Email
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading report..." />
      ) : reportData ? (
        <div className="expert-report animate-fade-in" ref={reportRef} data-report-capture>
          <header className="report-header">
            <h2>{reportData.apartmentName}</h2>
            <p className="report-kicker">Monthly apartment accounts</p>
            <p className="report-month-mark">{reportData.month}</p>
            <p className="report-header-meta">
              Treasurer Flat {reportData.config?.TREASURER_FLAT || '401'}
              {' · '}
              President Flat {reportData.config?.PRESIDENT_FLAT || '102'}
              {' · '}
              Prepared {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </p>
            <div className="report-status-row">
              <span className={`report-status-pill ${monthClass}`}>{reportData.monthStatus} this month</span>
              <span className={`report-status-pill ${available >= 0 ? 'report-surplus' : 'report-deficit'}`}>
                {reportData.availableStatus} available
              </span>
            </div>
          </header>

          <div className="report-summary-grid report-summary-grid-5">
            <div className="report-summary-card">
              <span className="report-summary-label">Opening</span>
              <span className="report-summary-value">{formatCurrency(reportData.openingSurplus)}</span>
              <span className="report-summary-sub">Carry-forward into Sep-26</span>
            </div>
            <div className="report-summary-card report-income">
              <span className="report-summary-label">Collected</span>
              <span className="report-summary-value">{formatCurrency(reportData.totalCollection)}</span>
              <span className="report-summary-sub">{counts.paid}/{counts.total || 10} flats paid</span>
            </div>
            <div className="report-summary-card report-expense">
              <span className="report-summary-label">Spent</span>
              <span className="report-summary-value">{formatCurrency(reportData.totalExpenses)}</span>
              <span className="report-summary-sub">{reportData.expenses.length} payment(s)</span>
            </div>
            <div className={`report-summary-card ${monthClass}`}>
              <span className="report-summary-label">This month</span>
              <span className="report-summary-value">{formatCurrency(reportData.netBalance)}</span>
              <span className="report-summary-sub">Collected − spent</span>
            </div>
            <div className={`report-summary-card ${available >= 0 ? 'report-surplus' : 'report-deficit'}`}>
              <span className="report-summary-label">Available</span>
              <span className="report-summary-value">{formatCurrency(available)}</span>
              <span className="report-summary-sub">Same as the Balance tab</span>
            </div>
          </div>

          <p className="report-glance">
            This month the building collected {formatCurrency(reportData.totalCollection)}, spent {formatCurrency(reportData.totalExpenses)}, and has {formatCurrency(available)} available.
          </p>

          <p className="report-expected">
            Monthly rate {formatCurrency(rate)} × 10 flats = {formatCurrency(expected)} expected.
            Opening {formatCurrency(reportData.openingSurplus)} + collected {formatCurrency(reportData.totalCollection)} − spent {formatCurrency(reportData.totalExpenses)} = {formatCurrency(available)}.
          </p>

          {stillDue.total > 0 && (
            <div className="report-still-due">
              <strong>Still to collect {formatCurrency(stillDue.total)}</strong>
              <p>Flats {stillDue.rows.map((row) => row.flat).join(', ')}. Kindly remind with care — this is only the common account.</p>
            </div>
          )}

          <div className="report-charts-grid">
            <CompareBars
              collection={reportData.totalCollection}
              expenses={reportData.totalExpenses}
              collectionPct={compare.collectionPct}
              expensesPct={compare.expensesPct}
            />
            <CollectionDonut pct={counts.pct} paid={counts.paid} total={counts.total} />
            <CategoryBars rows={categories} />
          </div>

          <section className="card">
            <h3 className="card-title mb-4">Maintenance received</h3>
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
                  {[...reportData.maintenance]
                    .sort((a, b) => String(a.flat).localeCompare(String(b.flat)))
                    .map((row) => {
                      const flatInfo = reportData.flats.find((f) => f.flat === row.flat);
                      return (
                        <tr key={row.flat}>
                          <td className="font-semibold">{row.flat}</td>
                          <td>{flatInfo?.ownerName || `Flat ${row.flat}`}</td>
                          <td>{formatCurrency(row.amountDue)}</td>
                          <td className={row.amountPaid > 0 ? 'text-success font-medium' : ''}>
                            {formatCurrency(row.amountPaid)}
                          </td>
                          <td className="text-muted">{row.paymentDate || '—'}</td>
                          <td>{row.paymentMode || '—'}</td>
                          <td><StatusBadge status={row.status} /></td>
                        </tr>
                      );
                    })}
                  <tr className="report-total-row">
                    <td colSpan={2} className="font-bold">Total</td>
                    <td className="font-bold">{formatCurrency(reportData.maintenance.reduce((s, r) => s + r.amountDue, 0))}</td>
                    <td className="font-bold text-success">{formatCurrency(reportData.totalCollection)}</td>
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>
            {reportData.maintenance.length === 0 && (
              <p className="text-muted text-center" style={{ padding: '1.5rem' }}>No maintenance rows for {reportData.month} yet.</p>
            )}
          </section>

          <section className="card">
            <h3 className="card-title mb-4">Expenses</h3>
            {reportData.expenses.length > 0 ? (
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
                    {reportData.expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="text-muted">{formatDate(exp.date)}</td>
                        <td className="font-medium">{exp.description}</td>
                        <td><span className="badge badge-primary">{exp.category}</span></td>
                        <td className="font-semibold text-danger">{formatCurrency(exp.amount)}</td>
                        <td>{exp.paymentMode}</td>
                        <td>{exp.billReceipt === 'Y' ? 'Yes' : '—'}</td>
                      </tr>
                    ))}
                    <tr className="report-total-row">
                      <td colSpan={3} className="font-bold">Total expenses</td>
                      <td className="font-bold text-danger">{formatCurrency(reportData.totalExpenses)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-center" style={{ padding: '1.5rem' }}>No expenses for {reportData.month}.</p>
            )}
          </section>

          {ytd.length > 0 && (
            <section className="card">
              <h3 className="card-title mb-4">Year to date</h3>
              <div className="report-ytd-legend">
                <span className="report-ytd-swatch report-ytd-collect" /> Collected
                <span className="report-ytd-swatch report-ytd-spend" /> Spent
              </div>
              <YtdBars rows={ytd} />
              <div className="table-container mt-4">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Collected</th>
                      <th>Spent</th>
                      <th>Net</th>
                      <th>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ytd.map((row) => (
                      <tr key={row.month} className={row.month === selectedMonth ? 'row-highlight' : ''}>
                        <td className="font-medium">{row.month}</td>
                        <td className="text-success">{formatCurrency(row.collection)}</td>
                        <td className="text-danger">{formatCurrency(row.expenses)}</td>
                        <td className={row.net >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(row.net)}</td>
                        <td>{formatCurrency(row.running)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="report-closing">
            <div className="report-friendly-note">
              <strong>{REPORT_NOTE_TITLE}</strong>
              {REPORT_NOTE_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            <div className="report-friendly-note report-friendly-disclaimer">
              <p>{SOCIETY_DISCLAIMER}</p>
            </div>

            <div className="report-month-seal">
              <ReportSeal month={reportData.month} />
            </div>
          </div>

          <footer className="report-page-footer">
            {reportData.apartmentName} | Monthly Report {reportData.month} | Treasurer: Flat {reportData.config?.TREASURER_FLAT || '401'} | President: Flat {reportData.config?.PRESIDENT_FLAT || '102'}
          </footer>
        </div>
      ) : null}
    </div>
  );
}
