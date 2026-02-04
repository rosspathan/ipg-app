import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import Decimal from "https://esm.sh/decimal.js@10.4.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * BSK Loan EMI Repayment
 * 
 * Business Rules:
 * 1. User pays a single EMI for a specific installment
 * 2. Deducts from user's withdrawable BSK balance
 * 3. Updates installment status to 'paid'
 * 4. Updates loan paid_bsk and outstanding_bsk
 * 5. Uses decimal-safe math
 * 6. Deterministic idempotency keys for auto-debit safety
 * 
 * Auto-Debit Mode:
 * - Called by cron job with user_id in request body
 * - No auth header required (service role)
 */

interface RepaymentRequest {
  installment_id: string;
  payment_type?: 'single_emi' | 'prepay_full' | 'emi';
  auto_debit?: boolean;
  user_id?: string; // Required when auto_debit is true
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
    const { installment_id, payment_type = 'single_emi', auto_debit = false, user_id: providedUserId }: RepaymentRequest = await req.json();
    
    let userId: string;

    // Handle auto-debit mode (called by cron job with service role)
    if (auto_debit) {
      if (!providedUserId) {
        throw new Error('user_id is required for auto_debit mode');
      }
      userId = providedUserId;
      console.log(`[REPAY] Auto-debit mode for user ${userId}, installment ${installment_id}`);
    } else {
      // Normal user-initiated payment - require auth
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        throw new Error('Unauthorized');
      }
      userId = user.id;
      console.log(`[REPAY] User ${userId} paying installment ${installment_id}`);
    }

    // DETERMINISTIC IDEMPOTENCY KEY (installment_id is unique, no timestamp!)
    const idempotencyKey = `loan_repayment_${installment_id}`;

    // Check for duplicate payment
    const { data: existingPayment } = await supabase
      .from("unified_bsk_ledger")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingPayment) {
      console.log(`[REPAY] Installment ${installment_id} already paid (idempotency hit)`);
      return new Response(
        JSON.stringify({ success: true, message: 'Installment already paid', already_processed: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

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
    if (loan.user_id !== userId) {
      throw new Error('Unauthorized - not your loan');
    }

    // Check loan status - cannot pay on cancelled loan
    if (loan.status === 'cancelled') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Loan was cancelled due to missed payments. No further payments accepted.',
          forfeited: true
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    if (installment.status === 'paid') {
      return new Response(
        JSON.stringify({ success: true, message: 'Installment already paid' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    if (installment.status === 'cancelled') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This installment was cancelled as part of loan foreclosure' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Normalize payment_type
    const normalizedPaymentType = payment_type === 'emi' ? 'single_emi' : payment_type;

    // DECIMAL-SAFE: Calculate payment amount from installment
    let paymentAmountBsk = new Decimal(installment.emi_bsk || installment.total_due_bsk || 0);

    // Check for late fees (only if not auto-debit to avoid double-charging)
    if (!auto_debit && loan.late_fee_percent > 0) {
      const today = new Date();
      const dueDate = new Date(installment.due_date);
      const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));
      
      if (daysPastDue > (loan.grace_period_days || 0)) {
        const lateFee = paymentAmountBsk.times(loan.late_fee_percent).dividedBy(100);
        paymentAmountBsk = paymentAmountBsk.plus(lateFee);
        
        // Update installment with late fee
        await supabase
          .from('bsk_loan_installments')
          .update({ 
            late_fee_bsk: lateFee.toNumber(),
            total_due_bsk: new Decimal(installment.total_due_bsk).plus(lateFee).toNumber()
          })
          .eq('id', installment_id);
        
        console.log(`[REPAY] Late fee applied: ${lateFee.toFixed(4)} BSK (${daysPastDue} days past due)`);
      }
    }

    // Check user's BSK balance
    const { data: userBalance } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', userId)
      .single();

    const availableBalance = new Decimal(userBalance?.withdrawable_balance || 0);
    
    if (availableBalance.lessThan(paymentAmountBsk)) {
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

    // ATOMIC: Debit user's BSK withdrawable balance
    const { data: debitResult, error: balanceError } = await supabase.rpc(
      'record_bsk_transaction',
      {
        p_user_id: userId,
        p_idempotency_key: idempotencyKey,
        p_tx_type: 'debit',
        p_tx_subtype: 'loan_repayment',
        p_balance_type: 'withdrawable',
        p_amount_bsk: paymentAmountBsk.toNumber(),
        p_notes: `EMI payment #${installment.installment_number} - Loan #${loan.loan_number}${auto_debit ? ' (Auto-debit)' : ''}`,
        p_meta_json: {
          loan_id: loan.id,
          loan_number: loan.loan_number,
          installment_id: installment_id,
          installment_number: installment.installment_number,
          payment_type: normalizedPaymentType,
          emi_bsk: installment.emi_bsk,
          auto_debit: auto_debit
        }
      }
    );

    if (balanceError) {
      throw new Error(`Failed to debit user balance: ${balanceError.message}`);
    }

    console.log(`[REPAY] ✅ Debited ${paymentAmountBsk.toFixed(4)} BSK (tx: ${debitResult})`);

    // DECIMAL-SAFE: Update loan paid amount and outstanding
    const newPaidBsk = new Decimal(loan.paid_bsk || 0).plus(paymentAmountBsk);
    const newOutstandingBsk = new Decimal(loan.outstanding_bsk || 0).minus(paymentAmountBsk);
    const isLoanFullyPaid = newOutstandingBsk.lessThanOrEqualTo(new Decimal('0.01'));
    
    const { error: loanUpdateError } = await supabase
      .from('bsk_loans')
      .update({
        paid_bsk: newPaidBsk.toNumber(),
        outstanding_bsk: Decimal.max(newOutstandingBsk, new Decimal(0)).toNumber(),
        status: isLoanFullyPaid ? 'closed' : 'active',
        closed_at: isLoanFullyPaid ? new Date().toISOString() : null
      })
      .eq('id', loan.id);

    if (loanUpdateError) {
      console.error('[REPAY] Loan update error:', loanUpdateError);
      // Don't throw - payment already processed
    }

    // Mark installment as paid
    await supabase
      .from('bsk_loan_installments')
      .update({
        status: 'paid',
        paid_bsk: paymentAmountBsk.toNumber(),
        paid_at: new Date().toISOString()
      })
      .eq('id', installment_id);

    // Legacy: Create entry in bsk_loan_ledger for backward compatibility
    await supabase
      .from('bsk_loan_ledger')
      .insert({
        user_id: userId,
        loan_id: loan.id,
        installment_id: installment_id,
        transaction_type: 'loan_repayment',
        amount_bsk: paymentAmountBsk.toNumber(),
        balance_type: 'withdrawable',
        direction: 'debit',
        reference_id: loan.loan_number,
        notes: `EMI payment #${installment.installment_number}${auto_debit ? ' (Auto-debit)' : ''}`,
        processed_by: auto_debit ? 'system_auto_debit' : userId,
        idempotency_key: idempotencyKey,
        metadata: {
          payment_type: normalizedPaymentType,
          installment_number: installment.installment_number,
          auto_debit: auto_debit
        }
      });

    console.log(`[REPAY] EMI #${installment.installment_number} paid for loan ${loan.loan_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          amount_bsk: paymentAmountBsk.toFixed(4),
          payment_type: normalizedPaymentType,
          installment_number: installment.installment_number,
          remaining_balance_bsk: Decimal.max(newOutstandingBsk, new Decimal(0)).toFixed(4)
        },
        message: 'EMI payment successful'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('[REPAY] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});
