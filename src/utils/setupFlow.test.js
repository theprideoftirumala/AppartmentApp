import { describe, expect, it } from 'vitest';
import { shouldOfferSheetCreation, shouldShowMissingSheetHelp } from './setupFlow';

describe('shouldOfferSheetCreation', () => {
  it('never offers create — the society file is The Pride of Tirumala-APP in Drive', () => {
    expect(shouldOfferSheetCreation()).toBe(false);
    expect(shouldOfferSheetCreation({ searchConfirmedEmpty: true })).toBe(false);
  });
});

describe('shouldShowMissingSheetHelp', () => {
  it('shows upload help only when search confirmed the APP file is missing', () => {
    expect(shouldShowMissingSheetHelp({ searchConfirmedEmpty: true })).toBe(true);
  });

  it('does not show help when Drive lookup failed', () => {
    expect(shouldShowMissingSheetHelp({ searchConfirmedEmpty: true, lookupFailed: true })).toBe(false);
  });

  it('does not show help when a workbook is already bound', () => {
    expect(shouldShowMissingSheetHelp({ searchConfirmedEmpty: true, alreadyBound: true })).toBe(false);
  });

  it('does not show help before search finishes', () => {
    expect(shouldShowMissingSheetHelp({})).toBe(false);
    expect(shouldShowMissingSheetHelp({ searchConfirmedEmpty: false })).toBe(false);
  });
});
