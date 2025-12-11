import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoDebitResult {
  processed: number;
  successful: number;
  failed: number;
  insufficient_balance: number;
  errors: number;
  batch_id: string;
  details: Array<{
    installment_id: string;
    user_id: string;
    loan_id: string;
    status: string;
    amount_bsk: number;
    error?: string;
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

    const { scheduled_run, process_date } = await req.json().catch(() => ({}));
    const targetDate = process_date || new Date().toISOString().split('T')[0];
    const batchId = crypto.randomUUID();

    console.log(`[AUTO-DEBIT] Starting batch ${batchId} for date: ${targetDate}`);

    // Query all installments due today OR earlier with status 'due' (catches missed days)
    const { data: dueInstallments, error: fetchError } = await supabase
      .from('bsk_loan_installments')
      .select(`
        id,
        loan_id,
        installment_number,
        emi_bsk,
        due_date,
        status,
        retry_count,
      bsk_loans!inner (
          id,
          user_id,
          status
        )
      `)
      .lte('due_date', targetDate)
      .eq('status', 'due')
      .eq('bsk_loans.status', 'active')
      .order('due_date', { ascending: true });

    if (fetchError) {
      console.error('[AUTO-DEBIT] Error fetching due installments:', fetchError);
      throw fetchError;
    }

    if (!dueInstallments || dueInstallments.length === 0) {
      console.log('[AUTO-DEBIT] No due installments found for today');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No installments due today',
          batch_id: batchId,
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AUTO-DEBIT] Found ${dueInstallments.length} installments to process`);

    const result: AutoDebitResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      insufficient_balance: 0,
      errors: 0,
      batch_id: batchId,
      details: [],
    };

    // Process each installment
    for (const installment of dueInstallments) {
      const userId = installment.bsk_loans.user_id;
      const loanId = installment.bsk_loans.id;
      const amountBsk = parseFloat(installment.emi_bsk);

      console.log(`[AUTO-DEBIT] Processing installment ${installment.id} for user ${userId}`);

      try {
        // Check user's withdrawable balance (user must maintain balance for auto-debit)
        const { data: balanceData, error: balanceError } = await supabase
          .from('user_bsk_balances')
          .select('withdrawable_balance')
          .eq('user_id', userId)
          .single();

        if (balanceError || !balanceData) {
          console.error(`[AUTO-DEBIT] Error fetching balance for user ${userId}:`, balanceError);
          
          // Log failed attempt
          await supabase.from('bsk_loan_auto_debit_log').insert({
            batch_id: batchId,
            installment_id: installment.id,
            user_id: userId,
            loan_id: loanId,
            scheduled_date: targetDate,
            amount_bsk: amountBsk,
            status: 'error',
            error_message: 'Failed to fetch user balance',
          });

          // Update installment tracking
          await supabase
            .from('bsk_loan_installments')
            .update({
              auto_debit_attempted_at: new Date().toISOString(),
              auto_debit_failed_reason: 'Balance fetch error',
              retry_count: installment.retry_count ? installment.retry_count + 1 : 1,
            })
            .eq('id', installment.id);

          result.errors++;
          result.details.push({
            installment_id: installment.id,
            user_id: userId,
            loan_id: loanId,
            status: 'error',
            amount_bsk: amountBsk,
            error: 'Balance fetch error',
          });
          continue;
        }

        const withdrawableBalance = parseFloat(balanceData.withdrawable_balance);

        // Check if sufficient balance
        if (withdrawableBalance < amountBsk) {
          console.log(`[AUTO-DEBIT] Insufficient balance for user ${userId}: ${withdrawableBalance} < ${amountBsk}`);

          // Mark installment as overdue
          await supabase
            .from('bsk_loan_installments')
            .update({
              status: 'overdue',
              auto_debit_attempted_at: new Date().toISOString(),
              auto_debit_failed_reason: 'Insufficient withdrawable balance',
              retry_count: installment.retry_count ? installment.retry_count + 1 : 1,
            })
            .eq('id', installment.id);

          // Log insufficient balance
          await supabase.from('bsk_loan_auto_debit_log').insert({
            batch_id: batchId,
            installment_id: installment.id,
            user_id: userId,
            loan_id: loanId,
            scheduled_date: targetDate,
            amount_bsk: amountBsk,
            status: 'insufficient_balance',
            error_message: `Required: ${amountBsk} BSK, Available: ${withdrawableBalance} BSK`,
          });

          result.insufficient_balance++;
          result.details.push({
            installment_id: installment.id,
            user_id: userId,
            loan_id: loanId,
            status: 'insufficient_balance',
            amount_bsk: amountBsk,
            error: `Insufficient balance: ${withdrawableBalance} BSK`,
          });
          continue;
        }

        // Process payment by calling repayment logic with user_id for auto-debit mode
        const { data: repaymentResult, error: repaymentError } = await supabase.functions.invoke(
          'bsk-loan-repay',
          {
            body: {
              installment_id: installment.id,
              payment_type: 'emi',
              auto_debit: true,
              user_id: userId, // Pass user_id for auto-debit mode
            },
          }
        );

        if (repaymentError || !repaymentResult?.success) {
          console.error(`[AUTO-DEBIT] Repayment failed for installment ${installment.id}:`, repaymentError);

          await supabase
            .from('bsk_loan_installments')
            .update({
              auto_debit_attempted_at: new Date().toISOString(),
              auto_debit_failed_reason: repaymentResult?.message || 'Repayment processing error',
              retry_count: installment.retry_count ? installment.retry_count + 1 : 1,
            })
            .eq('id', installment.id);

          await supabase.from('bsk_loan_auto_debit_log').insert({
            batch_id: batchId,
            installment_id: installment.id,
            user_id: userId,
            loan_id: loanId,
            scheduled_date: targetDate,
            amount_bsk: amountBsk,
            status: 'error',
            error_message: repaymentResult?.message || 'Payment processing failed',
          });

          result.errors++;
          result.details.push({
            installment_id: installment.id,
            user_id: userId,
            loan_id: loanId,
            status: 'error',
            amount_bsk: amountBsk,
            error: repaymentResult?.message || 'Processing error',
          });
          continue;
        }

        // Success - log it
        console.log(`[AUTO-DEBIT] Successfully processed installment ${installment.id}`);

        await supabase
          .from('bsk_loan_installments')
          .update({
            auto_debit_attempted_at: new Date().toISOString(),
            auto_debit_failed_reason: null,
          })
          .eq('id', installment.id);

        await supabase.from('bsk_loan_auto_debit_log').insert({
          batch_id: batchId,
          installment_id: installment.id,
          user_id: userId,
          loan_id: loanId,
          scheduled_date: targetDate,
          amount_bsk: amountBsk,
          status: 'success',
        });

        result.successful++;
        result.details.push({
          installment_id: installment.id,
          user_id: userId,
          loan_id: loanId,
          status: 'success',
          amount_bsk: amountBsk,
        });

        // Check if all installments for this loan are now paid
        const { data: allInstallments } = await supabase
          .from('bsk_loan_installments')
          .select('status')
          .eq('loan_id', loanId);

        const allPaid = allInstallments?.every(inst => inst.status === 'paid');
        
        if (allPaid) {
          console.log(`[AUTO-DEBIT] All installments paid for loan ${loanId}. Triggering completion...`);
          
          try {
            await supabase.functions.invoke('bsk-loan-complete', {
              body: { 
                loan_id: loanId,
                triggered_by: 'auto_debit'
              }
            });
            console.log(`[AUTO-DEBIT] Loan completion triggered successfully for ${loanId}`);
          } catch (completeError) {
            console.error(`[AUTO-DEBIT] Error triggering loan completion for ${loanId}:`, completeError);
            // Don't fail the auto-debit if completion fails
          }
        }
      } catch (error) {
        console.error(`[AUTO-DEBIT] Unexpected error processing installment ${installment.id}:`, error);
        result.errors++;
        result.details.push({
          installment_id: installment.id,
          user_id: userId,
          loan_id: loanId,
          status: 'error',
          amount_bsk: amountBsk,
          error: error.message,
        });
      } finally {
        result.processed++;
      }
    }

    result.failed = result.insufficient_balance + result.errors;

    console.log(`[AUTO-DEBIT] Batch ${batchId} completed:`, {
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
    });

    // Check for loans to cancel after processing installments
    console.log('[AUTO-DEBIT] Triggering cancellation check...');
    try {
      await supabase.functions.invoke('bsk-loan-check-cancellation', {
        body: { triggered_by: 'auto_debit' }
      });
      console.log('[AUTO-DEBIT] Cancellation check triggered successfully');
    } catch (cancelError) {
      console.error('[AUTO-DEBIT] Error triggering cancellation check:', cancelError);
      // Don't fail the auto-debit if cancellation check fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${result.processed} installments`,
        ...result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[AUTO-DEBIT] Fatal error:', error);
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
