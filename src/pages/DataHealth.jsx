/**
 * Owner-only workbook health. Duplicate keys overstate money.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getDashboardData, parseApiError } from '../services/googleSheets';
import Navbar from '../components/common/Navbar';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DataHealth() {
  const { showToast, isOwner, dashboardData, setDashboardData } = useApp();
  const [loading, setLoading] = useState(!dashboardData?.dataHealth);
  const health = dashboardData?.dataHealth;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await getDashboardData();
        if (!cancelled) setDashboardData(data);
      } catch (err) {
        if (!cancelled) showToast(parseApiError(err) || 'Could not check the workbook', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [setDashboardData, showToast]);

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Health</h1>
          <p className="page-subtitle">
            Find duplicate payments or bills before a monthly report is shared. The Google Sheet stays the source of truth.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
          <RefreshCw size={14} /> Recheck
        </button>
      </div>

      {!isOwner && (
        <div className="card">
          <p>Only Owners can review and repair workbook health.</p>
        </div>
      )}

      {isOwner && loading && <LoadingSpinner text="Checking the Google Sheet…" />}

      {isOwner && !loading && health && (
        <div className="data-health-page">
          <div className={`data-health-hero ${health.blocking ? 'data-health-hero-alert' : 'data-health-hero-ok'}`}>
            {health.blocking ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
            <div>
              <h2>{health.blocking ? 'Fix these before publishing' : 'Workbook looks healthy'}</h2>
              <p>{health.summary}</p>
            </div>
          </div>

          {(health.issues || []).length === 0 && (
            <div className="card">
              <p className="text-muted">No duplicate month/flat keys, duplicate bills, unknown flats, or negative amounts.</p>
            </div>
          )}

          {(health.issues || []).map((issue) => (
            <div key={issue.code} className={`card data-health-issue data-health-${issue.severity}`}>
              <h3>{issue.title}</h3>
              <p>{issue.detail}</p>
              {issue.items?.length > 0 && (
                <ul>
                  {issue.items.slice(0, 12).map((item) => (
                    <li key={item}><code>{item}</code></li>
                  ))}
                </ul>
              )}
              {issue.code === 'DUP_MAINT' && (
                <p className="text-sm text-muted mt-2">
                  Open Maintenance in the Google Sheet, keep the correct row, and delete the extra one. Then refresh this page.
                </p>
              )}
              {issue.code === 'DUP_EXP' && (
                <p className="text-sm text-muted mt-2">
                  Open Expenses, confirm which bill is real, and delete the extra row. Then refresh this page.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
