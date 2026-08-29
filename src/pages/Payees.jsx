/**
 * Pay watchman and vendors via GPay / PhonePe / any UPI app.
 * UPI IDs are stored on the Payees tab — none were in the old Excel.
 */

import { useCallback, useEffect, useState } from 'react';
import { IndianRupee, Phone, Smartphone } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getPayees, updatePayee } from '../services/googleSheets';
import { canPayUpi, gpayUrl, phonepeUrl, telUrl, upiPayUrl } from '../utils/upiPay';
import { formatCurrency } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Navbar from '../components/common/Navbar';

export default function Payees() {
  const { showToast, isOwner } = useApp();
  const [payees, setPayees] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Payees</h1>
          <p className="page-subtitle">
            Pay the watchman and vendors with GPay, PhonePe, or any UPI app.
            Add the UPI ID here — the old I&amp;E Excel had phone numbers only.
          </p>
        </div>
      </div>

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
        </div>
      )}
    </div>
  );
}

function PayeeCard({ payee, isOwner, onSave }) {
  const [draft, setDraft] = useState(payee);
  const ready = canPayUpi(draft.upiId);
  const linkPayee = {
    vpa: draft.upiId,
    name: draft.name || draft.category,
    amount: draft.defaultAmount,
    note: draft.category || 'TPT society',
  };

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
            <a className="btn btn-primary" href={gpayUrl(linkPayee)}>
              <IndianRupee size={16} /> GPay
            </a>
            <a className="btn btn-secondary" href={phonepeUrl(linkPayee)}>
              <Smartphone size={16} /> PhonePe
            </a>
            <a className="btn btn-ghost" href={upiPayUrl(linkPayee)}>Any UPI</a>
          </>
        ) : (
          <p className="text-muted text-sm">Add a UPI ID to enable GPay / PhonePe.</p>
        )}
      </div>
    </div>
  );
}
