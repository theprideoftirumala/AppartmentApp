import { describe, expect, it } from 'vitest';
import { canPayUpi, gpayUrl, phonepeUrl, telUrl, upiPayUrl } from './upiPay';

describe('upi pay links', () => {
  it('builds GPay and PhonePe links only when a VPA is present', () => {
    expect(canPayUpi('')).toBe(false);
    expect(canPayUpi('watchman@okaxis')).toBe(true);
    const payee = { vpa: 'watchman@okaxis', name: 'Watchman', amount: 8500, note: 'Aug salary' };
    expect(gpayUrl(payee)).toContain('tez://upi/pay?');
    expect(gpayUrl(payee)).toContain('pa=watchman%40okaxis');
    expect(phonepeUrl(payee)).toContain('phonepe://pay?');
    expect(upiPayUrl(payee)).toContain('upi://pay?');
    expect(upiPayUrl(payee)).toContain('am=8500');
  });

  it('builds a tel link from digits only', () => {
    expect(telUrl('8074839972')).toBe('tel:8074839972');
    expect(telUrl('')).toBe('');
  });
});
