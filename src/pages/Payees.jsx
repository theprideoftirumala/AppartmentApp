/**
 * Pay watchman and vendors via GPay / PhonePe / any UPI app.
 * Prefer a 10-digit phone. An optional UPI ID overrides the phone.
 */

import { useCallback, useEffect, useState } from 'react';
import { IndianRupee, Phone, Plus, Smartphone } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { addPayee, getPayees, updatePayee } from '../services/googleSheets';
import { canPayPayee, gpayHref, phonepeUrl, telUrl, upiPayUrl } from '../utils/upiPay';
import { formatCurrency } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Navbar from '../components/common/Navbar';

const EMPTY_PAYEE = {
  key: '',
  category: '',
  name: '',
  phone: '',
  upiId: '',
  defaultAmount: '',
  notes: '',
};

export default function Payees() {
  const { showToast, isOwner } = useApp();
  const [payees, setPayees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_PAYEE);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setPayees(await getPayees());
    } catch (err) {
      showToast(err.message || 'Could not load payees', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveRow = async (index, payee) => {
    try {
      await updatePayee(index, payee);
      showToast('Payee saved', 'success');
      refresh();
    } catch (err) {
      showToast(err.message || 'Could not save payee', 'error');
    }
  };

  const handleAdd = async () => {
    try {
      setAdding(true);
      await addPayee(draft);
      showToast('Payee added. GPay and PhonePe pay number@ybl unless a UPI ID is pasted.', 'success');
      setDraft(EMPTY_PAYEE);
      refresh();
    } catch (err) {
      showToast(err.message || 'Could not add payee', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Payees</h1>
          <p className="page-subtitle">
            Pay the watchman and vendors with GPay, PhonePe, or any UPI app using a 10-digit phone.
            Both apps pay number@ybl unless a UPI ID is pasted. Same phone or same UPI ID is blocked.
          </p>
        </div>
      </div>

      {isOwner && (
        <div className="card mb-4">
          <h3 className="card-title"><Plus size={16} /> Add payee</h3>
          <p className="text-muted text-sm mb-3">
            Enter a name and a 10-digit phone. Leave UPI blank unless the payee gave you an ID (example name@okaxis). Do not invent a UPI ID.
          </p>
          <div className="form-grid">
            <label className="form-label">
              Category
              <input className="form-input" value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} placeholder="Watchman, Lift, …" />
            </label>
            <label className="form-label">
              Display name
              <input className="form-input" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="form-label">
              Phone
              <input className="form-input" value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} placeholder="9844580856" />
            </label>
            <label className="form-label">
              UPI ID
              <input className="form-input" value={draft.upiId} onChange={(e) => setDraft((p) => ({ ...p, upiId: e.target.value }))} placeholder="name@okaxis" />
            </label>
            <label className="form-label">
              Default amount
              <input className="form-input" type="number" value={draft.defaultAmount} onChange={(e) => setDraft((p) => ({ ...p, defaultAmount: e.target.value }))} />
            </label>
            <label className="form-label">
              Notes
              <input className="form-input" value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} />
            </label>
            <button type="button" className="btn btn-primary" disabled={adding} onClick={handleAdd}>
              {adding ? 'Saving…' : 'Add payee'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading payees…" />
      ) : (
        <div className="payee-grid">
          {payees.map((payee, index) => (
            <PayeeCard
              key={`${payee.key}-${index}`}
              payee={payee}
              isOwner={isOwner}
              onSave={(next) => saveRow(index, next)}
            />
          ))}
          {!payees.length && (
            <p className="text-muted">No payees yet. Add one here or on the Payees tab in the sheet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function PayeeCard({ payee, isOwner, onSave }) {
  const [draft, setDraft] = useState(payee);
  const ready = canPayPayee(draft);

  useEffect(() => {
    setDraft(payee);
  }, [payee]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="card payee-card">
      <h3 className="card-title">{draft.name || draft.category || 'Payee'}</h3>
      <p className="text-muted text-sm">{draft.notes}</p>
      {isOwner && (
        <div className="form-grid mt-3">
          <label className="form-label">
            Display name
            <input className="form-input" value={draft.name} onChange={(e) => setField('name', e.target.value)} />
          </label>
          <label className="form-label">
            Phone
            <input className="form-input" value={draft.phone} onChange={(e) => setField('phone', e.target.value)} />
          </label>
          <label className="form-label">
            UPI ID
            <input className="form-input" value={draft.upiId} onChange={(e) => setField('upiId', e.target.value)} placeholder="name@okaxis" />
          </label>
          <label className="form-label">
            Default amount
            <input className="form-input" type="number" value={draft.defaultAmount} onChange={(e) => setField('defaultAmount', e.target.value)} />
          </label>
          <button type="button" className="btn btn-secondary" onClick={() => onSave(draft)}>Save</button>
        </div>
      )}
      <div className="payee-actions mt-4">
        {draft.defaultAmount !== '' && (
          <span className="widget-value">{formatCurrency(Number(draft.defaultAmount) || 0)}</span>
        )}
        {draft.phone && (
          <a className="btn btn-ghost" href={telUrl(draft.phone)}>
            <Phone size={16} /> Call
          </a>
        )}
        {ready ? (
          <>
            <a className="btn btn-primary" href={gpayHref(draft)}>
              <IndianRupee size={16} /> GPay
            </a>
            <a className="btn btn-secondary" href={phonepeUrl(draft)}>
              <Smartphone size={16} /> PhonePe
            </a>
            <a className="btn btn-ghost" href={upiPayUrl(draft)}>Any UPI</a>
          </>
        ) : (
          <p className="text-muted text-sm">Add a 10-digit phone (or a UPI ID) to enable GPay / PhonePe.</p>
        )}
      </div>
    </div>
  );
}
