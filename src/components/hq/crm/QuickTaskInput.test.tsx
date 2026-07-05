import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickTaskInput from './QuickTaskInput';

describe('QuickTaskInput', () => {
  it('calls onAdd with the title and the fixed client id, then clears', () => {
    const onAdd = vi.fn();
    render(<QuickTaskInput fixedClientId="cl1" onAdd={onAdd} />);
    const input = screen.getByPlaceholderText(/nova tarefa/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Follow-up' } });
    fireEvent.submit(input.closest('form')!);
    expect(onAdd).toHaveBeenCalledWith('Follow-up', null, 'cl1');
    expect(input.value).toBe('');
  });
  it('does not call onAdd when the title is blank', () => {
    const onAdd = vi.fn();
    render(<QuickTaskInput fixedClientId="cl1" onAdd={onAdd} />);
    fireEvent.submit(screen.getByPlaceholderText(/nova tarefa/i).closest('form')!);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
