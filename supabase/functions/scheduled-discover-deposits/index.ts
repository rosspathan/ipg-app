import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BscScanTokenTransfer {
  blockNumber: string
  timeStamp: string
  hash: string
  from: string
  contractAddress: string
  to: string
  value: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  confirmations: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[scheduled-discover-deposits] Starting automated deposit discovery...')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const apiKey = Deno.env.get('BSCSCAN_API_KEY')
    if (!apiKey) {
      throw new Error('BSCSCAN_API_KEY not configured')
    }

    // Get all supported BEP20 assets
    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('id, symbol, contract_address, decimals, network')
      .eq('network', 'bsc')
      .eq('is_active', true)
      .not('contract_address', 'is', null)

    if (assetsError) throw assetsError

    console.log(`[scheduled-discover-deposits] Found ${assets?.length || 0} active BSC assets`)

    // Get all profiles with BSC wallet addresses
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, wallet_address, wallet_addresses')
      .not('wallet_address', 'is', null)

    if (profilesError) throw profilesError

    console.log(`[scheduled-discover-deposits] Found ${profiles?.length || 0} profiles with wallets`)

    let totalDiscovered = 0
    let totalCreated = 0
    const discoveryResults = []

    // Process each asset
    for (const asset of assets || []) {
      if (!asset.contract_address) continue

      console.log(`[scheduled-discover-deposits] Scanning ${asset.symbol}...`)

      // Process each profile
      for (const profile of profiles || []) {
        const evmAddress = profile.wallet_addresses?.['bsc-mainnet'] ||
                          profile.wallet_addresses?.['evm-mainnet'] ||
                          profile.wallet_address

        if (!evmAddress) continue

        try {
          // Calculate lookback timestamp (14 days)
          const lookbackHours = 14 * 24 // 14 days
          const startTimestamp = Math.floor(Date.now() / 1000) - (lookbackHours * 3600)

          // Query BscScan for token transfers TO this address
          const url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${asset.contract_address}&address=${evmAddress}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${apiKey}`
          
          const response = await fetch(url)
          const data = await response.json()

          if (data.status !== '1' || !data.result || data.result.length === 0) {
            continue
          }

          // Filter inbound transfers within lookback period
          const inboundTransfers = data.result.filter((tx: BscScanTokenTransfer) => 
            tx.to.toLowerCase() === evmAddress.toLowerCase() &&
            parseInt(tx.timeStamp) >= startTimestamp
          )

          totalDiscovered += inboundTransfers.length

          // Upsert deposits (ignore duplicates)
          for (const transfer of inboundTransfers) {
            const amount = parseFloat(transfer.value) / Math.pow(10, parseInt(transfer.tokenDecimal))

            // Check if deposit already exists
            const { data: existing } = await supabaseClient
              .from('deposits')
              .select('id')
              .eq('user_id', profile.user_id)
              .eq('tx_hash', transfer.hash)
              .single()

            if (existing) {
              console.log(`[scheduled-discover-deposits] Deposit already exists: ${transfer.hash}`)
              continue
            }

            // Create new deposit record
            const { data: newDeposit, error: insertError } = await supabaseClient
              .from('deposits')
              .insert({
                user_id: profile.user_id,
                asset_id: asset.id,
                network: 'bsc',
                amount: amount.toString(),
                tx_hash: transfer.hash,
                from_address: transfer.from,
                to_address: transfer.to,
                status: 'pending',
                required_confirmations: 12,
                confirmations: 0,
                detected_at: new Date(parseInt(transfer.timeStamp) * 1000).toISOString()
              })
              .select()
              .single()

            if (insertError) {
              console.error(`[scheduled-discover-deposits] Failed to insert deposit:`, insertError)
              continue
            }

            totalCreated++
            console.log(`[scheduled-discover-deposits] Created deposit: ${transfer.hash} - ${amount} ${asset.symbol}`)

            // Immediately call monitor-deposit to process this new deposit
            try {
              const monitorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/monitor-deposit`
              await fetch(monitorUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({ deposit_id: newDeposit.id })
              })
            } catch (monitorError) {
              console.error(`[scheduled-discover-deposits] Failed to call monitor-deposit:`, monitorError)
            }
          }
        } catch (error) {
          console.error(`[scheduled-discover-deposits] Error processing ${asset.symbol} for user ${profile.user_id}:`, error)
        }
      }
    }

    console.log(`[scheduled-discover-deposits] Complete: discovered ${totalDiscovered}, created ${totalCreated} new deposits`)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        totalDiscovered,
        totalCreated,
        assetsScanned: assets?.length || 0,
        profilesScanned: profiles?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[scheduled-discover-deposits] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
