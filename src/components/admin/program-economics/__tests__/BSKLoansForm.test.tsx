import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BSKLoansForm } from '../forms/BSKLoansForm';
import type { ProgramWithConfig } from '@/hooks/useProgramEconomics';

const mockProgram: ProgramWithConfig = {
  id: 'test-loans-id',
  key: 'bsk_loans',
  name: 'BSK Loans',
  status: 'live',
  category: 'finance',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  config: {
    system_enabled: true,
    interest_rate: 5,
    loan_duration_weeks: 10,
    min_loan_amount: 100,
    max_loan_amount: 50000,
    late_fee_percent: 2,
    grace_period_days: 3,
    collateral_required: true,
    collateral_ratio: 1.5,
    max_active_loans_per_user: 1,
    min_credit_score: 600,
  },
};

describe('BSKLoansForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders all loan configuration sections', () => {
    render(
      <BSKLoansForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('System Control')).toBeInTheDocument();
    expect(screen.getByText('Interest Configuration')).toBeInTheDocument();
    expect(screen.getByText('Loan Limits')).toBeInTheDocument();
    expect(screen.getByText('Collateral Settings')).toBeInTheDocument();
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
  });

  it('displays current interest rate', () => {
    render(
      <BSKLoansForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const interestInput = screen.getByLabelText(/Interest Rate/);
    expect(interestInput).toHaveValue(5);
  });

  it('calculates weekly payment correctly', () => {
    render(
      <BSKLoansForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Should show example calculation
    expect(screen.getByText(/Example:/)).toBeInTheDocument();
    expect(screen.getByText(/₹10,000 loan/)).toBeInTheDocument();
  });

  it('validates interest rate bounds', async () => {
    render(
      <BSKLoansForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const interestInput = screen.getByLabelText(/Interest Rate/);
    
    // Try to set negative interest
    fireEvent.change(interestInput, { target: { value: '-5' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Interest rate must be positive/)).toBeInTheDocument();
    });
  });

  it('handles collateral requirement toggle', async () => {
    render(
      <BSKLoansForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const collateralToggle = screen.getByLabelText(/Require Collateral/);
    expect(collateralToggle).toBeChecked();

    fireEvent.click(collateralToggle);

    await waitFor(() => {
      expect(collateralToggle).not.toBeChecked();
    });
  });

  it('shows collateral ratio when collateral required', () => {
    render(
      <BSKLoansForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const ratioInput = screen.getByLabelText(/Collateral Ratio/);
    expect(ratioInput).toBeInTheDocument();
    expect(ratioInput).toHaveValue(1.5);
  });

  it('validates min/max loan amounts', async () => {
    render(
      <BSKLoansForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const minInput = screen.getByLabelText(/Minimum Loan Amount/);
    const maxInput = screen.getByLabelText(/Maximum Loan Amount/);

    // Set min higher than max
    fireEvent.change(minInput, { target: { value: '100000' } });
    fireEvent.change(maxInput, { target: { value: '50000' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Minimum cannot exceed maximum/)).toBeInTheDocument();
    });
  });

  it('handles late fee configuration', async () => {
    render(
      <BSKLoansForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const lateFeeInput = screen.getByLabelText(/Late Fee Percentage/);
    expect(lateFeeInput).toHaveValue(2);

    fireEvent.change(lateFeeInput, { target: { value: '3' } });

    await waitFor(() => {
      expect(lateFeeInput).toHaveValue(3);
    });
  });

  it('validates grace period days', async () => {
    render(
      <BSKLoansForm
        program={mockProgram}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const graceInput = screen.getByLabelText(/Grace Period/);
    
    // Set negative grace period
    fireEvent.change(graceInput, { target: { value: '-1' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Grace period cannot be negative/)).toBeInTheDocument();
    });
  });

  it('calls onSave with complete loan configuration', async () => {
    render(
      <BSKLoansForm
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
          interest_rate: expect.any(Number),
          loan_duration_weeks: expect.any(Number),
          collateral_required: expect.any(Boolean),
        })
      );
    });
  });
});
