import { describe, it, expect } from 'vitest';
import { activeStagesSorted } from './useCrmStages';
import type { PipelineStage } from './crmTypes';

const mk = (id: string, position: number, is_active = true): PipelineStage => ({
  id, company_id: 'c1', name: id, position, stage_type: 'open',
  color: null, is_active, created_at: '',
});

describe('activeStagesSorted', () => {
  it('drops inactive stages', () => {
    const out = activeStagesSorted([mk('a', 1), mk('b', 2, false)]);
    expect(out.map((s) => s.id)).toEqual(['a']);
  });
  it('orders by position ascending', () => {
    const out = activeStagesSorted([mk('c', 3), mk('a', 1), mk('b', 2)]);
    expect(out.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
  it('does not mutate its input', () => {
    const input = [mk('c', 3), mk('a', 1)];
    activeStagesSorted(input);
    expect(input.map((s) => s.id)).toEqual(['c', 'a']);
  });
});
