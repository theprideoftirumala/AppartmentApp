/**
 * UPI deep links for GPay, PhonePe, and any UPI app.
 * Prefer a 10-digit Indian mobile. An optional UPI ID overrides the phone.
 * PhonePe's mobile VPA is number@ybl (PhonePe's own handle, not a bank we invent).
 */

export function indianMobileDigits(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

export function canPayPhone(phone) {
  return Boolean(indianMobileDigits(phone));
}

export function canPayUpi(vpa) {
  return /.+@.+\S/.test(String(vpa || '').trim());
}

export function payeePayTarget(payee = {}) {
  const upi = String(payee.upiId || payee.vpa || '').trim();
  if (canPayUpi(upi)) return { vpa: upi, via: 'upi' };
  const mobile = indianMobileDigits(payee.phone);
  if (mobile) return { vpa: mobile, via: 'phone' };
  return { vpa: '', via: 'none' };
}

export function canPayPayee(payee) {
  return payeePayTarget(payee).via !== 'none';
}

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

function linkPayee(payee, vpa) {
  return {
    vpa,
    name: payee.name || payee.category,
    amount: payee.amount ?? payee.defaultAmount,
    note: payee.note || payee.category || 'TPT society',
  };
}

export function upiPayUrl(payee) {
  const { vpa } = payeePayTarget(payee);
  return `upi://pay?${payParams(linkPayee(payee, vpa))}`;
}

export function gpayUrl(payee) {
  const { vpa } = payeePayTarget(payee);
  return `tez://upi/pay?${payParams(linkPayee(payee, vpa))}`;
}

export function phonepeUrl(payee) {
  const target = payeePayTarget(payee);
  const vpa = target.via === 'phone' ? `${target.vpa}@ybl` : target.vpa;
  return `phonepe://pay?${payParams(linkPayee(payee, vpa))}`;
}

export function telUrl(phone) {
  const digits = indianMobileDigits(phone) || String(phone || '').replace(/\D/g, '');
  return digits ? `tel:${digits}` : '';
}
