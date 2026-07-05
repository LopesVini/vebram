import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanySwitcherView } from './CompanySwitcher';
import type { MembershipWithCompany } from '@/hooks/data/crmTypes';

const mk = (id: string): MembershipWithCompany => ({
  id: 'm-' + id, company_id: id, user_id: 'u1', role: 'owner', created_at: '',
  company: { id, name: id.toUpperCase(), slug: id, is_active: true, created_at: '', updated_at: '' },
});

describe('CompanySwitcherView', () => {
  it('renders nothing when the user has fewer than two companies', () => {
    const { container } = render(
      <CompanySwitcherView companies={[mk('a')]} companyId="a" onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
  it('shows the active company name when there are multiple', () => {
    render(
      <CompanySwitcherView companies={[mk('a'), mk('b')]} companyId="b" onSelect={vi.fn()} />,
    );
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
