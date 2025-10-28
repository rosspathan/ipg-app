import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('[scheduled-monitor-withdrawals] Starting scheduled withdrawal monitoring...');

    // Find processing withdrawals and recent completed ones (to repair locked balances if needed)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: processingWithdrawals, error: fetchError } = await supabase
      .from('withdrawals')
      .select('id, tx_hash, created_at, status')
      .or(`status.eq.processing,and(status.eq.completed,created_at.gte.${twoDaysAgo.toISOString()})`)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[scheduled-monitor-withdrawals] Error fetching withdrawals:', fetchError);
      throw fetchError;
    }

    if (!processingWithdrawals || processingWithdrawals.length === 0) {
      console.log('[scheduled-monitor-withdrawals] No withdrawals to check');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No withdrawals to monitor',
          checked: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[scheduled-monitor-withdrawals] Found ${processingWithdrawals.length} withdrawals to check`);

    const results = [];
    let completedCount = 0;
    let failedCount = 0;
    let stillProcessingCount = 0;

    // Process each withdrawal
    for (const withdrawal of processingWithdrawals) {
      try {
        console.log(`[scheduled-monitor-withdrawals] Checking withdrawal ${withdrawal.id} (tx: ${withdrawal.tx_hash})`);

        // Call monitor-withdrawal function for this withdrawal
        const { data: monitorResult, error: monitorError } = await supabase.functions.invoke(
          'monitor-withdrawal',
          {
            body: { withdrawal_id: withdrawal.id }
          }
        );

        if (monitorError) {
          console.error(`[scheduled-monitor-withdrawals] Error monitoring withdrawal ${withdrawal.id}:`, monitorError);
          results.push({ 
            withdrawal_id: withdrawal.id, 
            error: monitorError.message,
            status: 'error'
          });
          continue;
        }

        results.push({ 
          withdrawal_id: withdrawal.id, 
          result: monitorResult,
          status: monitorResult?.status || 'unknown'
        });

        // Count outcomes
        if (monitorResult?.status === 'completed') {
          completedCount++;
          console.log(`[scheduled-monitor-withdrawals] ✓ Withdrawal ${withdrawal.id} completed`);
        } else if (monitorResult?.status === 'failed') {
          failedCount++;
          console.log(`[scheduled-monitor-withdrawals] ✗ Withdrawal ${withdrawal.id} failed`);
        } else {
          stillProcessingCount++;
          console.log(`[scheduled-monitor-withdrawals] ⏳ Withdrawal ${withdrawal.id} still processing (${monitorResult?.confirmations || 0} confirmations)`);
        }

      } catch (error: any) {
        console.error(`[scheduled-monitor-withdrawals] Exception monitoring withdrawal ${withdrawal.id}:`, error);
        results.push({ 
          withdrawal_id: withdrawal.id, 
          error: error.message,
          status: 'exception'
        });
      }
    }

    const summary = {
      success: true,
      message: `Monitored ${processingWithdrawals.length} withdrawals`,
      total_checked: processingWithdrawals.length,
      completed: completedCount,
      failed: failedCount,
      still_processing: stillProcessingCount,
      timestamp: new Date().toISOString()
    };

    console.log('[scheduled-monitor-withdrawals] Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[scheduled-monitor-withdrawals] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
