import { describe, it, expect } from 'vitest';
import { activeStagesSorted, reorderStages } from './useCrmStages';
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

describe('reorderStages', () => {
  const s = (id: string, position: number) => ({
    id, company_id: 'c1', name: id, position, stage_type: 'open' as const, color: null, is_active: true, created_at: '',
  });
  const list = [s('a', 1), s('b', 2), s('c', 3)];

  it('swaps positions with the previous stage on up', () => {
    expect(reorderStages(list, 'b', 'up')).toEqual([{ id: 'b', position: 1 }, { id: 'a', position: 2 }]);
  });
  it('swaps positions with the next stage on down', () => {
    expect(reorderStages(list, 'b', 'down')).toEqual([{ id: 'b', position: 3 }, { id: 'c', position: 2 }]);
  });
  it('is a no-op at the top edge', () => {
    expect(reorderStages(list, 'a', 'up')).toEqual([]);
  });
  it('is a no-op at the bottom edge', () => {
    expect(reorderStages(list, 'c', 'down')).toEqual([]);
  });
});
