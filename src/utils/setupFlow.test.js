import { describe, expect, it } from 'vitest';
import { shouldOfferSheetCreation } from './setupFlow';

describe('shouldOfferSheetCreation', () => {
  it('offers create only when search confirmed the society sheet is missing', () => {
    expect(shouldOfferSheetCreation({ searchConfirmedEmpty: true })).toBe(true);
  });

  it('does not offer create when Drive lookup failed', () => {
    expect(shouldOfferSheetCreation({ searchConfirmedEmpty: true, lookupFailed: true })).toBe(false);
  });

  it('does not offer create when a workbook is already bound', () => {
    expect(shouldOfferSheetCreation({ searchConfirmedEmpty: true, alreadyBound: true })).toBe(false);
  });

  it('does not offer create before search finishes', () => {
    expect(shouldOfferSheetCreation({})).toBe(false);
    expect(shouldOfferSheetCreation({ searchConfirmedEmpty: false })).toBe(false);
  });
});
