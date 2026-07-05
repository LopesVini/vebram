import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrmLoading, CrmNoAccess } from './CrmStates';

describe('CrmStates', () => {
  it('CrmLoading shows a loading message', () => {
    render(<CrmLoading />);
    expect(screen.getByText(/carregando crm/i)).toBeInTheDocument();
  });
  it('CrmNoAccess explains the user has no CRM access', () => {
    render(<CrmNoAccess />);
    expect(screen.getByText(/sem acesso ao crm/i)).toBeInTheDocument();
  });
});
