import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[batch-credit-deposits] Starting batch credit of confirmed deposits...');

    // Find all confirmed (not yet credited) deposits
    const { data: confirmedDeposits, error: fetchError } = await supabase
      .from('custodial_deposits')
      .select('id, user_id, amount, asset_id, tx_hash, status')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch confirmed deposits: ${fetchError.message}`);
    }

    if (!confirmedDeposits || confirmedDeposits.length === 0) {
      console.log('[batch-credit-deposits] No confirmed deposits to credit');
      return new Response(
        JSON.stringify({ success: true, credited: 0, message: 'No confirmed deposits found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[batch-credit-deposits] Found ${confirmedDeposits.length} confirmed deposits to credit`);

    const results: any[] = [];
    let creditedCount = 0;
    let errorCount = 0;

    for (const deposit of confirmedDeposits) {
      try {
        console.log(`[batch-credit-deposits] Crediting deposit ${deposit.id} (${deposit.amount} tokens, user: ${deposit.user_id})`);

        const { data: creditResult, error: creditError } = await supabase.rpc(
          'credit_custodial_deposit',
          { p_deposit_id: deposit.id }
        );

        if (creditError) {
          console.error(`[batch-credit-deposits] RPC error for deposit ${deposit.id}:`, creditError);
          results.push({ deposit_id: deposit.id, status: 'error', error: creditError.message });
          errorCount++;
          continue;
        }

        if (creditResult?.success) {
          creditedCount++;
          console.log(`[batch-credit-deposits] ✓ Credited deposit ${deposit.id}: ${JSON.stringify(creditResult)}`);
          results.push({ deposit_id: deposit.id, status: creditResult.status, amount: deposit.amount });
        } else {
          console.warn(`[batch-credit-deposits] Failed to credit deposit ${deposit.id}: ${creditResult?.error}`);
          results.push({ deposit_id: deposit.id, status: 'failed', error: creditResult?.error });
          errorCount++;
        }
      } catch (err: any) {
        console.error(`[batch-credit-deposits] Exception for deposit ${deposit.id}:`, err.message);
        results.push({ deposit_id: deposit.id, status: 'exception', error: err.message });
        errorCount++;
      }
    }

    const summary = {
      success: true,
      total: confirmedDeposits.length,
      credited: creditedCount,
      errors: errorCount,
      results,
      timestamp: new Date().toISOString(),
    };

    console.log(`[batch-credit-deposits] Done: ${creditedCount} credited, ${errorCount} errors out of ${confirmedDeposits.length} total`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[batch-credit-deposits] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
