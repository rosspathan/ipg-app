import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamReferralsForm } from '../forms/TeamReferralsForm';
import type { ProgramWithConfig } from '@/hooks/useProgramEconomics';

const mockProgram: ProgramWithConfig = {
  id: 'test-module-id',
  key: 'referrals_team',
  name: 'Team Referrals',
  status: 'live',
  category: 'referral',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  config: {
    system_enabled: true,
    max_levels: 10,
    level_commissions: [5, 3, 2, 1, 1, 0.5, 0.5, 0.25, 0.25, 0.1],
    badge_requirements: {
      level_1: 'SILVER',
      level_2: 'GOLD',
      level_3: 'PLATINUM',
      level_4: 'DIAMOND',
      level_5: 'VIP',
    },
    balance_slabs: [
      { min: 0, max: 1000, max_direct: 5, unlocked_levels: 3 },
      { min: 1000, max: 5000, max_direct: 10, unlocked_levels: 5 },
      { min: 5000, max: null, max_direct: 50, unlocked_levels: 10 },
    ],
    daily_cap_per_user: 100,
    monthly_cap_per_user: 2000,
    daily_cap_system_wide: 50000,
    monthly_cap_system_wide: 1000000,
  },
};

describe('TeamReferralsForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders all form sections', () => {
    render(
      <TeamReferralsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('System Control')).toBeInTheDocument();
    expect(screen.getByText('Level Structure')).toBeInTheDocument();
    expect(screen.getByText('Badge Requirements')).toBeInTheDocument();
    expect(screen.getByText('Balance Slabs')).toBeInTheDocument();
    expect(screen.getByText('Commission Caps')).toBeInTheDocument();
  });

  it('displays current configuration values', () => {
    render(
      <TeamReferralsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const maxLevelsInput = screen.getByLabelText('Maximum Levels');
    expect(maxLevelsInput).toHaveValue(10);
  });

  it('shows real-time calculations', () => {
    render(
      <TeamReferralsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Total Payout/)).toBeInTheDocument();
    expect(screen.getByText(/Average Commission/)).toBeInTheDocument();
  });

  it('validates commission structure', async () => {
    render(
      <TeamReferralsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const level1Input = screen.getByLabelText(/Level 1/);
    
    // Try to set invalid value (over 100%)
    fireEvent.change(level1Input, { target: { value: '150' } });
    
    await waitFor(() => {
      expect(screen.getByText(/cannot exceed 100%/)).toBeInTheDocument();
    });
  });

  it('handles system enable/disable toggle', async () => {
    render(
      <TeamReferralsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    
    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });
  });

  it('calls onSave with correct data structure', async () => {
    render(
      <TeamReferralsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          system_enabled: expect.any(Boolean),
          max_levels: expect.any(Number),
          level_commissions: expect.any(Array),
        })
      );
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    render(
      <TeamReferralsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('updates balance slabs correctly', async () => {
    render(
      <TeamReferralsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Find and update a balance slab field
    const minBalanceInputs = screen.getAllByLabelText(/Min Balance/);
    fireEvent.change(minBalanceInputs[0], { target: { value: '500' } });

    await waitFor(() => {
      expect(minBalanceInputs[0]).toHaveValue(500);
    });
  });

  it('shows validation errors for invalid caps', async () => {
    render(
      <TeamReferralsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const dailyCapInput = screen.getByLabelText(/Daily Cap Per User/);
    
    // Set daily cap higher than monthly cap
    fireEvent.change(dailyCapInput, { target: { value: '5000' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Daily cap cannot exceed monthly cap/)).toBeInTheDocument();
    });
  });
});
