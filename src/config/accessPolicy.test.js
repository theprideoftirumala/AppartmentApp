import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MEMBER_ROLE,
  effectiveAppRole,
  isFoundingOwner,
  maskEmail,
  normalizeRequestedRole,
} from './accessPolicy';

describe('maskEmail', () => {
  it('hides the local part after two characters', () => {
    expect(maskEmail('jane.owner@example.com')).toBe('ja***@example.com');
  });
});

describe('isFoundingOwner', () => {
  it('rejects a random resident', () => {
    expect(isFoundingOwner('resident@example.com')).toBe(false);
  });
});

describe('effectiveAppRole', () => {
  it('treats inactive ACL rows as no access', () => {
    expect(effectiveAppRole('resident@example.com', { role: 'Owner', status: 'Inactive' })).toBeNull();
  });

  it('maps a non-owner active row to Reader', () => {
    expect(effectiveAppRole('resident@example.com', { role: 'Reader', status: 'Active' })).toBe('Reader');
  });
});

describe('normalizeRequestedRole', () => {
  it('forces Reader when a non-founder asks for Owner', () => {
    expect(normalizeRequestedRole('Owner', 'resident@example.com')).toBe(DEFAULT_MEMBER_ROLE);
  });
});
