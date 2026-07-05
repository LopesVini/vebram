import { describe, it, expect } from 'vitest';
import { pickActiveCompany } from './useCrmCompany';
import type { MembershipWithCompany } from './crmTypes';

const mk = (id: string): MembershipWithCompany => ({
  id: 'm-' + id, company_id: id, user_id: 'u1', role: 'owner', created_at: '',
  company: { id, name: id.toUpperCase(), slug: id, is_active: true, created_at: '', updated_at: '' },
});

describe('pickActiveCompany', () => {
  it('returns null when there are no memberships', () => {
    expect(pickActiveCompany([], null)).toBeNull();
    expect(pickActiveCompany([], 'x')).toBeNull();
  });
  it('keeps the persisted company when it is still a member', () => {
    expect(pickActiveCompany([mk('a'), mk('b')], 'b')).toBe('b');
  });
  it('falls back to the first membership when persisted id is invalid', () => {
    expect(pickActiveCompany([mk('a'), mk('b')], 'zzz')).toBe('a');
  });
  it('uses the first membership when nothing is persisted', () => {
    expect(pickActiveCompany([mk('a'), mk('b')], null)).toBe('a');
  });
});
