/**
 * Maintenance Page
 * Track monthly payment collection for all 10 flats
 */

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
  appendNextLiveMonth,
  getMaintenanceRecords, upsertMaintenancePayment, initializeMonthMaintenance,
  getFlats, getConfiguration, getLiveSpreadsheetId,
  addAuditLog, parseApiError,
} from '../services/googleSheets';
import { formatCurrency, getCurrentMonthLabel } from '../utils/helpers';
import { useWorkingMonths } from '../hooks/useWorkingMonths';
import { nextSequentialMonthLabel, pickDefaultWorkingMonth } from '../utils/liveSummaryLayout';
import { PAYMENT_MODES, MAINTENANCE_STATUS, MAINTENANCE_MIN_DATE } from '../config/constants';
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
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthLabel());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const { months: monthOptions, refresh: refreshMonths } = useWorkingMonths();
  const liveBound = Boolean(getLiveSpreadsheetId());
  const nextMonthLabel = nextSequentialMonthLabel(monthOptions);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [maintenanceData, flatData, configData] = await Promise.all([
        getMaintenanceRecords(selectedMonth),
        getFlats(),
        getConfiguration(),
      ]);
      setRecords(maintenanceData);
      setFlats(flatData);
      setConfig(configData);
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

  useEffect(() => {
    if (!monthOptions.length) return;
    setSelectedMonth((current) => (
      monthOptions.includes(current) ? current : pickDefaultWorkingMonth(monthOptions, getCurrentMonthLabel())
    ));
  }, [monthOptions]);

  const handleAddNextMonth = async () => {
    try {
      setSaving(true);
      const month = await appendNextLiveMonth();
      await addAuditLog(user.email, 'INIT_MONTH', `Added next live month ${month}`);
      showToast(`Added ${month}. Type collections on Maintenance — do not type amounts on Live Summary.`, 'success');
      await refreshMonths();
      setSelectedMonth(month);
    } catch (err) {
      showToast(parseApiError(err) || 'Could not add the next month', 'error');
    } finally {
      setSaving(false);
    }
  };

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
      await upsertMaintenancePayment(selectedMonth, formData.flat, { ...formData, lateFee: 0 });
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

  const openPaymentModal = (record = null) => {
    setEditingRecord(record);
    setShowPaymentModal(true);
  };

  const paidCount = records.filter(r => r.status === 'PAID').length;
  const totalDue = records.reduce((s, r) => s + r.amountDue, 0);
  const totalPaid = records.reduce((s, r) => s + r.amountPaid, 0);

  return (
    <div className="main-content">
      <Navbar />

      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Collection</h1>
          <p className="page-subtitle">
            Months on the sheet: {monthOptions.join(', ') || '—'}.
            {liveBound ? ` Next to add is ${nextMonthLabel} (the first month after Aug-26 that is not already here).` : ''}
          </p>
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
          {isOwner !== false && liveBound && (
            <button className="btn btn-secondary btn-sm" onClick={handleAddNextMonth} disabled={saving}>
              <Plus size={16} /> Add next month ({nextMonthLabel})
            </button>
          )}
          {isOwner !== false && (
            <button className="btn btn-primary btn-sm" onClick={() => openPaymentModal()}>
              <Plus size={16} /> Record Payment
            </button>
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
                  <th>Still due</th>
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
                        <td className={record.stillDue > 0 ? 'text-warning font-medium' : 'text-muted'}>
                          {formatCurrency(record.stillDue ?? Math.max(0, record.amountDue - record.amountPaid))}
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
    // History on this sheet starts November 2020
    if (formData.paymentDate && formData.paymentDate < MAINTENANCE_MIN_DATE) {
      setDateError(`Payment date cannot be before ${MAINTENANCE_MIN_DATE}. History on this sheet starts November 2020.`);
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

        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={formData.status} onChange={e => update('status', e.target.value)}>
            {Object.values(MAINTENANCE_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
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


