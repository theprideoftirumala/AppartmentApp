/**
 * Read-only browse + view of the manually kept I&E Google Sheet.
 * Hash route: #/importedsheet
 * Does not bind or write APP / LIVE.
 */

import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FolderSearch, RefreshCw } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import {
  clearImportedSnapshot,
  getImportedSnapshot,
  importWorkbookReadOnly,
  listBrowsableSpreadsheets,
} from '../services/importedSheet';
import { parseApiError } from '../services/googleSheets';
import {
  collectionTotalForMonth,
  expensesForMonth,
  expenseTotalForMonth,
  pickImportedMonth,
} from '../utils/importedIandE';
import { downloadImportedExpenseCsv, downloadImportedExpensePdf } from '../utils/importedExpenseExport';
import { formatCurrency, getCurrentMonthLabel } from '../utils/helpers';

export default function ImportedSheet() {
  const { isGuest } = useAuth();
  const { showToast } = useApp();
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [paste, setPaste] = useState('');
  const [listing, setListing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [view, setView] = useState(() => getImportedSnapshot());
  const [month, setMonth] = useState(() => {
    const snap = getImportedSnapshot();
    return pickImportedMonth(snap?.months || [], getCurrentMonthLabel());
  });

  const browse = async () => {
    if (isGuest) {
      showToast('Sign in with Google to browse Drive. This page only reads.', 'error');
      return;
    }
    try {
      setListing(true);
      setFiles(await listBrowsableSpreadsheets(search));
    } catch (err) {
      showToast(parseApiError(err) || 'Could not list Google Sheets. Paste a link instead.', 'error');
    } finally {
      setListing(false);
    }
  };

  useEffect(() => {
    if (isGuest) return undefined;
    let cancelled = false;
    listBrowsableSpreadsheets('')
      .then((list) => { if (!cancelled) setFiles(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isGuest]);

  const importFile = async (input) => {
    try {
      setImporting(true);
      const next = await importWorkbookReadOnly(input);
      setView(next);
      setMonth(pickImportedMonth(next.months, getCurrentMonthLabel()));
      showToast(`Imported ${next.fileName} (read-only). APP and LIVE were not changed.`, 'success');
    } catch (err) {
      showToast(err.message || parseApiError(err) || 'Could not read that sheet', 'error');
    } finally {
      setImporting(false);
    }
  };

  const monthExpenses = expensesForMonth(view?.expenses, month);
  const currentLabel = getCurrentMonthLabel();

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Imported I&E sheet</h1>
          <p className="page-subtitle">
            Browse a Google Sheet in Drive and read it only. Use the manually kept I&E Summary
            (Nov 2020 through August 2026 and any months you added). This does not replace APP or LIVE.
          </p>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="card-title"><FolderSearch size={18} /> Browse Drive (read-only)</h3>
        <p className="text-muted text-sm mb-3">
          Lists Google Sheets this account can see. The app does not write to the file you pick.
          If the file is still .xlsx, open it with Google Sheets first.
        </p>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Search name</label>
            <input
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="I&E, Pride, Summary…"
            />
          </div>
          <button type="button" className="btn btn-secondary" onClick={browse} disabled={listing || isGuest}>
            <RefreshCw size={16} /> {listing ? 'Listing…' : 'Browse'}
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">Or paste a Google Sheet link</label>
          <div className="flex gap-2 flex-wrap">
            <input
              className="form-input"
              style={{ minWidth: 240, flex: 1 }}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
            />
            <button type="button" className="btn btn-primary" disabled={importing || !paste} onClick={() => importFile(paste)}>
              Import
            </button>
          </div>
        </div>
        {listing ? (
          <LoadingSpinner text="Listing Google Sheets…" />
        ) : (
          <div className="imported-file-list">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                className="imported-file-row"
                disabled={importing}
                onClick={() => importFile(file.id)}
              >
                <FileSpreadsheet size={16} />
                <span className="imported-file-name">{file.name}</span>
                <span className="text-muted text-sm">{file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : ''}</span>
              </button>
            ))}
            {!files.length && !isGuest && (
              <p className="text-muted">No Google Sheets in this search. Clear the name and browse again, or paste a link.</p>
            )}
          </div>
        )}
      </div>

      {view && (
        <>
          <div className="maintenance-summary animate-fade-in">
            <div className="maintenance-stat">
              <span className="maintenance-stat-label">File</span>
              <span className="maintenance-stat-value">{view.fileName}</span>
            </div>
            <div className="maintenance-stat">
              <span className="maintenance-stat-label">Available balance</span>
              <span className="maintenance-stat-value">{view.availableBalance == null ? '—' : formatCurrency(view.availableBalance)}</span>
            </div>
            <div className="maintenance-stat">
              <span className="maintenance-stat-label">Last updated</span>
              <span className="maintenance-stat-value">{view.lastUpdated || '—'}</span>
            </div>
            <div className="maintenance-stat">
              <span className="maintenance-stat-label">Access</span>
              <span className="maintenance-stat-value">Read-only</span>
            </div>
          </div>

          <div className="card mt-4">
            <div className="flex gap-2 items-center flex-wrap">
              <label className="form-label" htmlFor="imported-month">Month</label>
              <select
                id="imported-month"
                className="form-select"
                style={{ width: 140 }}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {(view.months || []).map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
              {month === currentLabel && <span className="badge badge-primary">Current month</span>}
              <span className="text-muted">
                Collection {formatCurrency(collectionTotalForMonth(view.collections, month))}
                {' · '}
                Expenses {formatCurrency(expenseTotalForMonth(view.expenses, month))}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!monthExpenses.length}
                onClick={() => downloadImportedExpenseCsv(monthExpenses, month, view.fileName)}
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!monthExpenses.length}
                onClick={() => downloadImportedExpensePdf(monthExpenses, month, view.fileName)}
              >
                <Download size={14} /> Export PDF
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { clearImportedSnapshot(); setView(null); }}
              >
                Clear import
              </button>
            </div>
          </div>

          <div className="card mt-4">
            <h3 className="card-title">Collections — {month || '—'}</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Flat</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {(view.collections || [])
                    .filter((row) => row.month === month)
                    .map((row) => (
                      <tr key={`${row.flat}-${row.month}`}>
                        <td>{row.flat}</td>
                        <td>{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!(view.collections || []).some((row) => row.month === month) && (
                <p className="text-muted">No collection rows for this month on the imported Summary.</p>
              )}
            </div>
          </div>

          <div className="card mt-4">
            <h3 className="card-title">
              Expenses — {month || '—'}
              {month === currentLabel ? ' (current month)' : ''}
            </h3>
            <p className="text-muted text-sm mb-3">
              Line items from Exp - Detailed, plus Summary category rows that are not already on Exp - Detailed.
            </p>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {monthExpenses.map((row) => (
                    <tr key={row.id}>
                      <td>{row.date || '—'}</td>
                      <td>{row.description}</td>
                      <td>{row.category}</td>
                      <td>{formatCurrency(row.amount)}</td>
                      <td className="text-muted">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!monthExpenses.length && (
                <p className="text-muted">No expenses for this month on the imported sheet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
