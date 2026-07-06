import { describe, it, expect } from 'vitest';
import { countNewLeads, leadsByStage, pipelineStats, upcomingTasks } from './crmDashboard';
import type { Client, PipelineStage, CrmTask } from '@/hooks/data/crmTypes';

const client = (over: Partial<Client>): Client => ({
  id: 'x', company_id: 'c1', name: 'X', source: null, entered_at: '2026-07-01T00:00:00Z',
  owner_id: null, stage_id: null, estimated_value: null, lost_reason: null, lost_at: null,
  created_at: '', updated_at: '', ...over,
});
const stage = (id: string, position: number, stage_type: PipelineStage['stage_type']): PipelineStage => ({
  id, company_id: 'c1', name: id.toUpperCase(), position, stage_type, color: null, is_active: true, created_at: '',
});
const task = (over: Partial<CrmTask>): CrmTask => ({
  id: 't', company_id: 'c1', client_id: 'cl1', title: 'T', due_date: null, assignee_id: null,
  status: 'pending', completed_at: null, created_at: '', updated_at: '', ...over,
});

const STAGES = [stage('s1', 1, 'open'), stage('s2', 2, 'open'), stage('won', 3, 'won'), stage('lost', 4, 'lost')];

describe('countNewLeads', () => {
  it('counts leads entered on or after the cutoff', () => {
    const list = [client({ entered_at: '2026-07-05T10:00:00Z' }), client({ entered_at: '2026-06-20T00:00:00Z' })];
    expect(countNewLeads(list, '2026-06-28T00:00:00Z')).toBe(1);
  });
});

describe('leadsByStage', () => {
  it('returns one bar per stage with count and summed value, in stage order', () => {
    const list = [
      client({ stage_id: 's1', estimated_value: 100 }),
      client({ stage_id: 's1', estimated_value: 50 }),
      client({ stage_id: 's2', estimated_value: 200 }),
    ];
    const out = leadsByStage(list, STAGES);
    expect(out.map((b) => [b.id, b.count, b.value])).toEqual([
      ['s1', 2, 150], ['s2', 1, 200], ['won', 0, 0], ['lost', 0, 0],
    ]);
  });
});

describe('pipelineStats', () => {
  it('counts won/lost/open, sums open value, and computes conversion = won/(won+lost)%', () => {
    const list = [
      client({ stage_id: 's1', estimated_value: 100 }),   // open
      client({ stage_id: 'won', estimated_value: 999 }),   // won (excluded from pipeline value)
      client({ stage_id: 'won', estimated_value: 1 }),     // won
      client({ stage_id: 'lost', estimated_value: 5 }),    // lost
      client({ stage_id: null, estimated_value: 40 }),     // no stage → open
    ];
    const s = pipelineStats(list, STAGES);
    expect(s.total).toBe(5);
    expect(s.won).toBe(2);
    expect(s.lost).toBe(1);
    expect(s.open).toBe(2);
    expect(s.pipelineValue).toBe(140); // 100 + 40 (open only)
    expect(s.conversionRate).toBe(67); // 2/3 = 66.6 → 67
  });
  it('conversion is 0 when nothing is closed', () => {
    expect(pipelineStats([client({ stage_id: 's1' })], STAGES).conversionRate).toBe(0);
  });
});

describe('upcomingTasks', () => {
  it('returns only pending, soonest due first (nulls last), limited', () => {
    const list = [
      task({ id: 'a', due_date: '2026-07-10' }),
      task({ id: 'b', due_date: null }),
      task({ id: 'c', due_date: '2026-07-02' }),
      task({ id: 'd', due_date: '2026-07-05', status: 'done' }),
    ];
    expect(upcomingTasks(list, 2).map((t) => t.id)).toEqual(['c', 'a']);
  });
});
