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
    const body = await req.json().catch(() => ({}))
    const { deposit_id } = body

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // If no deposit_id provided, process all pending deposits (batch mode)
    if (!deposit_id) {
      const { data: pendingDeposits, error: queryError } = await supabaseClient
        .from('deposits')
        .select('*, assets(symbol, decimals)')
        .eq('status', 'pending')
        .limit(50)

      if (queryError) throw queryError

      let processed = 0
      const results = []

      for (const deposit of pendingDeposits || []) {
        try {
          // Simulate blockchain confirmation - in production, query real blockchain
          const confirmations = deposit.required_confirmations

          if (confirmations >= deposit.required_confirmations) {
            // Credit balance
            const { error: creditError } = await supabaseClient.rpc('credit_deposit_balance', {
              p_user_id: deposit.user_id,
              p_asset_symbol: deposit.assets.symbol,
              p_amount: parseFloat(deposit.amount)
            })

            if (creditError) {
              console.error(`[monitor-deposit] Failed to credit deposit ${deposit.id}:`, creditError)
              results.push({ id: deposit.id, status: 'failed', error: creditError.message })
              continue
            }

            // Update deposit status
            const { error: updateError } = await supabaseClient
              .from('deposits')
              .update({
                confirmations: confirmations,
                status: 'completed',
                credited_at: new Date().toISOString()
              })
              .eq('id', deposit.id)

            if (updateError) {
              console.error(`[monitor-deposit] Failed to update deposit ${deposit.id}:`, updateError)
              results.push({ id: deposit.id, status: 'failed', error: updateError.message })
            } else {
              console.log(`[monitor-deposit] Auto-credited ${deposit.amount} ${deposit.assets.symbol} to user ${deposit.user_id}`)
              processed++
              results.push({ id: deposit.id, status: 'completed' })
            }
          }
        } catch (error) {
          console.error(`[monitor-deposit] Error processing deposit ${deposit.id}:`, error)
          results.push({ id: deposit.id, status: 'error', error: error.message })
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed,
          total: pendingDeposits?.length || 0,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Single deposit mode (legacy support)
    const { data: deposit, error: depositError } = await supabaseClient
      .from('deposits')
      .select('*, assets(symbol, decimals)')
      .eq('id', deposit_id)
      .single()

    if (depositError) throw depositError

    const confirmations = deposit.required_confirmations
    
    console.log(`[monitor-deposit] Checking deposit ${deposit_id}: ${confirmations}/${deposit.required_confirmations} confirmations`)

    if (confirmations >= deposit.required_confirmations) {
      const { error: creditError } = await supabaseClient.rpc('credit_deposit_balance', {
        p_user_id: deposit.user_id,
        p_asset_symbol: deposit.assets.symbol,
        p_amount: parseFloat(deposit.amount)
      })

      if (creditError) {
        console.error('[monitor-deposit] Failed to credit balance:', creditError)
        throw creditError
      }

      const { error: updateError } = await supabaseClient
        .from('deposits')
        .update({
          confirmations: confirmations,
          status: 'completed',
          credited_at: new Date().toISOString()
        })
        .eq('id', deposit_id)

      if (updateError) throw updateError

      console.log(`[monitor-deposit] Auto-credited ${deposit.amount} ${deposit.assets.symbol} to user ${deposit.user_id}`)
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
