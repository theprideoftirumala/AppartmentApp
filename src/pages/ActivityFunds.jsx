/**
 * Optional activity funds — one reusable Google Sheet per named activity.
 */

import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, PartyPopper, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { FLATS, PAYMENT_MODES } from '../config/constants';
import {
  addActivityExpense,
  closeActivityFund,
  dedupeActivityFunds,
  getActivityDetail,
  listActivityFunds,
  saveActivityMembers,
  startActivityFund,
} from '../services/activityFunds';
import { getFlats } from '../services/googleSheets';
import { downloadActivityReport } from '../services/pdfExport';
import { formatCurrency } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import Navbar from '../components/common/Navbar';

export default function ActivityFunds() {
  const { showToast, isOwner } = useApp();
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showStart, setShowStart] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [list, flatRows] = await Promise.all([
        isOwner ? dedupeActivityFunds().catch(() => listActivityFunds()) : listActivityFunds(),
        getFlats().catch(() => []),
      ]);
      setActivities(list);
      setFlats(flatRows);
    } catch (err) {
      showToast(err.message || 'Could not load activity funds', 'error');
    } finally {
      setLoading(false);
    }
  }, [isOwner, showToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openActivity = async (activity) => {
    try {
      const data = await getActivityDetail(activity.spreadsheetId);
      setSelected(activity);
      setDetail(data);
    } catch (err) {
      showToast(err.message || 'Could not open this activity sheet', 'error');
    }
  };

  const handleStart = async (form) => {
    try {
      const activity = await startActivityFund({ ...form, flats });
      showToast(`${activity.name} is ready. Review members, then save.`, 'success');
      setShowStart(false);
      await refresh();
      await openActivity(activity);
    } catch (err) {
      showToast(err.message || 'Could not start the activity', 'error');
    }
  };

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Funds</h1>
          <p className="page-subtitle">Optional collections such as Ganesh festival or a new motor. Each activity has its own Google Sheet and can be opened again later.</p>
        </div>
        {isOwner && (
          <button className="btn btn-primary" onClick={() => setShowStart(true)}>
            <Plus size={16} /> Start activity
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading activities…" />
      ) : activities.length === 0 ? (
        <div className="card">
          <p className="text-muted">No activity funds yet. An Owner can start one — members who want to join can be marked later.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Target / flat</th>
                <th>Started</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="font-medium">{activity.name}</td>
                  <td><span className={`badge ${activity.status === 'Open' ? 'badge-success' : 'badge-info'}`}>{activity.status}</span></td>
                  <td>{formatCurrency(activity.target)}</td>
                  <td className="text-muted">{activity.created}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openActivity(activity)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && detail && (
        <ActivityDetail
          activity={selected}
          detail={detail}
          isOwner={isOwner}
          user={user}
          onClose={() => { setSelected(null); setDetail(null); }}
          onReload={() => openActivity(selected)}
          showToast={showToast}
        />
      )}

      <StartActivityModal
        isOpen={showStart}
        onClose={() => setShowStart(false)}
        onSave={handleStart}
        flats={flats}
      />
    </div>
  );
}

