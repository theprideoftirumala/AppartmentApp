import { describe, expect, it } from 'vitest';
import { isGoogleApiNotEnabledMessage } from './googleApiError';

describe('isGoogleApiNotEnabledMessage', () => {
  it('matches the real API-not-enabled wording', () => {
    expect(isGoogleApiNotEnabledMessage(
      'Google Sheets API has not been used in project 123 before or it is disabled.',
      'Google Sheets',
    )).toBe(true);
    expect(isGoogleApiNotEnabledMessage('accessNotConfigured', 'Google Sheets')).toBe(true);
  });

  it('does not treat a normal Sheets 403 as API disabled', () => {
    expect(isGoogleApiNotEnabledMessage(
      'The caller does not have permission. See https://sheets.googleapis.com',
      'Google Sheets',
    )).toBe(false);
    expect(isGoogleApiNotEnabledMessage(
      'Quota exceeded for quota metric. https://sheets.googleapis.com/$discovery/rest',
      'Google Sheets',
    )).toBe(false);
  });
});
