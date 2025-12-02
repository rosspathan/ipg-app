import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .select('*')
      .eq('loan_id', loan_id);

    if (installmentsError) {
      throw new Error('Failed to fetch installments');
    }

    const allPaid = installments.every(inst => inst.status === 'paid');
    const totalPaid = installments.length;
    const paidCount = installments.filter(inst => inst.status === 'paid').length;

    if (!allPaid) {
      console.log(`[LOAN-COMPLETE] Loan ${loan_id} not ready for completion: ${paidCount}/${totalPaid} installments paid`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Not all installments paid yet: ${paidCount}/${totalPaid}`,
          paid_count: paidCount,
          total_count: totalPaid
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    console.log(`[LOAN-COMPLETE] All ${totalPaid} installments paid. Processing completion disbursal...`);

    // Disburse the full principal amount to withdrawable balance
    const completionTime = new Date();
    const { error: disbursalError } = await supabase.rpc('record_bsk_transaction', {
      p_user_id: loan.user_id,
      p_tx_type: 'credit',
      p_tx_subtype: 'loan_completion_disbursal',
      p_balance_type: 'withdrawable',
      p_amount_bsk: loan.principal_bsk,
      p_idempotency_key: `completion-${loan.id}-${Date.now()}`,
      p_meta_json: {
        loan_id: loan.id,
        loan_number: loan.loan_number,
        principal_bsk: loan.principal_bsk,
        tenor_weeks: loan.tenor_weeks,
        installments_paid: totalPaid,
        completed_at: completionTime.toISOString(),
        notes: `Loan completion payout: ${loan.loan_number}`
      }
    });

    if (disbursalError) {
      console.error('[LOAN-COMPLETE] Disbursal error:', disbursalError);
      throw new Error('Failed to disburse completion funds');
    }

    // Check for completion bonus
    const { data: settings } = await supabase
      .from('bsk_loan_settings')
      .select('completion_bonus_enabled, completion_bonus_percent, completion_bonus_destination')
      .single();

    let bonusAmount = 0;
    if (settings?.completion_bonus_enabled && settings.completion_bonus_percent > 0) {
      bonusAmount = (loan.principal_bsk * settings.completion_bonus_percent) / 100;
      
      const { error: bonusError } = await supabase.rpc('record_bsk_transaction', {
        p_user_id: loan.user_id,
        p_tx_type: 'credit',
        p_tx_subtype: 'loan_completion_bonus',
        p_balance_type: settings.completion_bonus_destination || 'holding',
        p_amount_bsk: bonusAmount,
        p_idempotency_key: `bonus-${loan.id}-${Date.now()}`,
        p_meta_json: {
          loan_id: loan.id,
          loan_number: loan.loan_number,
          bonus_percent: settings.completion_bonus_percent,
          principal_bsk: loan.principal_bsk,
          notes: `${settings.completion_bonus_percent}% completion bonus for ${loan.loan_number}`
        }
      });

      if (bonusError) {
        console.error('[LOAN-COMPLETE] Bonus error:', bonusError);
        // Don't fail the entire operation if bonus fails
      } else {
        console.log(`[LOAN-COMPLETE] Completion bonus credited: ${bonusAmount} BSK to ${settings.completion_bonus_destination}`);
      }
    }

    // Update loan status to completed
    const { error: updateError } = await supabase
      .from('bsk_loans')
      .update({
        status: 'closed',
        closed_at: completionTime.toISOString(),
        disbursed_at: completionTime.toISOString(),
        disbursed_by: 'system_auto_complete'
      })
      .eq('id', loan_id);

    if (updateError) {
      console.error('[LOAN-COMPLETE] Update error:', updateError);
      throw new Error('Failed to update loan status');
    }

    console.log(`[LOAN-COMPLETE] Loan ${loan.loan_number} completed successfully. Disbursed ${loan.principal_bsk} BSK${bonusAmount > 0 ? ` + ${bonusAmount} BSK bonus` : ''}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Loan completed successfully',
        loan: {
          id: loan.id,
          loan_number: loan.loan_number,
          principal_disbursed_bsk: loan.principal_bsk,
          bonus_amount_bsk: bonusAmount,
          total_received_bsk: loan.principal_bsk + bonusAmount,
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
