import { describe, it, expect } from 'vitest';
import { bucketTasks } from './useCrmTasks';
import type { CrmTask } from './crmTypes';

const mk = (over: Partial<CrmTask>): CrmTask => ({
  id: 'x', company_id: 'c1', client_id: 'cl1', title: 'T', due_date: null,
  assignee_id: null, status: 'pending', completed_at: null, created_at: '', updated_at: '', ...over,
});

describe('bucketTasks', () => {
  const today = '2026-07-05';
  it('puts done tasks in done regardless of date', () => {
    const out = bucketTasks([mk({ id: 'a', status: 'done', due_date: '2026-01-01' })], today);
    expect(out.done.map((t) => t.id)).toEqual(['a']);
    expect(out.overdue).toHaveLength(0);
  });
  it('overdue = pending with due_date before today', () => {
    const out = bucketTasks([mk({ id: 'a', due_date: '2026-07-04' })], today);
    expect(out.overdue.map((t) => t.id)).toEqual(['a']);
  });
  it('today = pending due exactly today', () => {
    const out = bucketTasks([mk({ id: 'a', due_date: '2026-07-05' })], today);
    expect(out.today.map((t) => t.id)).toEqual(['a']);
  });
  it('upcoming = pending due after today OR with no due date', () => {
    const out = bucketTasks([mk({ id: 'a', due_date: '2026-07-06' }), mk({ id: 'b', due_date: null })], today);
    expect(out.upcoming.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });
});
