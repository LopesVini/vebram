import { describe, it, expect } from 'vitest';
import { buildTrigger, buildAction } from './useCrmRules';

describe('rule builders', () => {
  it('buildTrigger encodes a stage-entered trigger', () => {
    expect(buildTrigger('s1')).toEqual({ type: 'stage_entered', stage_id: 's1' });
  });
  it('buildAction encodes a create-task action', () => {
    expect(buildAction(3, 'Follow-up')).toEqual({ type: 'create_task', offset_days: 3, title: 'Follow-up' });
  });
  it('buildAction coerces the offset to a number', () => {
    expect(buildAction(Number('5'), 'X').offset_days).toBe(5);
  });
});
