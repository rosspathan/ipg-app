import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import Decimal from "https://esm.sh/decimal.js@10.4.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Recovery function for loans that were closed by auto-debit but never received payout.
 * 
 * Root cause: bsk-loan-repay set status='closed' before bsk-loan-complete ran,
 * causing the completion function to fail silently (it required status='active').
 * 
 * This function:
 * 1. Finds all closed loans without a matching disbursal ledger entry
 * 2. Credits each affected user their full principal_bsk
 * 3. Uses deterministic idempotency keys (safe to run multiple times)
 * 4. Returns a detailed report
 * 
 * SAFE TO RUN MULTIPLE TIMES - idempotency prevents double payouts.
 */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { dry_run = true } = await req.json().catch(() => ({ dry_run: true }));

    console.log(`[RECOVER] Starting missing payout recovery (dry_run: ${dry_run})`);

    // Find all closed loans that have NO disbursal in unified_bsk_ledger
    const { data: closedLoans, error: loansError } = await supabase
      .from('bsk_loans')
      .select('id, loan_number, user_id, principal_bsk, closed_at, admin_notes')
      .eq('status', 'closed');

    if (loansError) throw new Error('Failed to fetch loans: ' + loansError.message);

    const affectedLoans = [];

    for (const loan of closedLoans || []) {
      // Check for existing disbursal with BOTH possible idempotency keys
      const { data: existingComplete } = await supabase
        .from('unified_bsk_ledger')
        .select('id')
        .eq('idempotency_key', `loan_complete_disbursal_${loan.id}`)
        .maybeSingle();

      const { data: existingSettle } = await supabase
        .from('unified_bsk_ledger')
        .select('id')
        .eq('idempotency_key', `loan_settle_disbursal_${loan.id}`)
        .maybeSingle();

      const { data: existingRecovery } = await supabase
        .from('unified_bsk_ledger')
        .select('id')
        .eq('idempotency_key', `loan_recovery_disbursal_${loan.id}`)
        .maybeSingle();

      if (!existingComplete && !existingSettle && !existingRecovery) {
        affectedLoans.push(loan);
      }
    }

    console.log(`[RECOVER] Found ${affectedLoans.length} loans missing payouts`);

    const results = [];
    let totalRecovered = new Decimal(0);

    for (const loan of affectedLoans) {
      const principalBsk = new Decimal(loan.principal_bsk || 0);
      const recoveryKey = `loan_recovery_disbursal_${loan.id}`;

      if (dry_run) {
        results.push({
          loan_id: loan.id,
          loan_number: loan.loan_number,
          user_id: loan.user_id,
          principal_bsk: principalBsk.toNumber(),
          status: 'DRY_RUN',
          action: 'would_credit'
        });
        totalRecovered = totalRecovered.plus(principalBsk);
        continue;
      }

      // Credit user's withdrawable balance
      const { error: creditError } = await supabase.rpc('record_bsk_transaction', {
        p_user_id: loan.user_id,
        p_tx_type: 'credit',
        p_tx_subtype: 'loan_recovery_disbursal',
        p_balance_type: 'withdrawable',
        p_amount_bsk: principalBsk.toNumber(),
        p_idempotency_key: recoveryKey,
        p_meta_json: {
          loan_id: loan.id,
          loan_number: loan.loan_number,
          principal_bsk: principalBsk.toString(),
          recovery_reason: 'auto_debit_completion_race_condition',
          notes: `Recovery payout for loan ${loan.loan_number} - original completion failed due to race condition`
        }
      });

      if (creditError) {
        console.error(`[RECOVER] Failed to credit loan ${loan.loan_number}:`, creditError);
        results.push({
          loan_id: loan.id,
          loan_number: loan.loan_number,
          user_id: loan.user_id,
          principal_bsk: principalBsk.toNumber(),
          status: 'FAILED',
          error: creditError.message
        });
      } else {
        console.log(`[RECOVER] ✅ Credited ${principalBsk.toFixed(4)} BSK for loan ${loan.loan_number}`);
        totalRecovered = totalRecovered.plus(principalBsk);
        results.push({
          loan_id: loan.id,
          loan_number: loan.loan_number,
          user_id: loan.user_id,
          principal_bsk: principalBsk.toNumber(),
          status: 'RECOVERED'
        });

        // Update loan admin_notes
        await supabase
          .from('bsk_loans')
          .update({
            admin_notes: `${loan.admin_notes || ''} | Recovery payout credited on ${new Date().toISOString()}`
          })
          .eq('id', loan.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        affected_count: affectedLoans.length,
        total_recovered_bsk: totalRecovered.toNumber(),
        results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('[RECOVER] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
