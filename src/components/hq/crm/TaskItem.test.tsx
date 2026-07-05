import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskItem from './TaskItem';
import type { CrmTask } from '@/hooks/data/crmTypes';

const task = (over: Partial<CrmTask>): CrmTask => ({
  id: 't1', company_id: 'c1', client_id: 'cl1', title: 'Ligar', due_date: null,
  assignee_id: null, status: 'pending', completed_at: null, created_at: '', updated_at: '', ...over,
});

describe('TaskItem', () => {
  it('shows the title', () => {
    render(<TaskItem task={task({ title: 'Enviar proposta' })} onToggle={vi.fn()} />);
    expect(screen.getByText('Enviar proposta')).toBeInTheDocument();
  });
  it('toggles to done when a pending task is clicked', () => {
    const onToggle = vi.fn();
    render(<TaskItem task={task({ id: 't9', status: 'pending' })} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('t9', true);
  });
});
