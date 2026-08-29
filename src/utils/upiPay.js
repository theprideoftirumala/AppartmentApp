/**
 * UPI deep links for GPay, PhonePe, and any UPI app.
 * UPI IDs are never invented here — they come from the Payees sheet.
 */

function payParams({ vpa, name, amount, note }) {
  const params = new URLSearchParams();
  if (vpa) params.set('pa', String(vpa).trim());
  if (name) params.set('pn', String(name).trim());
  if (amount !== '' && amount != null && Number(amount) > 0) {
    params.set('am', String(Number(amount)));
  }
  params.set('cu', 'INR');
  if (note) params.set('tn', String(note).trim().slice(0, 50));
  return params.toString();
}

export function canPayUpi(vpa) {
  return /.+@.+\S/.test(String(vpa || '').trim());
}

export function upiPayUrl(payee) {
  return `upi://pay?${payParams(payee)}`;
}

export function gpayUrl(payee) {
  return `tez://upi/pay?${payParams(payee)}`;
}

export function phonepeUrl(payee) {
  return `phonepe://pay?${payParams(payee)}`;
}

export function telUrl(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `tel:${digits}` : '';
}
