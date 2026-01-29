import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancellationResult {
  checked: number;
  cancelled: number;
  details: Array<{
    loan_id: string;
    user_id: string;
    consecutive_overdue: number;
    threshold: number;
    status: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { triggered_by } = await req.json().catch(() => ({}));

    console.log(`[LOAN-CANCEL] Starting cancellation check, triggered by: ${triggered_by || 'manual'}`);

    // Get the cancellation threshold from settings
    const { data: settings, error: settingsError } = await supabase
      .from('bsk_loan_settings')
      .select('consecutive_missed_weeks_for_cancel')
      .single();

    if (settingsError || !settings) {
      console.error('[LOAN-CANCEL] Error fetching settings:', settingsError);
      throw new Error('Failed to fetch loan settings');
    }

    const threshold = settings.consecutive_missed_weeks_for_cancel || 4;
    console.log(`[LOAN-CANCEL] Using threshold: ${threshold} consecutive weeks`);

    // Get all active loans
    const { data: activeLoans, error: loansError } = await supabase
      .from('bsk_loans')
      .select('id, user_id, loan_number')
      .eq('status', 'active');

    if (loansError) {
      console.error('[LOAN-CANCEL] Error fetching active loans:', loansError);
      throw loansError;
    }

    if (!activeLoans || activeLoans.length === 0) {
      console.log('[LOAN-CANCEL] No active loans found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active loans to check',
          checked: 0,
          cancelled: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[LOAN-CANCEL] Checking ${activeLoans.length} active loans`);

    const result: CancellationResult = {
      checked: 0,
      cancelled: 0,
      details: [],
    };

    // Check each loan for consecutive overdue installments
    for (const loan of activeLoans) {
      result.checked++;

      // Get all installments for this loan, ordered by installment number
      const { data: installments, error: installmentsError } = await supabase
        .from('bsk_loan_installments')
        .select('id, installment_number, status, due_date')
        .eq('loan_id', loan.id)
        .order('installment_number', { ascending: true });

      if (installmentsError || !installments) {
        console.error(`[LOAN-CANCEL] Error fetching installments for loan ${loan.id}:`, installmentsError);
        continue;
      }

      // Count consecutive overdue installments from the earliest unpaid
      let consecutiveOverdue = 0;
      let foundUnpaid = false;

      for (const installment of installments) {
        if (installment.status === 'paid') {
          // Reset counter if we find a paid installment
          consecutiveOverdue = 0;
          foundUnpaid = false;
        } else if (installment.status === 'overdue') {
          // Count consecutive overdue
          consecutiveOverdue++;
          foundUnpaid = true;
        } else if (installment.status === 'due' && foundUnpaid) {
          // If we found a 'due' after starting to count overdue, stop counting
          break;
        }
      }

      console.log(`[LOAN-CANCEL] Loan ${loan.loan_number}: ${consecutiveOverdue} consecutive overdue weeks`);

      // Cancel if threshold reached
      if (consecutiveOverdue >= threshold) {
        console.log(`[LOAN-CANCEL] Cancelling loan ${loan.loan_number} (${consecutiveOverdue} >= ${threshold})`);

        const cancellationReason = `Auto-cancelled: ${consecutiveOverdue} consecutive weeks non-payment (threshold: ${threshold})`;

        // Update loan status to cancelled
        const { error: updateError } = await supabase
          .from('bsk_loans')
          .update({
            status: 'cancelled',
            closed_at: new Date().toISOString(),
            admin_notes: cancellationReason,
          })
          .eq('id', loan.id);

        if (updateError) {
          console.error(`[LOAN-CANCEL] Error updating loan ${loan.id}:`, updateError);
          result.details.push({
            loan_id: loan.id,
            user_id: loan.user_id,
            consecutive_overdue: consecutiveOverdue,
            threshold: threshold,
            status: 'error',
          });
          continue;
        }

        // Create unified ledger entry for cancellation
        const cancellationIdempotencyKey = `loan_cancelled_${loan.id}_${Date.now()}`;
        
        await supabase.rpc('record_bsk_transaction', {
          p_user_id: loan.user_id,
          p_idempotency_key: cancellationIdempotencyKey,
          p_tx_type: 'system',
          p_tx_subtype: 'loan_cancelled',
          p_balance_type: 'withdrawable',
          p_amount_bsk: 0,
          p_notes: cancellationReason,
          p_meta_json: {
            loan_id: loan.id,
            loan_number: loan.loan_number,
            consecutive_overdue_weeks: consecutiveOverdue,
            threshold_weeks: threshold,
            cancellation_reason: 'auto_cancelled_non_payment',
            cancelled_installments: installments.filter(i => i.status === 'overdue').length
          }
        });

        // Legacy: Also create entry in bsk_loan_ledger for backward compatibility
        await supabase.from('bsk_loan_ledger').insert({
          loan_id: loan.id,
          user_id: loan.user_id,
          transaction_type: 'LOAN_CANCELLED',
          amount_bsk: 0,
          direction: 'debit',
          notes: cancellationReason,
        });

        // Mark all remaining 'due' and 'overdue' installments as cancelled
        await supabase
          .from('bsk_loan_installments')
          .update({ status: 'cancelled' })
          .eq('loan_id', loan.id)
          .in('status', ['due', 'overdue']);

        result.cancelled++;
        result.details.push({
          loan_id: loan.id,
          user_id: loan.user_id,
          consecutive_overdue: consecutiveOverdue,
          threshold: threshold,
          status: 'cancelled',
        });

        console.log(`[LOAN-CANCEL] Successfully cancelled loan ${loan.loan_number}`);
      }
    }

    console.log(`[LOAN-CANCEL] Check completed: ${result.checked} checked, ${result.cancelled} cancelled`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${result.checked} loans, cancelled ${result.cancelled}`,
        ...result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[LOAN-CANCEL] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
