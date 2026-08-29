/**
 * Read-only view of the I&E Excel handed over on 29 Aug 2026.
 * Numbers only — no owner names.
 */

import { BookOpen } from 'lucide-react';
import {
  HANDOVER_CASH_SURPLUS,
  HANDOVER_CONTACTS,
  HANDOVER_META,
  HANDOVER_MONTHS,
  HANDOVER_NOTES,
  HANDOVER_PROPERTY,
  HANDOVER_SOURCE,
  LATEST_RECURRING,
  handoverLifetimeTotals,
} from '../data/handoverLedger';
import { formatCurrency } from '../utils/helpers';
import Navbar from '../components/common/Navbar';

export default function Handover() {
  const totals = handoverLifetimeTotals();
  const recent = HANDOVER_MONTHS.slice(-12);

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Handover summary</h1>
          <p className="page-subtitle">
            Copied from {HANDOVER_SOURCE}. Live collections start Sep-26. Owner names are not stored in the app.
          </p>
        </div>
      </div>

      <div className="widget-row">
        <div className="widget-card">
          <span className="widget-label">Cash handed over (29 Aug 2026)</span>
          <strong className="widget-value">{formatCurrency(HANDOVER_CASH_SURPLUS)}</strong>
        </div>
        <div className="widget-card">
          <span className="widget-label">Sheet lifetime collection</span>
          <strong className="widget-value">{formatCurrency(totals.collection)}</strong>
        </div>
        <div className="widget-card">
          <span className="widget-label">Sheet lifetime expenses</span>
          <strong className="widget-value">{formatCurrency(totals.expenses)}</strong>
        </div>
        <div className="widget-card">
          <span className="widget-label">Sheet computed net</span>
          <strong className="widget-value">{formatCurrency(totals.net)}</strong>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="card-title"><BookOpen size={18} /> Property and last closed month</h3>
        <p>{HANDOVER_PROPERTY.name}, {HANDOVER_PROPERTY.area}</p>
        <p className="text-muted">{HANDOVER_PROPERTY.address}. First contribution {HANDOVER_PROPERTY.firstContribution}. {HANDOVER_PROPERTY.flatCount} flats.</p>
        <p className="mt-3">
          {HANDOVER_META.lastClosedMonth}: collected {formatCurrency(HANDOVER_META.lastClosedCollection)},
          spent {formatCurrency(HANDOVER_META.lastClosedExpenses)},
          month surplus {formatCurrency(HANDOVER_META.lastClosedMonthSurplus)},
          carry in {formatCurrency(HANDOVER_META.lastClosedCarryIn)}.
        </p>
        <p className="text-muted">
          Last line in Exp-Detailed: {HANDOVER_META.lastDetailedDate} {formatCurrency(HANDOVER_META.lastDetailedAmount)} ({HANDOVER_META.lastDetailedMemo}).
          Recurring on that month: maintenance ₹{LATEST_RECURRING.monthlyMaintenancePerFlat}/flat,
          watchman ₹{LATEST_RECURRING.watchmanSalary}, garbage ₹{LATEST_RECURRING.garbage},
          water ₹{LATEST_RECURRING.waterCharges}.
        </p>
        <p className="text-muted mt-2">
          The Excel running net was {formatCurrency(HANDOVER_META.sheetComputedNet)}.
          The cash given at handover is {formatCurrency(HANDOVER_CASH_SURPLUS)} — that is the opening balance for Sep-26.
        </p>
      </div>

      <div className="card mt-6">
        <h3 className="card-title">Last 12 months from the Excel</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Collection</th>
                <th>Expenses</th>
                <th>Surplus</th>
                <th>Watchman</th>
                <th>Electricity</th>
                <th>Garbage</th>
                <th>Water</th>
                <th>Sundry</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{formatCurrency(row.collection)}</td>
                  <td>{formatCurrency(row.expenses)}</td>
                  <td>{formatCurrency(row.surplus)}</td>
                  <td>{row.byCategory['Watchman salary'] ? formatCurrency(row.byCategory['Watchman salary']) : '—'}</td>
                  <td>{row.byCategory.Electricity ? formatCurrency(row.byCategory.Electricity) : '—'}</td>
                  <td>{row.byCategory.Garbage ? formatCurrency(row.byCategory.Garbage) : '—'}</td>
                  <td>{row.byCategory.Water ? formatCurrency(row.byCategory.Water) : '—'}</td>
                  <td>{row.byCategory.Sundry ? formatCurrency(row.byCategory.Sundry) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="card-title">Notes and vendor phones from the Excel</h3>
        <ul className="setup-checklist">
          {HANDOVER_NOTES.map((row) => (
            <li key={row[0]}><strong>{row[0]}:</strong> {row[2] || row[1]}</li>
          ))}
          {HANDOVER_CONTACTS.map((row) => (
            <li key={row[1]}><strong>{row[1]}:</strong> {row[3]}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
