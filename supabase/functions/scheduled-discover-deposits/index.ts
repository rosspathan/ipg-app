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
    console.log('[scheduled-discover-deposits] Starting automated deposit discovery (30s polling)...')

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
      .eq('network', 'BEP20')
      .eq('is_active', true)
      .not('contract_address', 'is', null)

    if (assetsError) throw assetsError

    console.log(`[scheduled-discover-deposits] Found ${assets?.length || 0} active BSC assets`)

    // Get all profiles with BSC wallet addresses - check multiple address fields
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, wallet_address, wallet_addresses, bsc_wallet_address')
      .or('wallet_address.not.is.null,bsc_wallet_address.not.is.null')

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
        const evmAddress = profile.bsc_wallet_address ||
                          profile.wallet_addresses?.['bsc-mainnet'] ||
                          profile.wallet_addresses?.['evm-mainnet'] ||
                          profile.wallet_addresses?.evm?.mainnet ||
                          profile.wallet_addresses?.evm?.bsc ||
                          profile.wallet_address

        if (!evmAddress) continue

        try {
          // Extended lookback period to catch older transactions
          const lookbackHours = 720 // 30 days
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

          console.log(`[scheduled-discover-deposits] Found ${inboundTransfers.length} recent ${asset.symbol} transfers for user ${profile.user_id}`)

          for (const transfer of inboundTransfers) {
            totalDiscovered++

            // Check if this deposit already exists
            const { data: existingDeposit } = await supabaseClient
              .from('deposits')
              .select('id')
              .eq('tx_hash', transfer.hash)
              .eq('user_id', profile.user_id)
              .maybeSingle()

            if (existingDeposit) {
              console.log(`[scheduled-discover-deposits] Deposit already exists: ${transfer.hash}`)
              continue
            }

            // Calculate amount
            const decimals = parseInt(transfer.tokenDecimal) || asset.decimals || 18
            const amount = parseFloat(transfer.value) / Math.pow(10, decimals)

            // Create deposit record (pending status)
            const { data: newDeposit, error: depositError } = await supabaseClient
              .from('deposits')
              .insert({
                user_id: profile.user_id,
                asset_id: asset.id,
                amount,
                from_address: transfer.from,
                tx_hash: transfer.hash,
                network: 'BEP20',
                status: 'pending',
                confirmations: parseInt(transfer.confirmations) || 0,
                required_confirmations: 12
              })
              .select()
              .single()

            if (depositError) {
              console.error(`[scheduled-discover-deposits] Failed to create deposit:`, depositError)
              continue
            }

            totalCreated++
            console.log(`[scheduled-discover-deposits] Created deposit ${newDeposit.id}: ${amount} ${asset.symbol}`)

            // Trigger monitor-deposit function to verify and credit
            await supabaseClient.functions.invoke('monitor-deposit', {
              body: { deposit_id: newDeposit.id }
            })

            discoveryResults.push({
              user_id: profile.user_id,
              asset: asset.symbol,
              amount,
              tx_hash: transfer.hash,
              status: 'pending'
            })
          }

        } catch (error: any) {
          console.error(`[scheduled-discover-deposits] Error processing ${asset.symbol} for user ${profile.user_id}:`, error.message)
          continue
        }
      }
    }

    const summary = {
      success: true,
      total_discovered: totalDiscovered,
      total_created: totalCreated,
      results: discoveryResults,
      message: `Discovered ${totalDiscovered} transactions, created ${totalCreated} new deposits`
    }

    console.log(`[scheduled-discover-deposits] Summary:`, summary)

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[scheduled-discover-deposits] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
