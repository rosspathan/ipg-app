import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { deposit_id } = await req.json()

    const supabaseClient = createClient(
      Denv.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get deposit details
    const { data: deposit, error: depositError } = await supabaseClient
      .from('deposits')
      .select('*, assets(symbol, decimals)')
      .eq('id', deposit_id)
      .single()

    if (depositError) throw depositError

    // In production, this would query blockchain for real confirmation count
    // For now, simulate blockchain confirmation after 12 blocks
    const confirmations = deposit.required_confirmations; // Simulate 12+ confirmations
    
    console.log(`[monitor-deposit] Checking deposit ${deposit_id}: ${confirmations}/${deposit.required_confirmations} confirmations`);

    // Auto-credit balance after required confirmations
    if (confirmations >= deposit.required_confirmations) {
      // Use the new database function to credit balance
      const { error: creditError } = await supabaseClient.rpc('credit_deposit_balance', {
        p_user_id: deposit.user_id,
        p_asset_symbol: deposit.assets.symbol,
        p_amount: parseFloat(deposit.amount)
      });

      if (creditError) {
        console.error('[monitor-deposit] Failed to credit balance:', creditError);
        throw creditError;
      }

      // Update deposit status to completed
      const { error: updateError } = await supabaseClient
        .from('deposits')
        .update({
          confirmations: confirmations,
          status: 'completed',
          credited_at: new Date().toISOString()
        })
        .eq('id', deposit_id);

      if (updateError) throw updateError;

      console.log(`[monitor-deposit] Auto-credited ${deposit.amount} ${deposit.assets.symbol} to user ${deposit.user_id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deposit_id,
        status: 'completed',
        confirmations: deposit.required_confirmations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Monitor deposit error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