function ActivityDetail({ activity, detail, isOwner, user, onClose, onReload, showToast }) {
  const [members, setMembers] = useState(detail.members);
  const [saving, setSaving] = useState(false);
  const [expense, setExpense] = useState({ date: new Date().toISOString().slice(0, 10), description: '', amount: '', paidBy: '', paymentMode: 'UPI', remarks: '' });

  useEffect(() => {
    setMembers(detail.members);
  }, [detail]);

  const collected = members.reduce((sum, row) => sum + (Number(row.amountPaid) || 0), 0);
  const spent = detail.expenses.reduce((sum, row) => sum + row.amount, 0);

  const saveMembers = async () => {
    try {
      setSaving(true);
      await saveActivityMembers(activity.spreadsheetId, members);
      showToast('Members updated', 'success');
      onReload();
    } catch (err) {
      showToast(err.message || 'Could not save members', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addExpense = async (event) => {
    event.preventDefault();
    if (!expense.description || !Number(expense.amount)) return;
    try {
      await addActivityExpense(activity.spreadsheetId, expense);
      showToast('Expense added', 'success');
      setExpense({ ...expense, description: '', amount: '', remarks: '' });
      onReload();
    } catch (err) {
      showToast(err.message || 'Could not add expense', 'error');
    }
  };

  return (
    <div className="card mt-6">
      <div className="card-header">
        <h3 className="card-title"><PartyPopper size={18} /> {activity.name}</h3>
        <div className="flex gap-2">
          <a className="btn btn-ghost btn-sm" href={`https://docs.google.com/spreadsheets/d/${activity.spreadsheetId}`} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Sheet
          </a>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            try {
              await downloadActivityReport({ activity, detail: { ...detail, members, collected, spent, balance: collected - spent } });
            } catch (err) {
              showToast(err.message || 'Could not build the PDF', 'error');
            }
          }}>
            <Download size={14} /> PDF
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close view</button>
        </div>
      </div>
      <p className="text-muted text-sm mb-4">{activity.notes || 'Optional members only. Review amounts before saving.'}</p>
      <div className="widget-row" style={{ marginTop: 0 }}>
        <div className="widget-card"><span className="widget-label">Collected</span><strong className="widget-value">{formatCurrency(collected)}</strong></div>
        <div className="widget-card"><span className="widget-label">Spent</span><strong className="widget-value">{formatCurrency(spent)}</strong></div>
        <div className="widget-card"><span className="widget-label">Balance</span><strong className="widget-value">{formatCurrency(collected - spent)}</strong></div>
      </div>

      <h4 className="card-title mt-6 mb-3">Members</h4>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Join</th>
              <th>Flat</th>
              <th>Name</th>
              <th>Due</th>
              <th>Paid</th>
              <th>Date</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            {members.map((row, index) => (
              <tr key={row.flat}>
                <td>
                  <input
                    type="checkbox"
                    checked={row.optedIn}
                    disabled={!isOwner || activity.status !== 'Open'}
                    onChange={(e) => setMembers((prev) => prev.map((item, i) => (i === index ? { ...item, optedIn: e.target.checked } : item)))}
                  />
                </td>
                <td>{row.flat}</td>
                <td>{row.name || '—'}</td>
                <td>
                  <input className="form-input" type="number" value={row.amountDue} disabled={!isOwner} onChange={(e) => setMembers((prev) => prev.map((item, i) => (i === index ? { ...item, amountDue: e.target.value } : item)))} />
                </td>
                <td>
                  <input className="form-input" type="number" value={row.amountPaid} disabled={!isOwner} onChange={(e) => setMembers((prev) => prev.map((item, i) => (i === index ? { ...item, amountPaid: e.target.value } : item)))} />
                </td>
                <td>
                  <input className="form-input" type="date" value={row.paymentDate} disabled={!isOwner} onChange={(e) => setMembers((prev) => prev.map((item, i) => (i === index ? { ...item, paymentDate: e.target.value } : item)))} />
                </td>
                <td>
                  <select className="form-select" value={row.paymentMode} disabled={!isOwner} onChange={(e) => setMembers((prev) => prev.map((item, i) => (i === index ? { ...item, paymentMode: e.target.value } : item)))}>
                    <option value="">—</option>
                    {PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isOwner && activity.status === 'Open' && (
        <button className="btn btn-primary mt-3" disabled={saving} onClick={saveMembers}>{saving ? 'Saving…' : 'Save members'}</button>
      )}

      <h4 className="card-title mt-6 mb-3">Activity expenses</h4>
      {detail.expenses.length === 0 ? (
        <p className="text-muted text-sm">No expenses from this fund yet.</p>
      ) : (
        <ul className="text-sm">
          {detail.expenses.map((row, index) => (
            <li key={index}>{row.date} — {row.description}: {formatCurrency(row.amount)}</li>
          ))}
        </ul>
      )}
      {isOwner && activity.status === 'Open' && (
        <form className="form-grid mt-4" onSubmit={addExpense}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={expense.date} onChange={(e) => setExpense({ ...expense, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input className="form-input" type="number" min="1" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">What was paid</label>
            <input className="form-input" value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} />
          </div>
          <button className="btn btn-secondary" type="submit">Add expense</button>
        </form>
      )}
      {isOwner && activity.status === 'Open' && (
        <button
          className="btn btn-ghost mt-4"
          onClick={async () => {
            if (!confirm('Close this activity? You can still view the sheet later.')) return;
            try {
              await closeActivityFund(activity);
              showToast('Activity closed', 'success');
              onClose();
            } catch (err) {
              showToast(err.message || 'Could not close', 'error');
            }
          }}
        >
          Close activity
        </button>
      )}
      <p className="text-xs text-muted mt-3">Opened by {user?.email || 'member'}. This sheet is separate from monthly maintenance.</p>
    </div>
  );
}

function StartActivityModal({ isOpen, onClose, onSave, flats }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [optedFlats, setOptedFlats] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setTarget('');
    setNotes('');
    setOptedFlats([]);
  }, [isOpen]);

  const toggle = (flat) => {
    setOptedFlats((prev) => (prev.includes(flat) ? prev.filter((item) => item !== flat) : [...prev, flat]));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start an activity fund">
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ name, target, notes, optedFlats });
        }}
      >
        <p className="text-muted text-sm">Name is configurable. If this activity already exists and is open, the same Google Sheet is reused.</p>
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ganesh Festival, New Motor Fund…" required />
        </div>
        <div className="form-group">
          <label className="form-label">Suggested amount per joining flat (₹)</label>
          <input className="form-input" type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <fieldset>
          <legend className="form-label">Who is joining now? (optional — you can change this later)</legend>
          <div className="flat-status-grid">
            {FLATS.map((flat) => (
              <label key={flat} className="flat-status-item">
                <input type="checkbox" checked={optedFlats.includes(flat)} onChange={() => toggle(flat)} />
                <span>{flat} {flats.find((row) => String(row.flat) === flat)?.ownerName || ''}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Create / reuse sheet</button>
        </div>
      </form>
    </Modal>
  );
}
