import { describe, it, expect } from 'vitest';
import { describeInteraction } from './useCrmClient';
import type { Interaction } from './crmTypes';

const mk = (over: Partial<Interaction>): Interaction => ({
  id: 'i', company_id: 'c1', client_id: 'cl1', author_id: null, type: 'note',
  body: null, metadata: {}, created_at: '', ...over,
});
const stageName = (id: string | null | undefined) => (id === 's1' ? 'Prospecção' : id === 's2' ? 'Proposta' : 'Sem etapa');

describe('describeInteraction', () => {
  it('note returns its body', () => {
    expect(describeInteraction(mk({ type: 'note', body: 'Ligar amanhã' }), stageName)).toBe('Ligar amanhã');
  });
  it('stage_change describes the transition using stage names', () => {
    const it = mk({ type: 'stage_change', metadata: { from_stage_id: 's1', to_stage_id: 's2' } });
    expect(describeInteraction(it, stageName)).toBe('Mudou de Prospecção para Proposta');
  });
  it('contact returns a generic label when body is empty', () => {
    expect(describeInteraction(mk({ type: 'contact', body: null }), stageName)).toBe('Contato registrado');
  });
});
