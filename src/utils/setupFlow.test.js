import { describe, expect, it } from 'vitest';
import { FOUNDING_OWNER_EMAIL } from '../config/accessPolicy';
import {
  isMissingSocietySheetError,
  planSocietyWorkbook,
  shouldAutoCreateSocietySheet,
  shouldCreateNewSocietySpreadsheet,
  shouldOfferSheetCreation,
  shouldSendFounderToSetup,
  shouldShowMissingSheetHelp,
} from './setupFlow';

const MEMBER = 'resident@example.com';
const GRANTED_OWNER = 'treasurer@example.com';
const EXISTING_ID = '1ExistingSocietySheetId000';

describe('shouldOfferSheetCreation', () => {
  it('lets the founding owner create APP-TPT-Tracker when Drive is empty', () => {
    expect(shouldOfferSheetCreation({ isFounder: true, searchConfirmedEmpty: true })).toBe(true);
  });

  it('never offers create to a resident, even when Drive looks empty', () => {
    expect(shouldOfferSheetCreation({ isFounder: false, searchConfirmedEmpty: true })).toBe(false);
  });

  it('does not offer create when a sheet is already bound or already found', () => {
    expect(shouldOfferSheetCreation({ isFounder: true, searchConfirmedEmpty: true, alreadyBound: true })).toBe(false);
    expect(shouldOfferSheetCreation({
      isFounder: true,
      searchConfirmedEmpty: true,
      existingSheetId: EXISTING_ID,
    })).toBe(false);
  });

  it('does not offer create when search has not finished or Drive lookup failed', () => {
    expect(shouldOfferSheetCreation({ isFounder: true, searchConfirmedEmpty: false })).toBe(false);
    expect(shouldOfferSheetCreation({
      isFounder: true,
      searchConfirmedEmpty: true,
      lookupFailed: true,
    })).toBe(false);
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

describe('shouldSendFounderToSetup', () => {
  it('sends the founding owner to Setup when no workbook is bound', () => {
    expect(shouldSendFounderToSetup({ isFounder: true, hasBoundSheet: false })).toBe(true);
  });

  it('does not redirect guests, members, or a bound founder', () => {
    expect(shouldSendFounderToSetup({ isGuest: true, isFounder: true, hasBoundSheet: false })).toBe(false);
    expect(shouldSendFounderToSetup({ isFounder: false, hasBoundSheet: false })).toBe(false);
    expect(shouldSendFounderToSetup({ isFounder: true, hasBoundSheet: true })).toBe(false);
  });
});

describe('isMissingSocietySheetError', () => {
  it('detects SHEET_NOT_BOUND from code or message', () => {
    expect(isMissingSocietySheetError({ code: 'SHEET_NOT_BOUND' })).toBe(true);
    expect(isMissingSocietySheetError({ message: 'SHEET_NOT_BOUND' })).toBe(true);
    expect(isMissingSocietySheetError({ code: 'SHEET_NOT_ACCESSIBLE' })).toBe(false);
  });
});

describe('shouldAutoCreateSocietySheet', () => {
  it('never auto-creates on login or Setup visit', () => {
    expect(shouldAutoCreateSocietySheet()).toBe(false);
  });
});

describe('shouldCreateNewSocietySpreadsheet', () => {
  it('reuses an existing id for every account, including the founding owner', () => {
    expect(shouldCreateNewSocietySpreadsheet({
      email: FOUNDING_OWNER_EMAIL,
      existingSheetId: EXISTING_ID,
    })).toBe(false);
    expect(shouldCreateNewSocietySpreadsheet({
      email: MEMBER,
      existingSheetId: EXISTING_ID,
    })).toBe(false);
    expect(shouldCreateNewSocietySpreadsheet({
      email: GRANTED_OWNER,
      existingSheetId: EXISTING_ID,
    })).toBe(false);
  });

  it('allows a new file only for the founding owner when none exists', () => {
    expect(shouldCreateNewSocietySpreadsheet({ email: FOUNDING_OWNER_EMAIL })).toBe(true);
    expect(shouldCreateNewSocietySpreadsheet({ email: MEMBER })).toBe(false);
    expect(shouldCreateNewSocietySpreadsheet({ email: GRANTED_OWNER })).toBe(false);
  });
});

describe('planSocietyWorkbook', () => {
  it('reuses APP-TPT-Tracker when a permitted resident logs in', () => {
    expect(planSocietyWorkbook({
      email: MEMBER,
      existingSheetId: EXISTING_ID,
    })).toEqual({
      action: 'reuse',
      allowCreate: false,
      autoCreate: false,
      spreadsheetId: EXISTING_ID,
    });
  });

  it('reuses the same sheet when a granted Owner logs in', () => {
    const plan = planSocietyWorkbook({
      email: GRANTED_OWNER,
      existingSheetId: EXISTING_ID,
    });
    expect(plan.action).toBe('reuse');
    expect(plan.allowCreate).toBe(false);
    expect(plan.autoCreate).toBe(false);
    expect(plan.spreadsheetId).toBe(EXISTING_ID);
  });

  it('reuses the sheet on every later founding-owner login', () => {
    const plan = planSocietyWorkbook({
      email: FOUNDING_OWNER_EMAIL,
      existingSheetId: EXISTING_ID,
      alreadyBound: true,
    });
    expect(plan.action).toBe('reuse');
    expect(plan.allowCreate).toBe(false);
    expect(plan.autoCreate).toBe(false);
  });

  it('never lets a granted member create when Drive search finds nothing', () => {
    expect(planSocietyWorkbook({
      email: MEMBER,
      searchConfirmedEmpty: true,
    })).toEqual({ action: 'deny-create', allowCreate: false, autoCreate: false });
    expect(planSocietyWorkbook({
      email: GRANTED_OWNER,
      searchConfirmedEmpty: true,
    })).toEqual({ action: 'deny-create', allowCreate: false, autoCreate: false });
  });

  it('lets the founding owner create once after Drive confirms the file is missing', () => {
    expect(planSocietyWorkbook({
      email: FOUNDING_OWNER_EMAIL,
      searchConfirmedEmpty: true,
    })).toEqual({ action: 'create-once', allowCreate: true, autoCreate: false });
  });

  it('does not create when Drive lookup failed or a bind is already present', () => {
    expect(planSocietyWorkbook({
      email: FOUNDING_OWNER_EMAIL,
      searchConfirmedEmpty: true,
      lookupFailed: true,
    }).allowCreate).toBe(false);
    expect(planSocietyWorkbook({
      email: FOUNDING_OWNER_EMAIL,
      alreadyBound: true,
      searchConfirmedEmpty: true,
    }).allowCreate).toBe(false);
  });
});
