import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgramAnalytics } from '../ProgramAnalytics';
import type { ProgramWithConfig } from '@/hooks/useProgramEconomics';

const mockProgram: ProgramWithConfig = {
  id: 'test-program-id',
  key: 'referrals_team',
  name: 'Team Referrals',
  status: 'live',
  category: 'referral',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  config: {
    system_enabled: true,
    max_levels: 10,
  },
};

describe('ProgramAnalytics', () => {
  it('renders program name and key', () => {
    render(<ProgramAnalytics program={mockProgram} />);
    
    expect(screen.getByText('Team Referrals')).toBeInTheDocument();
    expect(screen.getByText('referrals_team')).toBeInTheDocument();
  });

  it('displays key metrics cards', () => {
    render(<ProgramAnalytics program={mockProgram} />);
    
    expect(screen.getByText('Total Views')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('Revenue Generated')).toBeInTheDocument();
  });

  it('shows engagement trend chart', () => {
    render(<ProgramAnalytics program={mockProgram} />);
    
    expect(screen.getByText('Engagement Trend')).toBeInTheDocument();
  });

  it('displays user activity chart', () => {
    render(<ProgramAnalytics program={mockProgram} />);
    
    expect(screen.getByText('User Activity')).toBeInTheDocument();
  });

  it('shows revenue breakdown', () => {
    render(<ProgramAnalytics program={mockProgram} />);
    
    expect(screen.getByText('Revenue Breakdown')).toBeInTheDocument();
  });

  it('has date range selector', () => {
    render(<ProgramAnalytics program={mockProgram} />);
    
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
  });

  it('updates charts when date range changed', () => {
    render(<ProgramAnalytics program={mockProgram} />);
    
    const thirtyDaysButton = screen.getByText('Last 30 days');
    fireEvent.click(thirtyDaysButton);
    
    // Charts should update (implementation specific)
    expect(thirtyDaysButton).toHaveClass('active');
  });

  it('displays funnel visualization', () => {
    render(<ProgramAnalytics program={mockProgram} />);
    
    expect(screen.getByText('Conversion Funnel')).toBeInTheDocument();
  });

  it('shows top performers section', () => {
    render(<ProgramAnalytics program={mockProgram} />);
    
    expect(screen.getByText('Top Performers')).toBeInTheDocument();
  });
});
