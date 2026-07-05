import { describe, it, expect } from 'vitest';
import { filterSortClients, type LeadFilter } from './useCrmClients';
import type { Client } from './crmTypes';

const base = (over: Partial<Client>): Client => ({
  id: 'x', company_id: 'c1', name: 'X', source: null, entered_at: '2026-01-01T00:00:00Z',
  owner_id: null, stage_id: null, estimated_value: null, lost_reason: null, lost_at: null,
  created_at: '', updated_at: '', ...over,
});
const ALL: LeadFilter = { stageId: 'all', ownerId: 'all', source: 'all' };

describe('filterSortClients', () => {
  const a = base({ id: 'a', name: 'Alfa', source: 'site', stage_id: 's1', owner_id: 'u1', estimated_value: 100, entered_at: '2026-01-03T00:00:00Z' });
  const b = base({ id: 'b', name: 'Beta', source: 'indicação', stage_id: 's2', owner_id: 'u2', estimated_value: 300, entered_at: '2026-01-01T00:00:00Z' });
  const c = base({ id: 'c', name: 'Gama', source: 'site', stage_id: 's1', owner_id: 'u1', estimated_value: 200, entered_at: '2026-01-02T00:00:00Z' });
  const list = [a, b, c];

  it('searches by name (case-insensitive)', () => {
    expect(filterSortClients(list, 'be', ALL, 'name').map((x) => x.id)).toEqual(['b']);
  });
  it('searches by source', () => {
    expect(filterSortClients(list, 'indica', ALL, 'name').map((x) => x.id)).toEqual(['b']);
  });
  it('filters by stage', () => {
    const f = { ...ALL, stageId: 's1' };
    expect(filterSortClients(list, '', f, 'name').map((x) => x.id).sort()).toEqual(['a', 'c']);
  });
  it('filters by owner', () => {
    const f = { ...ALL, ownerId: 'u2' };
    expect(filterSortClients(list, '', f, 'name').map((x) => x.id)).toEqual(['b']);
  });
  it('filters by source value', () => {
    const f = { ...ALL, source: 'site' };
    expect(filterSortClients(list, '', f, 'name').map((x) => x.id).sort()).toEqual(['a', 'c']);
  });
  it('sorts by recent (entered_at desc)', () => {
    expect(filterSortClients(list, '', ALL, 'recent').map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
  it('sorts by value desc (nulls last)', () => {
    const withNull = [...list, base({ id: 'd', estimated_value: null })];
    expect(filterSortClients(withNull, '', ALL, 'value').map((x) => x.id)).toEqual(['b', 'c', 'a', 'd']);
  });
  it('sorts by name asc', () => {
    expect(filterSortClients(list, '', ALL, 'name').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
