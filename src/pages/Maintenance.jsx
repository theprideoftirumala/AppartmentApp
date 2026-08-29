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
  getMaintenanceRecords, upsertMaintenancePayments, initializeMonthMaintenance,
  getFlats, getConfiguration, getLiveSpreadsheetId,
  addAuditLog, parseApiError,
} from '../services/googleSheets';
import { formatCurrency, getCurrentMonthLabel } from '../utils/helpers';
import { paidPaymentDefaults, unpaidFlats, uniqueFlats } from '../utils/maintenancePayment';
import { useWorkingMonths } from '../hooks/useWorkingMonths';
import { nextSequentialMonthLabel, pickDefaultWorkingMonth } from '../utils/liveSummaryLayout';
import { FLATS, PAYMENT_MODES, MAINTENANCE_STATUS, MAINTENANCE_MIN_DATE } from '../config/constants';
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
  const [presetFlats, setPresetFlats] = useState(null);
  const [checkedFlats, setCheckedFlats] = useState([]);
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
    setCheckedFlats([]);
  }, [selectedMonth]);

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

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setEditingRecord(null);
    setPresetFlats(null);
  };

  const handleSavePayment = async (formData) => {
    try {
      setSaving(true);
      const flatsToSave = uniqueFlats(formData.flats);
      await upsertMaintenancePayments(selectedMonth, flatsToSave, formData);
      await addAuditLog(
        user.email,
        'PAYMENT',
        `Recorded ${formData.status || 'PAID'} for ${flatsToSave.join(', ')} — ${selectedMonth}: ₹${formData.amountPaid}`,
      );
      showToast(
        flatsToSave.length === 1
          ? `Payment recorded for flat ${flatsToSave[0]}`
          : `Payment recorded for ${flatsToSave.length} flats`,
        'success',
      );
      closePaymentModal();
      setCheckedFlats([]);
      fetchData();
    } catch (err) {
      showToast(parseApiError(err) || 'Failed to save payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = (record = null, flatsForModal = null) => {
    setEditingRecord(record);
    setPresetFlats(flatsForModal);
    setShowPaymentModal(true);
  };

  const toggleChecked = (flat) => {
    const key = String(flat);
    setCheckedFlats((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  };

  const paidCount = records.filter(r => r.status === 'PAID').length;
  const totalDue = records.reduce((s, r) => s + r.amountDue, 0);
  const totalPaid = records.reduce((s, r) => s + r.amountPaid, 0);
  const sortedRecords = [...records].sort((a, b) => String(a.flat).localeCompare(String(b.flat)));
  const allChecked = sortedRecords.length > 0 && sortedRecords.every((row) => checkedFlats.includes(String(row.flat)));

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
          {isOwner !== false && records.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => openPaymentModal(null, checkedFlats.length ? checkedFlats : unpaidFlats(records))}
              disabled={saving}
            >
              {checkedFlats.length ? `Mark ${checkedFlats.length} paid` : 'Mark unpaid paid'}
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

          <div className="table-container mt-4 animate-fade-in-up">
            <table>
              <thead>
                <tr>
                  {isOwner !== false && (
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Select all flats"
                        checked={allChecked}
                        onChange={() => setCheckedFlats(allChecked ? [] : sortedRecords.map((row) => String(row.flat)))}
                      />
                    </th>
                  )}
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
                {sortedRecords.map(record => {
                    const flatInfo = flats.find(f => String(f.flat) === String(record.flat));
                    const flatKey = String(record.flat);
                    return (
                      <tr key={flatKey}>
                        {isOwner !== false && (
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select flat ${flatKey}`}
                              checked={checkedFlats.includes(flatKey)}
                              onChange={() => toggleChecked(flatKey)}
                            />
                          </td>
                        )}
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
                              onClick={() => openPaymentModal(record, [flatKey])}
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

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={closePaymentModal}
        onSave={handleSavePayment}
        record={editingRecord}
        presetFlats={presetFlats}
        records={records}
        config={config}
        flats={flats}
        month={selectedMonth}
        saving={saving}
      />

    </div>
  );
}

function PaymentModal({ isOpen, onClose, onSave, record, presetFlats, records, config, flats, month, saving }) {
  const [formData, setFormData] = useState({
    ...paidPaymentDefaults(config),
    flats: [],
  });
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const defaults = paidPaymentDefaults(config, today);
    const startingFlats = uniqueFlats(
      presetFlats?.length ? presetFlats : record ? [record.flat] : unpaidFlats(records),
    );
    if (record && startingFlats.length === 1) {
      setFormData({
        ...defaults,
        flats: startingFlats,
        amountDue: record.amountDue || defaults.amountDue,
        amountPaid: record.amountPaid > 0 ? record.amountPaid : defaults.amountPaid,
        paymentDate: record.paymentDate || today,
        paymentMode: record.paymentMode || defaults.paymentMode,
        upiRef: record.upiRef || '',
        status: 'PAID',
        remarks: record.remarks || '',
      });
    } else {
      setFormData({
        ...defaults,
        flats: startingFlats,
      });
    }
    setDateError('');
  }, [record, presetFlats, records, config, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.flats.length) return;
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

  const toggleFlat = (flat) => {
    const key = String(flat);
    setFormData((prev) => ({
      ...prev,
      flats: prev.flats.includes(key)
        ? prev.flats.filter((item) => item !== key)
        : [...prev.flats, key],
    }));
  };

  const flatChoices = flats.length ? flats.map((row) => String(row.flat)) : FLATS;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formData.flats.length > 1 ? `Record paid — ${formData.flats.length} flats · ${month}` : record ? `Edit Payment — Flat ${record.flat}` : `Record Payment — ${month}`}
    >
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label className="form-label">Flats (defaults to unpaid, status PAID)</label>
          <div className="flat-check-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update('flats', uniqueFlats(flatChoices))}>
              Select all
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update('flats', unpaidFlats(records))}>
              Unpaid only
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update('flats', [])}>
              Clear
            </button>
          </div>
          <div className="flat-check-list">
            {flatChoices.map((flat) => {
              const info = flats.find((row) => String(row.flat) === String(flat));
              return (
                <label key={flat} className="flat-check-item">
                  <input
                    type="checkbox"
                    checked={formData.flats.includes(String(flat))}
                    onChange={() => toggleFlat(flat)}
                  />
                  <span>{flat}{info?.ownerName ? ` — ${info.ownerName}` : ''}</span>
                </label>
              );
            })}
          </div>
        </div>

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
          <input type="text" className="form-input" value={formData.upiRef} onChange={e => update('upiRef', e.target.value)} placeholder="Optional — same note for every selected flat" />
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
          <button type="submit" className="btn btn-primary" disabled={saving || !formData.flats.length}>
            {saving ? 'Saving...' : formData.flats.length > 1 ? `Save ${formData.flats.length} paid` : 'Save Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
