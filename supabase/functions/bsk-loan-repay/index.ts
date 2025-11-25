import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepaymentRequest {
  installment_id: string;
  payment_type?: 'single_emi' | 'prepay_full';
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
    const { installment_id, payment_type = 'single_emi' }: RepaymentRequest = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`BSK Loan Repayment: User ${user.id} paying installment ${installment_id}`);

    // Get installment and loan details
    const { data: installment, error: installmentError } = await supabase
      .from('bsk_loan_installments')
      .select(`
        *,
        loan:bsk_loans(*)
      `)
      .eq('id', installment_id)
      .single();

    if (installmentError || !installment) {
      throw new Error('Installment not found');
    }

    const loan = installment.loan as any;
    
    // Verify user owns this loan
    if (loan.user_id !== user.id) {
      throw new Error('Unauthorized - not your loan');
    }

    if (installment.status === 'paid') {
      throw new Error('Installment already paid');
    }

    // Get current BSK rate for INR-pegged schedules
    const { data: bskRate } = await supabase
      .from('bsk_rates')
      .select('rate_inr_per_bsk')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentRate = bskRate?.rate_inr_per_bsk || loan.disbursal_rate_snapshot;

    // Calculate payment amount
    let paymentAmountBsk = 0;
    let paymentRateSnapshot = currentRate;

    if (payment_type === 'prepay_full') {
      // Calculate remaining balance for full prepayment
      const { data: remainingInstallments } = await supabase
        .from('bsk_loan_installments')
        .select('total_due_bsk')
        .eq('loan_id', loan.id)
        .eq('status', 'due');

      paymentAmountBsk = remainingInstallments?.reduce((sum, inst) => sum + inst.total_due_bsk, 0) || 0;
    } else {
      // Single EMI payment
      if (loan.schedule_denomination === 'fixed_bsk') {
        paymentAmountBsk = installment.emi_bsk || installment.total_due_bsk;
        paymentRateSnapshot = loan.disbursal_rate_snapshot; // Use original rate
      } else {
        // INR-pegged: convert INR EMI to BSK using current rate
        paymentAmountBsk = (installment.emi_inr || 0) / currentRate;
        paymentRateSnapshot = currentRate;
      }

      // Check for late fees
      const today = new Date();
      const dueDate = new Date(installment.due_date);
      const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));
      
      if (daysPastDue > loan.grace_period_days && loan.late_fee_percent > 0) {
        const lateFee = paymentAmountBsk * (loan.late_fee_percent / 100);
        paymentAmountBsk += lateFee;
        
        // Update installment with late fee
        await supabase
          .from('bsk_loan_installments')
          .update({ 
            late_fee_bsk: lateFee,
            total_due_bsk: installment.total_due_bsk + lateFee
          })
          .eq('id', installment_id);
      }
    }

    // Check user's BSK balance (holding balance for loan repayment)
    const { data: userBalance } = await supabase
      .from('user_bsk_balances')
      .select('holding_balance, withdrawable_balance')
      .eq('user_id', user.id)
      .single();

    const availableBalance = userBalance?.holding_balance || 0;
    
    if (availableBalance < paymentAmountBsk) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient BSK balance',
          required: paymentAmountBsk.toFixed(4),
          available: availableBalance.toFixed(4)
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // ATOMIC: Debit user's BSK holding balance using record_bsk_transaction
    const idempotencyKey = `loan_repayment_${installment_id}_${Date.now()}`
    
    const { data: debitResult, error: balanceError } = await supabase.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: idempotencyKey,
        p_tx_type: 'debit',
        p_tx_subtype: payment_type === 'prepay_full' ? 'loan_prepayment' : 'loan_repayment',
        p_balance_type: 'holding',
        p_amount_bsk: paymentAmountBsk,
        p_notes: payment_type === 'prepay_full' 
          ? `Full loan prepayment - Loan #${loan.loan_number}` 
          : `EMI payment #${installment.installment_number} - Loan #${loan.loan_number}`,
        p_meta_json: {
          loan_id: loan.id,
          loan_number: loan.loan_number,
          installment_id: payment_type === 'single_emi' ? installment_id : null,
          installment_number: installment.installment_number,
          payment_type: payment_type,
          rate_snapshot: paymentRateSnapshot,
          emi_inr: installment.emi_inr,
          emi_bsk: installment.emi_bsk
        }
      }
    )

    if (balanceError) {
      throw new Error(`Failed to debit user balance: ${balanceError.message}`);
    }

    console.log(`✅ Atomically debited ${paymentAmountBsk} BSK for loan repayment (tx: ${debitResult})`)

    // Update loan paid amount and outstanding
    const isLoanFullyPaid = payment_type === 'prepay_full' || (loan.outstanding_bsk - paymentAmountBsk) <= 0.01;
    
    const { error: loanUpdateError } = await supabase
      .from('bsk_loans')
      .update({
        paid_bsk: loan.paid_bsk + paymentAmountBsk,
        outstanding_bsk: loan.outstanding_bsk - paymentAmountBsk,
        status: isLoanFullyPaid ? 'closed' : 'active',
        closed_at: isLoanFullyPaid ? new Date().toISOString() : null
      })
      .eq('id', loan.id);

    // Transfer remaining holding balance to withdrawable when loan is fully paid
    if (isLoanFullyPaid && userBalance) {
      const remainingHolding = availableBalance - paymentAmountBsk;
      
      if (remainingHolding > 0) {
        // ATOMIC: Transfer holding to withdrawable
        const transferIdempotencyKey = `holding_to_withdrawable_${loan.id}_${Date.now()}`
        
        const { error: transferError } = await supabase.rpc(
          'record_bsk_transaction',
          {
            p_user_id: user.id,
            p_idempotency_key: transferIdempotencyKey,
            p_tx_type: 'transfer',
            p_tx_subtype: 'holding_to_withdrawable',
            p_balance_type: 'withdrawable',
            p_amount_bsk: remainingHolding,
            p_notes: `Loan fully repaid - holding balance transferred to withdrawable`,
            p_meta_json: {
              loan_id: loan.id,
              loan_number: loan.loan_number,
              loan_closed: true
            }
          }
        )

        if (transferError) {
          console.error('Failed to transfer holding to withdrawable:', transferError)
        } else {
          console.log(`✅ Transferred ${remainingHolding} BSK from holding to withdrawable (tx: ${transferError})`)
        }
      }
    }

    if (loanUpdateError) {
      throw new Error('Failed to update loan status');
    }

    // Update installment(s)
    if (payment_type === 'prepay_full') {
      // Mark all remaining installments as paid
      await supabase
        .from('bsk_loan_installments')
        .update({
          status: 'paid',
          paid_bsk: installment.total_due_bsk,
          payment_rate_snapshot: paymentRateSnapshot,
          paid_at: new Date().toISOString()
        })
        .eq('loan_id', loan.id)
        .eq('status', 'due');
    } else {
      // Mark single installment as paid
      await supabase
        .from('bsk_loan_installments')
        .update({
          status: 'paid',
          paid_bsk: paymentAmountBsk,
          payment_rate_snapshot: paymentRateSnapshot,
          paid_at: new Date().toISOString()
        })
        .eq('id', installment_id);
    }

    // Create ledger entry
    await supabase
      .from('bsk_loan_ledger')
      .insert({
        user_id: user.id,
        loan_id: loan.id,
        installment_id: payment_type === 'single_emi' ? installment_id : null,
        transaction_type: payment_type === 'prepay_full' ? 'prepayment' : 'loan_repayment',
        amount_bsk: paymentAmountBsk,
        amount_inr: paymentAmountBsk * paymentRateSnapshot,
        rate_snapshot: paymentRateSnapshot,
        balance_type: 'holding',
        direction: 'debit',
        reference_id: loan.loan_number,
        notes: payment_type === 'prepay_full' ? 'Full loan prepayment' : `EMI payment #${installment.installment_number}`,
        processed_by: user.id,
        idempotency_key: idempotencyKey,
        metadata: {
          payment_type,
          installment_number: installment.installment_number,
          rate_used: paymentRateSnapshot
        }
      });

    console.log(`BSK Loan Payment: ${paymentAmountBsk.toFixed(4)} BSK debited for loan ${loan.loan_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          amount_bsk: paymentAmountBsk.toFixed(4),
          amount_inr: (paymentAmountBsk * paymentRateSnapshot).toFixed(2),
          rate_snapshot: paymentRateSnapshot,
          payment_type,
          remaining_balance_bsk: (loan.outstanding_bsk - paymentAmountBsk).toFixed(4)
        },
        message: payment_type === 'prepay_full' ? 'Loan paid in full!' : 'EMI payment successful'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('BSK Loan Repayment Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});