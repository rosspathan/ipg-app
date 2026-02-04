import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import Decimal from "https://esm.sh/decimal.js@10.4.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * BSK Loan Completion
 * 
 * Triggered when all 16 EMIs are paid naturally (via auto-debit or manual payment).
 * 
 * Business Rules:
 * 1. Verify ALL 16 installments are paid
 * 2. Disburse full principal (payout) to user's withdrawable balance
 * 3. Update loan status to COMPLETED (closed)
 * 4. Uses deterministic idempotency keys to prevent double payout
 * 5. Uses decimal-safe math
 */

interface CompleteLoanRequest {
  loan_id: string;
  triggered_by?: string;
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
    const { loan_id, triggered_by }: CompleteLoanRequest = await req.json();
    
    console.log(`[LOAN-COMPLETE] Processing completion for loan ${loan_id} (triggered by: ${triggered_by || 'manual'})`);

    // DETERMINISTIC IDEMPOTENCY KEY (no timestamp!)
    const completionIdempotencyKey = `loan_complete_${loan_id}`;
    const disbursalIdempotencyKey = `loan_complete_disbursal_${loan_id}`;

    // Check for duplicate completion
    const { data: existingCompletion } = await supabase
      .from("unified_bsk_ledger")
      .select("id")
      .eq("idempotency_key", disbursalIdempotencyKey)
      .maybeSingle();

    if (existingCompletion) {
      console.log(`[LOAN-COMPLETE] Loan ${loan_id} already completed (idempotency hit)`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "This loan has already been completed.",
          already_processed: true
        }),
        { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from('bsk_loans')
      .select('*')
      .eq('id', loan_id)
      .eq('status', 'active')
      .single();

    if (loanError || !loan) {
      throw new Error('Loan not found or not in active status');
    }

    // Verify all installments are paid
    const { data: installments, error: installmentsError } = await supabase
      .from('bsk_loan_installments')
      .select('id, status, emi_bsk')
      .eq('loan_id', loan_id);

    if (installmentsError) {
      throw new Error('Failed to fetch installments');
    }

    const allPaid = installments.every(inst => inst.status === 'paid');
    const totalInstallments = installments.length;
    const paidCount = installments.filter(inst => inst.status === 'paid').length;

    if (!allPaid) {
      console.log(`[LOAN-COMPLETE] Loan ${loan_id} not ready for completion: ${paidCount}/${totalInstallments} installments paid`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Not all installments paid yet: ${paidCount}/${totalInstallments}`,
          paid_count: paidCount,
          total_count: totalInstallments
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log(`[LOAN-COMPLETE] All ${totalInstallments} installments paid. Processing completion disbursal...`);

    // DECIMAL-SAFE: Get principal amount
    const principalBsk = new Decimal(loan.principal_bsk || 0);
    const completionTime = new Date();

    // Disburse the full principal amount to withdrawable balance
    const { error: disbursalError } = await supabase.rpc('record_bsk_transaction', {
      p_user_id: loan.user_id,
      p_tx_type: 'credit',
      p_tx_subtype: 'loan_completion_disbursal',
      p_balance_type: 'withdrawable',
      p_amount_bsk: principalBsk.toNumber(),
      p_idempotency_key: disbursalIdempotencyKey,
      p_meta_json: {
        loan_id: loan.id,
        loan_number: loan.loan_number,
        principal_bsk: principalBsk.toString(),
        tenor_weeks: loan.tenor_weeks,
        installments_paid: totalInstallments,
        completed_at: completionTime.toISOString(),
        triggered_by: triggered_by || 'manual',
        notes: `Loan completion payout: ${loan.loan_number}`
      }
    });

    if (disbursalError) {
      console.error('[LOAN-COMPLETE] Disbursal error:', disbursalError);
      throw new Error('Failed to disburse completion funds: ' + disbursalError.message);
    }

    console.log(`[LOAN-COMPLETE] ✅ Disbursed ${principalBsk.toFixed(4)} BSK to user`);

    // Check for completion bonus
    const { data: settings } = await supabase
      .from('bsk_loan_settings')
      .select('completion_bonus_enabled, completion_bonus_percent, completion_bonus_destination')
      .single();

    let bonusAmount = new Decimal(0);
    if (settings?.completion_bonus_enabled && settings.completion_bonus_percent > 0) {
      bonusAmount = principalBsk.times(settings.completion_bonus_percent).dividedBy(100);
      
      const bonusIdempotencyKey = `loan_complete_bonus_${loan_id}`;
      
      const { error: bonusError } = await supabase.rpc('record_bsk_transaction', {
        p_user_id: loan.user_id,
        p_tx_type: 'credit',
        p_tx_subtype: 'loan_completion_bonus',
        p_balance_type: settings.completion_bonus_destination || 'holding',
        p_amount_bsk: bonusAmount.toNumber(),
        p_idempotency_key: bonusIdempotencyKey,
        p_meta_json: {
          loan_id: loan.id,
          loan_number: loan.loan_number,
          bonus_percent: settings.completion_bonus_percent,
          principal_bsk: principalBsk.toString(),
          notes: `${settings.completion_bonus_percent}% completion bonus for ${loan.loan_number}`
        }
      });

      if (bonusError) {
        console.error('[LOAN-COMPLETE] Bonus error:', bonusError);
        // Don't fail the entire operation if bonus fails
      } else {
        console.log(`[LOAN-COMPLETE] Completion bonus credited: ${bonusAmount.toFixed(4)} BSK to ${settings.completion_bonus_destination}`);
      }
    }

    // Record completion event in ledger
    await supabase.rpc('record_bsk_transaction', {
      p_user_id: loan.user_id,
      p_tx_type: 'system',
      p_tx_subtype: 'loan_completed',
      p_balance_type: 'withdrawable',
      p_amount_bsk: 0,
      p_idempotency_key: completionIdempotencyKey,
      p_meta_json: {
        loan_id: loan.id,
        loan_number: loan.loan_number,
        principal_disbursed: principalBsk.toString(),
        bonus_disbursed: bonusAmount.toString(),
        installments_paid: totalInstallments,
        completed_at: completionTime.toISOString()
      }
    });

    // Update loan status to completed (closed)
    const { error: updateError } = await supabase
      .from('bsk_loans')
      .update({
        status: 'closed',
        closed_at: completionTime.toISOString(),
        disbursed_at: completionTime.toISOString(),
        disbursed_by: triggered_by === 'auto_debit' ? 'system_auto_complete' : 'user_manual_complete',
        admin_notes: `Completed on ${completionTime.toISOString()}. Disbursed ${principalBsk.toFixed(4)} BSK${bonusAmount.greaterThan(0) ? ` + ${bonusAmount.toFixed(4)} BSK bonus` : ''}`
      })
      .eq('id', loan_id);

    if (updateError) {
      console.error('[LOAN-COMPLETE] Update error:', updateError);
      // Don't throw - payout already processed
    }

    const totalReceived = principalBsk.plus(bonusAmount);

    console.log(`[LOAN-COMPLETE] Loan ${loan.loan_number} completed successfully. Total received: ${totalReceived.toFixed(4)} BSK`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Loan completed successfully',
        loan: {
          id: loan.id,
          loan_number: loan.loan_number,
          principal_disbursed_bsk: principalBsk.toFixed(4),
          bonus_amount_bsk: bonusAmount.toFixed(4),
          total_received_bsk: totalReceived.toFixed(4),
          completed_at: completionTime.toISOString()
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('[LOAN-COMPLETE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});
