import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DisburseRequest {
  loan_id: string;
  action: 'approve' | 'reject';
  admin_notes?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { loan_id, action, admin_notes }: DisburseRequest = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: hasAdminRole } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    if (!hasAdminRole) {
      throw new Error('Admin access required');
    }

    console.log(`BSK Loan ${action}: Admin ${user.id} processing loan ${loan_id}`);

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from('bsk_loans')
      .select('*')
      .eq('id', loan_id)
      .eq('status', 'pending')
      .single();

    if (loanError || !loan) {
      throw new Error('Loan not found or not in pending status');
    }

    if (action === 'reject') {
      // Reject loan
      await supabase
        .from('bsk_loans')
        .update({ 
          status: 'written_off',
          admin_notes,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', loan_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Loan rejected successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // APPROVE AND DISBURSE LOAN
    const disbursalTime = new Date();
    
    // Update loan status to active
    const { error: updateError } = await supabase
      .from('bsk_loans')
      .update({
        status: 'approved',
        approved_at: disbursalTime.toISOString(),
        disbursed_at: disbursalTime.toISOString(),
        approved_by: user.id,
        disbursed_by: user.id,
        admin_notes,
        next_due_date: new Date(disbursalTime.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 week from now
      })
      .eq('id', loan_id);

    if (updateError) {
      throw new Error('Failed to update loan status');
    }

    // Create installment schedule
    const installments = [];
    const emiAmount = loan.schedule_denomination === 'fixed_bsk' 
      ? loan.total_due_bsk / loan.tenor_weeks
      : loan.amount_inr / loan.tenor_weeks;

    for (let i = 1; i <= loan.tenor_weeks; i++) {
      const dueDate = new Date(disbursalTime.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const isLastInstallment = i === loan.tenor_weeks;
      
      // Adjust last installment for any rounding differences
      const finalEmiAmount = isLastInstallment && loan.schedule_denomination === 'fixed_bsk'
        ? loan.total_due_bsk - (emiAmount * (loan.tenor_weeks - 1))
        : emiAmount;

      installments.push({
        loan_id: loan.id,
        installment_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        emi_bsk: loan.schedule_denomination === 'fixed_bsk' ? finalEmiAmount : null,
        emi_inr: loan.schedule_denomination === 'inr_pegged' ? finalEmiAmount : null,
        principal_bsk: loan.schedule_denomination === 'fixed_bsk' ? finalEmiAmount : finalEmiAmount / loan.disbursal_rate_snapshot,
        interest_bsk: 0, // 0% interest by default
        total_due_bsk: loan.schedule_denomination === 'fixed_bsk' ? finalEmiAmount : finalEmiAmount / loan.disbursal_rate_snapshot,
        status: 'due'
      });
    }

    // Insert installments
    const { error: installmentsError } = await supabase
      .from('bsk_loan_installments')
      .insert(installments);

    if (installmentsError) {
      console.error('Installments creation error:', installmentsError);
      throw new Error('Failed to create installment schedule');
    }

    // Credit user's BSK HOLDING balance (not withdrawable until loan is repaid)
    const { data: currentBalance } = await supabase
      .from('user_bsk_balances')
      .select('holding_balance')
      .eq('user_id', loan.user_id)
      .single();

    const { error: balanceError } = await supabase
      .from('user_bsk_balances')
      .upsert({
        user_id: loan.user_id,
        holding_balance: (currentBalance?.holding_balance || 0) + loan.net_disbursed_bsk
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });

    if (balanceError) {
      console.error('Balance update error:', balanceError);
      // Continue - we'll log this in ledger for manual reconciliation
    }

    // Create ledger entries
    const idempotencyKey = `disbursal-${loan.id}-${Date.now()}`;
    
    // Disbursal credit entry
    await supabase
      .from('bsk_loan_ledger')
      .insert({
        user_id: loan.user_id,
        loan_id: loan.id,
        transaction_type: 'loan_disbursal',
        amount_bsk: loan.net_disbursed_bsk,
        amount_inr: loan.amount_inr,
        rate_snapshot: loan.disbursal_rate_snapshot,
        balance_type: 'holding',
        direction: 'credit',
        reference_id: loan.loan_number,
        notes: `Loan disbursal: ${loan.loan_number}`,
        processed_by: user.id,
        idempotency_key: idempotencyKey,
        metadata: {
          loan_number: loan.loan_number,
          tenor_weeks: loan.tenor_weeks,
          interest_rate: loan.interest_rate_weekly,
          admin_action: 'approve_and_disburse'
        }
      });

    // Origination fee debit entry (if applicable)
    if (loan.origination_fee_bsk > 0) {
      await supabase
        .from('bsk_loan_ledger')
        .insert({
          user_id: loan.user_id,
          loan_id: loan.id,
          transaction_type: 'origination_fee',
          amount_bsk: loan.origination_fee_bsk,
          amount_inr: loan.origination_fee_bsk * loan.disbursal_rate_snapshot,
          rate_snapshot: loan.disbursal_rate_snapshot,
          balance_type: 'holding',
          direction: 'debit',
          reference_id: loan.loan_number,
          notes: `Origination fee: ${loan.origination_fee_percent}%`,
          processed_by: user.id,
          idempotency_key: `origination-${loan.id}-${Date.now()}`,
          metadata: { fee_percent: loan.origination_fee_percent }
        });
    }

    // Update loan to active status
    await supabase
      .from('bsk_loans')
      .update({ status: 'active' })
      .eq('id', loan_id);

    console.log(`BSK Loan Disbursed: ${loan.loan_number} - ${loan.net_disbursed_bsk} BSK credited to user ${loan.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        loan: {
          id: loan.id,
          loan_number: loan.loan_number,
          amount_inr: loan.amount_inr,
          net_disbursed_bsk: loan.net_disbursed_bsk,
          installments_created: installments.length,
          next_due_date: installments[0]?.due_date,
          weekly_emi_bsk: loan.schedule_denomination === 'fixed_bsk' ? emiAmount : null,
          weekly_emi_inr: loan.schedule_denomination === 'inr_pegged' ? emiAmount : null
        },
        message: 'Loan approved and disbursed successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('BSK Loan Disbursal Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});