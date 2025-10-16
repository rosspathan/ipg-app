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

    // In production, this would:
    // 1. Query blockchain for confirmation count
    // 2. Update deposit.confirmations
    // 3. When confirmations >= required_confirmations:
    //    - Update deposit.status = 'completed'
    //    - Credit wallet_balances
    //    - Send notification to user

    // For now, simulate immediate confirmation (development only)
    const { error: updateError } = await supabaseClient
      .from('deposits')
      .update({
        confirmations: deposit.required_confirmations,
        status: 'completed',
        credited_at: new Date().toISOString()
      })
      .eq('id', deposit_id)

    if (updateError) throw updateError

    // Credit user's balance
    const { data: existingBalance } = await supabaseClient
      .from('wallet_balances')
      .select('*')
      .eq('user_id', deposit.user_id)
      .eq('asset_id', deposit.asset_id)
      .single()

    if (existingBalance) {
      await supabaseClient
        .from('wallet_balances')
        .update({
          available: existingBalance.available + parseFloat(deposit.amount),
          total: existingBalance.total + parseFloat(deposit.amount)
        })
        .eq('user_id', deposit.user_id)
        .eq('asset_id', deposit.asset_id)
    } else {
      await supabaseClient
        .from('wallet_balances')
        .insert({
          user_id: deposit.user_id,
          asset_id: deposit.asset_id,
          available: parseFloat(deposit.amount),
          total: parseFloat(deposit.amount),
          locked: 0
        })
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
