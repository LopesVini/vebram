import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StageBadge from './StageBadge';
import type { PipelineStage } from '@/hooks/data/crmTypes';

const stage = (over: Partial<PipelineStage>): PipelineStage => ({
  id: 's1', company_id: 'c1', name: 'Prospecção', position: 1, stage_type: 'open',
  color: null, is_active: true, created_at: '', ...over,
});

describe('StageBadge', () => {
  it('shows the stage name', () => {
    render(<StageBadge stage={stage({ name: 'Negociação' })} />);
    expect(screen.getByText('Negociação')).toBeInTheDocument();
  });
  it('falls back to "Sem etapa" when no stage', () => {
    render(<StageBadge />);
    expect(screen.getByText(/sem etapa/i)).toBeInTheDocument();
  });
});
