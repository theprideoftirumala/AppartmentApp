import { describe, expect, it } from 'vitest';
import {
  canPayPayee,
  canPayPhone,
  canPayUpi,
  gpayHref,
  gpayIntentUrl,
  gpayUrl,
  indianMobileDigits,
  phonepeUrl,
  resolvedPayVpa,
  telUrl,
  upiPayUrl,
} from './upiPay';

describe('indian mobile digits', () => {
  it('accepts 10-digit and +91 numbers', () => {
    expect(indianMobileDigits('9844580856')).toBe('9844580856');
    expect(indianMobileDigits('+91 98445 80856')).toBe('9844580856');
    expect(indianMobileDigits('12345')).toBe('');
  });
});

describe('upi pay links', () => {
  it('pays with a phone number when no UPI ID is stored', () => {
    expect(canPayUpi('')).toBe(false);
    expect(canPayPhone('9844580856')).toBe(true);
    expect(canPayPayee({ phone: '9844580856' })).toBe(true);
    const payee = { phone: '9844580856', name: 'Nandesh Watchman', amount: 8500, note: 'Aug salary' };
    expect(resolvedPayVpa(payee)).toBe('9844580856@ybl');
    expect(gpayUrl(payee)).toContain('gpay://upi/pay?');
    expect(gpayUrl(payee)).toContain('pa=9844580856%40ybl');
    expect(gpayIntentUrl(payee)).toContain('package=com.google.android.apps.nbu.paisa.user');
    expect(gpayHref(payee, 'Mozilla/5.0 (Linux; Android 14)')).toContain('intent://upi/pay?');
    expect(gpayHref(payee, 'Mozilla/5.0 (iPhone)')).toContain('gpay://upi/pay?');
    expect(phonepeUrl(payee)).toContain('phonepe://pay?');
    expect(phonepeUrl(payee)).toContain('pa=9844580856%40ybl');
    expect(upiPayUrl(payee)).toContain('pa=9844580856%40ybl');
    expect(upiPayUrl(payee)).toContain('am=8500');
  });

  it('uses a stored UPI ID when the payee provided one', () => {
    expect(canPayUpi('watchman@okaxis')).toBe(true);
    const payee = { vpa: 'watchman@okaxis', phone: '9844580856', name: 'Watchman', amount: 8500 };
    expect(gpayUrl(payee)).toContain('pa=watchman%40okaxis');
  });

  it('builds a tel link from digits only', () => {
    expect(telUrl('8074839972')).toBe('tel:8074839972');
    expect(telUrl('')).toBe('');
  });
});
