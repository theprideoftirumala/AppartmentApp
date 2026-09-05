import { describe, expect, it } from 'vitest';
import { shouldOfferSheetCreation, shouldShowMissingSheetHelp } from './setupFlow';

describe('shouldOfferSheetCreation', () => {
  it('lets the founding owner create APP-TPT-Tracker when Drive is empty', () => {
    expect(shouldOfferSheetCreation({ isFounder: true, searchConfirmedEmpty: true })).toBe(true);
    expect(shouldOfferSheetCreation({ isFounder: false, searchConfirmedEmpty: true })).toBe(false);
    expect(shouldOfferSheetCreation({ isFounder: true, searchConfirmedEmpty: false })).toBe(false);
  });
});

describe('shouldShowMissingSheetHelp', () => {
  it('shows create help only when search confirmed the file is missing', () => {
    expect(shouldShowMissingSheetHelp({ searchConfirmedEmpty: true })).toBe(true);
  });

  it('does not show help when Drive lookup failed', () => {
    expect(shouldShowMissingSheetHelp({ searchConfirmedEmpty: true, lookupFailed: true })).toBe(false);
  });

  it('does not show help when a workbook is already bound', () => {
    expect(shouldShowMissingSheetHelp({ searchConfirmedEmpty: true, alreadyBound: true })).toBe(false);
  });
});
