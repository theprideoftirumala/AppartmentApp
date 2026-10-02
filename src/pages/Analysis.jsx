/**
 * Analysis page.
 * A separate read of the same cash book. It does not replace the home dashboard
 * and it does not write to the sheet.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { getDashboardData, parseApiError } from '../services/googleSheets';
import { useSelectedWorkingMonth } from '../hooks/useWorkingMonths';
import { analysisForMonth } from '../utils/analysisView';
import { formatCurrency } from '../utils/helpers';
import { openingCardLabel } from '../utils/ledgerMath';
import { AmountBars, CashPathChart, FlatBars, StatusDonut } from '../components/analysis/AnalysisCharts';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Navbar from '../components/common/Navbar';

function changeText(change, noun) {
  if (!change) return `No earlier month on the books to compare ${noun}.`;
  const direction = change.delta === 0 ? 'unchanged' : change.delta > 0 ? 'up' : 'down';
  return `${noun} ${direction} ${formatCurrency(Math.abs(change.delta))} from ${change.previousMonth}.`;
}

export default function Analysis() {
  const { showToast } = useApp();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const {
    months: monthOptions,
    loading: monthsLoading,
    month: selectedMonth,
    setMonth: setSelectedMonth,
  } = useSelectedWorkingMonth();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setBundle(await getDashboardData());
    } catch (err) {
      const message = parseApiError(err) || 'Failed to load the cash book';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const view = useMemo(() => {
    if (!bundle || !selectedMonth) return null;
    return analysisForMonth({
      ledger: bundle.ledger,
      maintenance: bundle.maintenance,
      expenses: bundle.expenses,
      config: bundle.config,
      month: selectedMonth,
    });
  }, [bundle, selectedMonth]);

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Analysis</h1>
          <p className="page-subtitle">Collected, spent, and available from the same cash book. Pick a month that is already on the sheet.</p>
        </div>
        <div className="page-toolbar">
          <label className="page-toolbar-field">
            <span className="sr-only">Analysis month</span>
            <select
              className="form-select"
              value={monthOptions.includes(selectedMonth) ? selectedMonth : ''}
              onChange={(event) => setSelectedMonth(event.target.value)}
              aria-label="Analysis month"
              disabled={monthsLoading}
            >
              {!monthOptions.includes(selectedMonth) && <option value="">Loading months…</option>}
              {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
            </select>
          </label>
        </div>
      </div>

      {loading ? <LoadingSpinner text="Loading analysis..." /> : null}
      {!loading && error ? (
        <div className="card">
          <p>{error}</p>
          <button type="button" className="btn btn-primary mt-3" onClick={load}>Retry</button>
        </div>
      ) : null}

      {!loading && !error && view ? (
        <>
          <section className="analysis-stats" aria-label="Selected month">
            <article className="card analysis-stat">
              <p className="analysis-stat-label">{openingCardLabel(view.money.openingSurplus)}</p>
              <p className="analysis-stat-value">{formatCurrency(view.money.openingSurplus)}</p>
              <p className="text-muted text-sm">After {view.money.openingFromMonth}</p>
            </article>
            <article className="card analysis-stat">
              <p className="analysis-stat-label">Collected</p>
              <p className="analysis-stat-value">{formatCurrency(view.money.monthCollection)}</p>
              <p className="text-muted text-sm">{changeText(view.collectionChange, 'Collected')}</p>
            </article>
            <article className="card analysis-stat">
              <p className="analysis-stat-label">Spent</p>
              <p className="analysis-stat-value">{formatCurrency(view.money.monthExpenses)}</p>
              <p className="text-muted text-sm">{changeText(view.spendChange, 'Spent')}</p>
            </article>
            <article className="card analysis-stat">
              <p className="analysis-stat-label">This month {view.money.monthStatus.toLowerCase()}</p>
              <p className={`analysis-stat-value ${view.money.monthNet < 0 ? 'text-danger' : view.money.monthNet > 0 ? 'text-success' : ''}`}>
                {formatCurrency(view.money.monthNet)}
              </p>
              <p className="text-muted text-sm">Collected minus spent</p>
            </article>
            <article className="card analysis-stat">
              <p className="analysis-stat-label">Available after {view.month}</p>
              <p className="analysis-stat-value">{formatCurrency(view.money.availableBalance)}</p>
              <p className="text-muted text-sm">{view.money.availableStatus}</p>
            </article>
          </section>

          <section className="card analysis-panel">
            <h2 className="card-title">Cash path through {view.month}</h2>
            <p className="text-muted text-sm">Bars are this month’s collected and spent. The line is cash available after each month, starting from the opening surplus.</p>
            <CashPathChart rows={view.ytd} />
            <div className="table-container mt-4">
              <table>
                <caption className="sr-only">Cash path through {view.month}</caption>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Collected</th>
                    <th>Spent</th>
                    <th>This month</th>
                    <th>Available after</th>
                  </tr>
                </thead>
                <tbody>
                  {view.ytd.map((row) => (
                    <tr key={row.month} className={row.month === view.month ? 'row-highlight' : ''}>
                      <td>{row.month}</td>
                      <td>{formatCurrency(row.collection)}</td>
                      <td>{formatCurrency(row.expenses)}</td>
                      <td className={row.net < 0 ? 'text-danger' : 'text-success'}>{formatCurrency(row.net)}</td>
                      <td>{formatCurrency(row.running)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="analysis-grid">
            <section className="card analysis-panel">
              <h2 className="card-title">Collection status</h2>
              <p className="text-muted text-sm">
                {view.counts.paid} paid, {view.counts.partial} partial, {view.counts.pending} pending
                {view.counts.total ? ` of ${view.counts.total}` : ''}.
                {' '}Still to collect {formatCurrency(view.stillDue.total)} from {view.stillDue.rows.length} flat(s).
              </p>
              <StatusDonut slices={view.statuses} />
            </section>
            <section className="card analysis-panel">
              <h2 className="card-title">Where the money went</h2>
              <p className="text-muted text-sm">{view.expenseCount} expense {view.expenseCount === 1 ? 'line' : 'lines'} in {view.month}.</p>
              <AmountBars rows={view.categories} label="expense categories" />
              <p className="text-muted text-sm mt-4">
                Water categories this month: {formatCurrency(view.water.amount)} across {view.water.count} {view.water.count === 1 ? 'line' : 'lines'}.
              </p>
            </section>
          </div>

          <div className="analysis-grid">
            <section className="card analysis-panel">
              <h2 className="card-title">How expenses were paid</h2>
              <AmountBars rows={view.modes} label="expense payment modes" />
            </section>
            <section className="card analysis-panel">
              <h2 className="card-title">Flats this month</h2>
              <p className="text-muted text-sm">Each flat’s amount due and the amount recorded as paid. Flat numbers only.</p>
              <FlatBars rows={view.flats} />
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
