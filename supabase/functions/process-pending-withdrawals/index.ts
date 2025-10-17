import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find all crypto withdrawals stuck in processing state
    const { data: pendingWithdrawals, error: queryError } = await supabase
      .from('withdrawals')
      .select('*, assets(symbol, network)')
      .eq('status', 'processing')
      .is('tx_hash', null)
      .limit(10);

    if (queryError) throw queryError;

    let processed = 0;
    const results = [];

    for (const withdrawal of pendingWithdrawals || []) {
      try {
        // Simulate blockchain transaction submission
        // In production, use Web3 provider to submit real transaction
        const tx_hash = `0x${crypto.randomUUID().replace(/-/g, '')}`;
        
        // Update withdrawal with tx_hash and completed status
        const { error: updateError } = await supabase
          .from('withdrawals')
          .update({ 
            status: 'completed',
            tx_hash: tx_hash,
            approved_at: new Date().toISOString()
          })
          .eq('id', withdrawal.id);

        if (updateError) {
          console.error(`[process-pending-withdrawals] Failed to update withdrawal ${withdrawal.id}:`, updateError);
          results.push({ id: withdrawal.id, status: 'failed', error: updateError.message });
        } else {
          console.log(`[process-pending-withdrawals] Completed withdrawal ${withdrawal.id} with tx_hash ${tx_hash}`);
          processed++;
          results.push({ id: withdrawal.id, status: 'completed', tx_hash });
        }
      } catch (error) {
        console.error(`[process-pending-withdrawals] Error processing withdrawal ${withdrawal.id}:`, error);
        results.push({ id: withdrawal.id, status: 'error', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed,
        total: pendingWithdrawals?.length || 0,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-pending-withdrawals] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
