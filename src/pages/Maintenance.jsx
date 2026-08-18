/**
 * Maintenance Page
 * Track monthly payment collection for all 10 flats
 * Also records misc funds contributed by flat owners
 */

import { useState, useEffect, useCallback } from 'react';
import { Building2, Check, Clock, AlertCircle, Plus, Trash2, IndianRupee } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getMaintenanceRecords, upsertMaintenancePayment, initializeMonthMaintenance,
  getFlats, getConfiguration, getMiscFunds, addMiscFund, deleteMiscFund,
  addAuditLog, parseApiError,
} from '../services/googleSheets';
import { formatCurrency, formatDate, getCurrentMonthLabel, getFiscalMonthOptions } from '../utils/helpers';
import { PAYMENT_MODES, MAINTENANCE_STATUS, MAINTENANCE_MIN_DATE, FLATS } from '../config/constants';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Navbar from '../components/common/Navbar';

export default function Maintenance() {
  const { showToast, isOwner } = useApp();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [flats, setFlats] = useState([]);
  const [config, setConfig] = useState({});
  const [miscFunds, setMiscFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthLabel());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMiscModal, setShowMiscModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const monthOptions = getFiscalMonthOptions();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [maintenanceData, flatData, configData, miscData] = await Promise.all([
        getMaintenanceRecords(selectedMonth),
        getFlats(),
        getConfiguration(),
        getMiscFunds(selectedMonth).catch(() => []),
      ]);
      setRecords(maintenanceData);
      setFlats(flatData);
      setConfig(configData);
      setMiscFunds(miscData);
    } catch (err) {
      showToast(parseApiError(err), 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInitMonth = async () => {
    try {
      setSaving(true);
      await initializeMonthMaintenance(selectedMonth, config.MONTHLY_MAINTENANCE || 3000);
      await addAuditLog(user.email, 'INIT_MONTH', `Initialized maintenance for ${selectedMonth}`);
      showToast(`Initialized ${selectedMonth} for all flats`, 'success');
      fetchData();
    } catch (err) {
      showToast(parseApiError(err) || 'Failed to initialize month', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async (formData) => {
    try {
      setSaving(true);
      await upsertMaintenancePayment(selectedMonth, formData.flat, formData);
      await addAuditLog(user.email, 'PAYMENT', `Recorded payment for flat ${formData.flat} — ${selectedMonth}: ₹${formData.amountPaid}`);
      showToast(`Payment recorded for flat ${formData.flat}`, 'success');
      setShowPaymentModal(false);
      setEditingRecord(null);
      fetchData();
    } catch (err) {
      showToast(parseApiError(err) || 'Failed to save payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMiscFund = async (formData) => {
    try {
      setSaving(true);
      await addMiscFund({ ...formData, collectedBy: user?.name || user?.email || '' });
      await addAuditLog(user.email, 'ADD_MISC_FUND', `Flat ${formData.flat}: ₹${formData.amount} — ${formData.description}`);
      showToast(`Misc fund recorded for flat ${formData.flat}`, 'success');
      setShowMiscModal(false);
      fetchData();
    } catch (err) {
      showToast(parseApiError(err) || 'Failed to record misc fund', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMiscFund = async (id, flat) => {
    if (!confirm(`Delete misc fund entry for flat ${flat}?`)) return;
    try {
      await deleteMiscFund(id);
      await addAuditLog(user.email, 'DELETE_MISC_FUND', `Deleted misc fund ${id}`);
      showToast('Misc fund deleted', 'success');
      fetchData();
    } catch (err) {
      showToast(parseApiError(err) || 'Failed to delete', 'error');
    }
  };

  const openPaymentModal = (record = null) => {
    setEditingRecord(record);
    setShowPaymentModal(true);
  };

  const paidCount = records.filter(r => r.status === 'PAID').length;
  const totalDue = records.reduce((s, r) => s + r.amountDue, 0);
  const totalPaid = records.reduce((s, r) => s + r.amountPaid, 0);
  const totalMisc = miscFunds.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="main-content">
      <Navbar />

      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Collection</h1>
          <p className="page-subtitle">Track monthly payments from all flats</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            className="form-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: 140 }}
          >
            {monthOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {isOwner !== false && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => openPaymentModal()}>
                <Plus size={16} /> Record Payment
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMiscModal(true)}>
                <IndianRupee size={16} /> Misc Fund
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading maintenance data..." />
      ) : records.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <Building2 size={48} style={{ opacity: 0.3, margin: '0 auto' }} />
          <h3 className="mt-4">No records for {selectedMonth}</h3>
          <p className="text-muted mt-2">Initialize this month to start tracking payments.</p>
          {isOwner !== false && (
            <button className="btn btn-primary mt-4" onClick={handleInitMonth} disabled={saving}>
              <Plus size={16} /> Initialize {selectedMonth}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Summary Strip */}
          <div className="maintenance-summary animate-fade-in">
            <div className="maintenance-stat">
              <span className="maintenance-stat-label">Collected</span>
              <span className="maintenance-stat-value text-success">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="maintenance-stat">
              <span className="maintenance-stat-label">Pending</span>
              <span className="maintenance-stat-value text-warning">{formatCurrency(totalDue - totalPaid)}</span>
            </div>
            <div className="maintenance-stat">
              <span className="maintenance-stat-label">Progress</span>
              <span className="maintenance-stat-value">{paidCount}/{records.length} flats</span>
            </div>
            {totalMisc > 0 && (
              <div className="maintenance-stat">
                <span className="maintenance-stat-label">Misc Funds</span>
                <span className="maintenance-stat-value text-info">{formatCurrency(totalMisc)}</span>
              </div>
            )}
          </div>

          {/* Maintenance Table */}
          <div className="table-container mt-4 animate-fade-in-up">
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records
                  .sort((a, b) => a.flat.localeCompare(b.flat))
                  .map(record => {
                    const flatInfo = flats.find(f => f.flat === record.flat);
                    return (
                      <tr key={record.flat}>
                        <td className="font-semibold">{record.flat}</td>
                        <td>{flatInfo?.ownerName || `Flat ${record.flat}`}</td>
                        <td>{formatCurrency(record.amountDue)}</td>
                        <td className={record.amountPaid > 0 ? 'text-success font-medium' : ''}>
                          {formatCurrency(record.amountPaid)}
                        </td>
                        <td className="text-muted">{record.paymentDate || '-'}</td>
                        <td>{record.paymentMode || '-'}</td>
                        <td><StatusBadge status={record.status} /></td>
                        <td>
                          {isOwner !== false && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openPaymentModal(record)}
                            >
                              {record.status === 'PAID' ? 'Edit' : 'Pay'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Misc Funds Section */}
          <div className="card mt-6 animate-fade-in-up">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="card-title">Misc Funds — {selectedMonth}</h3>
                <p className="text-muted text-sm mt-1">Additional contributions from flat owners beyond monthly maintenance</p>
              </div>
              {isOwner !== false && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowMiscModal(true)}>
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
            {miscFunds.length === 0 ? (
              <p className="text-muted text-sm mt-3">No misc funds recorded for {selectedMonth}.</p>
            ) : (
              <div className="table-container mt-3">
                <table>
                  <thead>
                    <tr>
                      <th>Flat</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Collected By</th>
                      {isOwner !== false && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {miscFunds.map(fund => (
                      <tr key={fund.id}>
                        <td className="font-semibold">{fund.flat}</td>
                        <td className="text-success font-medium">{formatCurrency(fund.amount)}</td>
                        <td>{fund.description}</td>
                        <td className="text-muted">{formatDate(fund.date)}</td>
                        <td>{fund.paymentMode || '-'}</td>
                        <td>{fund.collectedBy || '-'}</td>
                        {isOwner !== false && (
                          <td>
                            <button
                              className="btn btn-ghost btn-sm text-danger"
                              onClick={() => handleDeleteMiscFund(fund.id, fund.flat)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                      <td colSpan={isOwner !== false ? 6 : 5} className="font-semibold">Total</td>
                      <td className="text-success font-semibold">{formatCurrency(totalMisc)}</td>
                      {isOwner !== false && <td />}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setEditingRecord(null); }}
        onSave={handleSavePayment}
        record={editingRecord}
        config={config}
        flats={flats}
        month={selectedMonth}
        saving={saving}
      />

      {/* Misc Fund Modal */}
      <MiscFundModal
        isOpen={showMiscModal}
        onClose={() => setShowMiscModal(false)}
        onSave={handleAddMiscFund}
        month={selectedMonth}
        flats={flats}
        saving={saving}
      />
    </div>
  );
}

function PaymentModal({ isOpen, onClose, onSave, record, config, flats, month, saving }) {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    flat: '',
    amountDue: 0,
    amountPaid: 0,
    paymentDate: today,
    paymentMode: 'UPI',
    upiRef: '',
    status: 'PAID',
    lateFee: 0,
    remarks: '',
  });
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    if (record) {
      setFormData({
        flat: record.flat,
        amountDue: record.amountDue || config?.MONTHLY_MAINTENANCE || 3000,
        amountPaid: record.amountPaid || config?.MONTHLY_MAINTENANCE || 3000,
        paymentDate: record.paymentDate || today,
        paymentMode: record.paymentMode || 'UPI',
        upiRef: record.upiRef || '',
        status: record.status || 'PAID',
        lateFee: record.lateFee || 0,
        remarks: record.remarks || '',
      });
    } else {
      setFormData(prev => ({
        ...prev,
        flat: '',
        amountDue: config?.MONTHLY_MAINTENANCE || 3000,
        amountPaid: config?.MONTHLY_MAINTENANCE || 3000,
        paymentDate: today,
        status: 'PAID',
      }));
    }
    setDateError('');
  }, [record, config, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.flat) return;
    // Enforce minimum date: maintenance starts Sep 2026
    if (formData.paymentDate && formData.paymentDate < MAINTENANCE_MIN_DATE) {
      setDateError(`Payment date cannot be before ${MAINTENANCE_MIN_DATE}. Maintenance tracking starts from September 2026.`);
      return;
    }
    setDateError('');
    onSave(formData);
  };

  const update = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (key === 'paymentDate') setDateError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={record ? `Edit Payment — Flat ${record.flat}` : 'Record Payment'}>
      <form onSubmit={handleSubmit} className="form-grid">
        {!record && (
          <div className="form-group">
            <label className="form-label">Flat</label>
            <select className="form-select" value={formData.flat} onChange={e => update('flat', e.target.value)} required>
              <option value="">Select Flat</option>
              {flats.map(f => (
                <option key={f.flat} value={f.flat}>
                  {f.flat} — {f.ownerName || 'Unknown'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Amount Due (₹)</label>
            <input type="number" className="form-input" value={formData.amountDue} onChange={e => update('amountDue', Number(e.target.value))} min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Amount Paid (₹)</label>
            <input type="number" className="form-input" value={formData.amountPaid} onChange={e => update('amountPaid', Number(e.target.value))} min="0" required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Payment Date</label>
            <input
              type="date"
              className={`form-input ${dateError ? 'input-error' : ''}`}
              value={formData.paymentDate}
              min={MAINTENANCE_MIN_DATE}
              onChange={e => update('paymentDate', e.target.value)}
            />
            {dateError && <p className="form-error-text">{dateError}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select className="form-select" value={formData.paymentMode} onChange={e => update('paymentMode', e.target.value)}>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">UPI Reference / Transaction ID</label>
          <input type="text" className="form-input" value={formData.upiRef} onChange={e => update('upiRef', e.target.value)} placeholder="Optional" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={formData.status} onChange={e => update('status', e.target.value)}>
              {Object.values(MAINTENANCE_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Late Fee (₹)</label>
            <input type="number" className="form-input" value={formData.lateFee} onChange={e => update('lateFee', Number(e.target.value))} min="0" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Remarks</label>
          <input type="text" className="form-input" value={formData.remarks} onChange={e => update('remarks', e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MiscFundModal({ isOpen, onClose, onSave, month, flats, saving }) {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    flat: '',
    amount: '',
    description: '',
    date: today,
    month,
    paymentMode: 'UPI',
    remarks: '',
  });
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    setFormData(prev => ({ ...prev, date: today, month, flat: '', amount: '', description: '' }));
    setDateError('');
  }, [isOpen, month]);

  const update = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (key === 'date') setDateError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.flat || !formData.amount || !formData.description) return;
    if (formData.date < MAINTENANCE_MIN_DATE) {
      setDateError(`Date cannot be before ${MAINTENANCE_MIN_DATE}. Operations start from September 2026.`);
      return;
    }
    setDateError('');
    onSave({ ...formData, amount: Number(formData.amount) });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Misc Fund from Flat Owner">
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Flat *</label>
            <select className="form-select" value={formData.flat} onChange={e => update('flat', e.target.value)} required>
              <option value="">Select Flat</option>
              {flats.map(f => (
                <option key={f.flat} value={f.flat}>
                  {f.flat}{f.ownerName ? ` — ${f.ownerName}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹) *</label>
            <input type="number" className="form-input" value={formData.amount} onChange={e => update('amount', e.target.value)} placeholder="0" min="1" required />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <input type="text" className="form-input" value={formData.description} onChange={e => update('description', e.target.value)} placeholder="e.g., Annual festival contribution, repair fund..." required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className={`form-input ${dateError ? 'input-error' : ''}`}
              value={formData.date}
              min={MAINTENANCE_MIN_DATE}
              onChange={e => update('date', e.target.value)}
              required
            />
            {dateError && <p className="form-error-text">{dateError}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select className="form-select" value={formData.paymentMode} onChange={e => update('paymentMode', e.target.value)}>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Remarks</label>
          <input type="text" className="form-input" value={formData.remarks} onChange={e => update('remarks', e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Record Misc Fund'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
