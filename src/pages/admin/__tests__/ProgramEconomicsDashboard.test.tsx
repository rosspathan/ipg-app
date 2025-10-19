import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProgramEconomicsDashboard from '../ProgramEconomicsDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
vi.mock('@/hooks/useProgramEconomics', () => ({
  useProgramEconomics: () => ({
    programs: [
      {
        id: 'team-ref-id',
        key: 'referrals_team',
        name: 'Team Referrals',
        status: 'live',
        category: 'referral',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        config: {
          system_enabled: true,
          max_levels: 10,
          daily_cap_per_user: 100,
        },
      },
      {
        id: 'bsk-promo-id',
        key: 'bsk_promotions',
        name: 'BSK Promotions',
        status: 'live',
        category: 'reward',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        config: {
          system_enabled: true,
          bonus_percent: 10,
        },
      },
      {
        id: 'bsk-loans-id',
        key: 'bsk_loans',
        name: 'BSK Loans',
        status: 'paused',
        category: 'finance',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        config: {
          system_enabled: false,
          interest_rate: 5,
        },
      },
    ],
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

describe('ProgramEconomicsDashboard', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProgramEconomicsDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient.clear();
  });

  it('renders dashboard header', () => {
    renderDashboard();
    
    expect(screen.getByText('Program Economics')).toBeInTheDocument();
    expect(screen.getByText(/Manage all BSK-controlled programs/)).toBeInTheDocument();
  });

  it('displays quick stats bar', () => {
    renderDashboard();
    
    expect(screen.getByText(/Total Programs/)).toBeInTheDocument();
    expect(screen.getByText(/Live Programs/)).toBeInTheDocument();
  });

  it('shows all programs in table', () => {
    renderDashboard();
    
    expect(screen.getByText('Team Referrals')).toBeInTheDocument();
    expect(screen.getByText('BSK Promotions')).toBeInTheDocument();
    expect(screen.getByText('BSK Loans')).toBeInTheDocument();
  });

  it('displays program status badges', () => {
    renderDashboard();
    
    const liveStatuses = screen.getAllByText('live');
    expect(liveStatuses).toHaveLength(2);
    
    expect(screen.getByText('paused')).toBeInTheDocument();
  });

  it('filters programs by search query', async () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText('Search programs...');
    fireEvent.change(searchInput, { target: { value: 'Team' } });

    await waitFor(() => {
      expect(screen.getByText('Team Referrals')).toBeInTheDocument();
      expect(screen.queryByText('BSK Promotions')).not.toBeInTheDocument();
    });
  });

  it('has Create Program button', () => {
    renderDashboard();
    
    const createButton = screen.getByText('Create Program');
    expect(createButton).toBeInTheDocument();
  });

  it('has Analytics navigation button', () => {
    renderDashboard();
    
    const analyticsButton = screen.getByText('Analytics');
    expect(analyticsButton).toBeInTheDocument();
    expect(analyticsButton.closest('a')).toHaveAttribute('href', '/admin/program-economics-analytics');
  });

  it('opens analytics modal when view analytics clicked', async () => {
    renderDashboard();
    
    const viewButtons = screen.getAllByText('View Analytics');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Program Analytics')).toBeInTheDocument();
    });
  });

  it('shows program configuration details', () => {
    renderDashboard();
    
    // Check if key config values are visible
    expect(screen.getByText(/Max Levels: 10/)).toBeInTheDocument();
    expect(screen.getByText(/Bonus: 10%/)).toBeInTheDocument();
  });

  it('displays system status indicators', () => {
    renderDashboard();
    
    // Check for enabled/disabled indicators
    const enabledIndicators = screen.getAllByText(/Enabled/);
    expect(enabledIndicators.length).toBeGreaterThan(0);
  });

  it('handles loading state', () => {
    vi.mock('@/hooks/useProgramEconomics', () => ({
      useProgramEconomics: () => ({
        programs: [],
        isLoading: true,
        refetch: vi.fn(),
      }),
    }));

    renderDashboard();
    
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('shows empty state when no programs match search', async () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText('Search programs...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentProgram' } });

    await waitFor(() => {
      expect(screen.getByText(/No programs found/)).toBeInTheDocument();
    });
  });
});
