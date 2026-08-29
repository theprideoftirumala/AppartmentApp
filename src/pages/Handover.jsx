/**
 * Read-only view of Nov 2020–Aug 2026 history.
 * Prefers the Handover Summary / Society Notes / Contacts tabs so sheet edits show here.
 */

import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import {
  HANDOVER_AVAILABLE_BALANCE,
  HANDOVER_CONTACTS,
  HANDOVER_META,
  HANDOVER_MONTHS,
  HANDOVER_NOTES,
  HANDOVER_PROPERTY,
  HANDOVER_SOURCE,
  LATEST_RECURRING,
  handoverLifetimeTotals,
} from '../data/handoverLedger';
import { getEmergencyContacts, getHandoverSummary, getSocietyNotes } from '../services/googleSheets';
import { formatCurrency } from '../utils/helpers';
import Navbar from '../components/common/Navbar';

export default function Handover() {
  const [months, setMonths] = useState(HANDOVER_MONTHS);
  const [notes, setNotes] = useState(HANDOVER_NOTES);
  const [contacts, setContacts] = useState(HANDOVER_CONTACTS);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getHandoverSummary().catch(() => []),
      getSocietyNotes().catch(() => []),
      getEmergencyContacts().catch(() => []),
    ]).then(([sheetMonths, sheetNotes, sheetContacts]) => {
      if (!mounted) return;
      if (sheetMonths.length) setMonths(sheetMonths);
      if (sheetNotes.length) setNotes(sheetNotes);
      if (sheetContacts.length) {
        setContacts(sheetContacts.map((row) => [
          row.category || '',
          row.name || '',
          row.role || '',
          row.phone || '',
          row.altPhone || '',
          row.address || '',
          row.notes || '',
        ]));
      }
    });
    return () => { mounted = false; };
  }, []);

  const totals = handoverLifetimeTotals(months);
  const recent = months.slice(-12);

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Handover summary</h1>
          <p className="page-subtitle">
            From {HANDOVER_SOURCE}. History is also copied into Maintenance and Expenses so Reports can export it. Surplus/deficit and late-fee rows on Summary are not used.
          </p>
        </div>
      </div>

      <div className="widget-row">
        <div className="widget-card">
          <span className="widget-label">Available balance (29 Aug 2026)</span>
          <strong className="widget-value">{formatCurrency(HANDOVER_AVAILABLE_BALANCE)}</strong>
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
          spent {formatCurrency(HANDOVER_META.lastClosedExpenses)}.
        </p>
        <p className="text-muted">
          Last line in Exp-Detailed: {HANDOVER_META.lastDetailedDate} {formatCurrency(HANDOVER_META.lastDetailedAmount)} ({HANDOVER_META.lastDetailedMemo}).
          Recurring on that month: maintenance ₹{LATEST_RECURRING.monthlyMaintenancePerFlat}/flat,
          watchman ₹{LATEST_RECURRING.watchmanSalary}, garbage ₹{LATEST_RECURRING.garbage},
          water ₹{LATEST_RECURRING.waterCharges}.
        </p>
        <p className="text-muted mt-2">
          The Summary tab Available balance of {formatCurrency(HANDOVER_AVAILABLE_BALANCE)} is the final figure. The app does not add a separate surplus or deficit.
        </p>
      </div>

      <div className="card mt-6">
        <h3 className="card-title">Last 12 months from the Handover Summary tab</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Collection</th>
                <th>Expenses</th>
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
        <h3 className="card-title">Notes and vendor phones from the sheet</h3>
        <ul className="setup-checklist">
          {notes.map((row) => (
            <li key={row[0]}><strong>{row[0]}:</strong> {row[2] || row[1]}</li>
          ))}
          {contacts.map((row) => (
            <li key={`${row[1]}-${row[3]}`}><strong>{row[1] || row[0]}:</strong> {row[3]}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
