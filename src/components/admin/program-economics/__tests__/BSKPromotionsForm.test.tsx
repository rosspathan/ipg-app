import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BSKPromotionsForm } from '../forms/BSKPromotionsForm';
import type { ProgramWithConfig } from '@/hooks/useProgramEconomics';

const mockProgram: ProgramWithConfig = {
  id: 'test-promotions-id',
  key: 'bsk_promotions',
  name: 'BSK Promotions',
  status: 'live',
  category: 'reward',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  config: {
    system_enabled: true,
    bonus_percent: 10,
    min_purchase_inr: 100,
    max_purchase_inr: 100000,
    rate_snapshot_bsk_inr: 1.5,
    destination: 'holding',
    eligible_channels: ['upi', 'bank_transfer'],
    vesting_enabled: true,
    vesting_duration_days: 100,
    per_user_limit: 'once_per_campaign',
    per_user_max_times: 3,
    global_budget_bsk: 1000000,
  },
};

describe('BSKPromotionsForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders all configuration sections', () => {
    render(
      <BSKPromotionsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('System Control')).toBeInTheDocument();
    expect(screen.getByText('Bonus Configuration')).toBeInTheDocument();
    expect(screen.getByText('Purchase Limits')).toBeInTheDocument();
    expect(screen.getByText('Vesting Settings')).toBeInTheDocument();
    expect(screen.getByText('Budget Controls')).toBeInTheDocument();
  });

  it('displays current bonus percentage', () => {
    render(
      <BSKPromotionsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const bonusInput = screen.getByLabelText(/Bonus Percentage/);
    expect(bonusInput).toHaveValue(10);
  });

  it('shows real-time bonus calculations', () => {
    render(
      <BSKPromotionsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Example:/)).toBeInTheDocument();
    expect(screen.getByText(/₹100 purchase/)).toBeInTheDocument();
  });

  it('validates min/max purchase amounts', async () => {
    render(
      <BSKPromotionsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const minInput = screen.getByLabelText(/Minimum Purchase/);
    const maxInput = screen.getByLabelText(/Maximum Purchase/);

    // Set min higher than max
    fireEvent.change(minInput, { target: { value: '200000' } });
    fireEvent.change(maxInput, { target: { value: '100000' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Minimum cannot exceed maximum/)).toBeInTheDocument();
    });
  });

  it('handles destination toggle', async () => {
    render(
      <BSKPromotionsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const destinationSelect = screen.getByLabelText(/Destination/);
    expect(destinationSelect).toHaveValue('holding');

    fireEvent.change(destinationSelect, { target: { value: 'withdrawable' } });

    await waitFor(() => {
      expect(destinationSelect).toHaveValue('withdrawable');
    });
  });

  it('shows vesting controls when vesting enabled', () => {
    render(
      <BSKPromotionsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const vestingToggle = screen.getByLabelText(/Enable Vesting/);
    expect(vestingToggle).toBeChecked();

    const durationInput = screen.getByLabelText(/Vesting Duration/);
    expect(durationInput).toBeInTheDocument();
  });

  it('handles eligible channels selection', async () => {
    render(
      <BSKPromotionsForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const upiCheckbox = screen.getByLabelText(/UPI/);
    expect(upiCheckbox).toBeChecked();

    fireEvent.click(upiCheckbox);

    await waitFor(() => {
      expect(upiCheckbox).not.toBeChecked();
    });
  });

  it('calls onSave with complete configuration', async () => {
    render(
      <BSKPromotionsForm
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
          bonus_percent: expect.any(Number),
          destination: expect.any(String),
          vesting_enabled: expect.any(Boolean),
        })
      );
    });
  });
});
