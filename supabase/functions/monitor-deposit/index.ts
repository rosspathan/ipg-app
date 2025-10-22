import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BscScanTx {
  blockNumber: string
  timeStamp: string
  hash: string
  from: string
  contractAddress: string
  to: string
  value: string
  tokenDecimal: string
  confirmations: string
}

async function verifyBEP20Transfer(
  txHash: string,
  expectedTo: string,
  expectedAmount: string,
  contractAddress: string,
  decimals: number
): Promise<{ verified: boolean; confirmations: number; error?: string }> {
  const apiKey = Deno.env.get('BSCSCAN_API_KEY')
  if (!apiKey) {
    console.error('[monitor-deposit] BSCSCAN_API_KEY not configured')
    return { verified: false, confirmations: 0, error: 'API key not configured' }
  }

  try {
    // Get transaction receipt to verify it exists and get block number
    const receiptUrl = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`
    const receiptRes = await fetch(receiptUrl)
    const receiptData = await receiptRes.json()

    if (!receiptData.result || receiptData.result.status === '0x0') {
      return { verified: false, confirmations: 0, error: 'Transaction failed or not found' }
    }

    const txBlockNumber = parseInt(receiptData.result.blockNumber, 16)

    // Get current block number
    const blockUrl = `https://api.bscscan.com/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`
    const blockRes = await fetch(blockUrl)
    const blockData = await blockRes.json()
    const currentBlock = parseInt(blockData.result, 16)
    const confirmations = currentBlock - txBlockNumber

    // Get BEP20 token transfer events
    const transferUrl = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${contractAddress}&address=${expectedTo}&startblock=${txBlockNumber}&endblock=${txBlockNumber}&sort=asc&apikey=${apiKey}`
    const transferRes = await fetch(transferUrl)
    const transferData = await transferRes.json()

    if (transferData.status !== '1' || !transferData.result || transferData.result.length === 0) {
      return { verified: false, confirmations, error: 'No matching transfer found' }
    }

    // Find the matching transaction
    const matchingTx = transferData.result.find((tx: BscScanTx) => 
      tx.hash.toLowerCase() === txHash.toLowerCase() &&
      tx.to.toLowerCase() === expectedTo.toLowerCase()
    )

    if (!matchingTx) {
      return { verified: false, confirmations, error: 'Transaction does not match deposit criteria' }
    }

    // Verify amount (convert from wei using decimals)
    const txAmount = parseFloat(matchingTx.value) / Math.pow(10, decimals)
    const expectedAmountFloat = parseFloat(expectedAmount)
    const tolerance = 0.000001 // Allow tiny floating point differences

    if (Math.abs(txAmount - expectedAmountFloat) > tolerance) {
      return { 
        verified: false, 
        confirmations, 
        error: `Amount mismatch: expected ${expectedAmount}, got ${txAmount}` 
      }
    }

    console.log(`[monitor-deposit] Verified BEP20 tx ${txHash}: ${txAmount} tokens, ${confirmations} confirmations`)
    return { verified: true, confirmations }

  } catch (error) {
    console.error('[monitor-deposit] BscScan API error:', error)
    return { verified: false, confirmations: 0, error: error.message }
  }
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
        .select('*, assets(symbol, decimals, contract_address), profiles(evm_address)')
        .eq('status', 'pending')
        .limit(50)

      if (queryError) throw queryError

      let processed = 0
      const results = []

      for (const deposit of pendingDeposits || []) {
        try {
          const asset = deposit.assets
          const profile = deposit.profiles

          // Only verify BEP20/ERC20 tokens with contract addresses
          if (!asset?.contract_address || !profile?.evm_address) {
            console.log(`[monitor-deposit] Skipping deposit ${deposit.id}: missing contract or wallet address`)
            results.push({ id: deposit.id, status: 'skipped', reason: 'missing_data' })
            continue
          }

          // Verify on-chain
          const verification = await verifyBEP20Transfer(
            deposit.tx_hash,
            profile.evm_address,
            deposit.amount.toString(),
            asset.contract_address,
            asset.decimals || 18
          )

          if (!verification.verified) {
            console.log(`[monitor-deposit] Verification failed for ${deposit.id}: ${verification.error}`)
            results.push({ 
              id: deposit.id, 
              status: 'verification_failed', 
              error: verification.error,
              confirmations: verification.confirmations
            })
            
            // Update confirmations even if not verified yet
            await supabaseClient
              .from('deposits')
              .update({ confirmations: verification.confirmations })
              .eq('id', deposit.id)
            
            continue
          }

          // Check if enough confirmations
          if (verification.confirmations < deposit.required_confirmations) {
            console.log(`[monitor-deposit] Deposit ${deposit.id}: ${verification.confirmations}/${deposit.required_confirmations} confirmations`)
            
            await supabaseClient
              .from('deposits')
              .update({ confirmations: verification.confirmations })
              .eq('id', deposit.id)
            
            results.push({ 
              id: deposit.id, 
              status: 'pending_confirmations',
              confirmations: verification.confirmations,
              required: deposit.required_confirmations
            })
            continue
          }

          // Verified and confirmed - credit balance
          const { error: creditError } = await supabaseClient.rpc('credit_deposit_balance', {
            p_user_id: deposit.user_id,
            p_asset_symbol: asset.symbol,
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
              confirmations: verification.confirmations,
              status: 'completed',
              credited_at: new Date().toISOString()
            })
            .eq('id', deposit.id)

          if (updateError) {
            console.error(`[monitor-deposit] Failed to update deposit ${deposit.id}:`, updateError)
            results.push({ id: deposit.id, status: 'failed', error: updateError.message })
          } else {
            console.log(`[monitor-deposit] ✓ Credited ${deposit.amount} ${asset.symbol} to user ${deposit.user_id}`)
            processed++
            results.push({ id: deposit.id, status: 'completed', confirmations: verification.confirmations })
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

    // Single deposit mode
    const { data: deposit, error: depositError } = await supabaseClient
      .from('deposits')
      .select('*, assets(symbol, decimals, contract_address), profiles(evm_address)')
      .eq('id', deposit_id)
      .single()

    if (depositError) throw depositError

    const asset = deposit.assets
    const profile = deposit.profiles

    if (!asset?.contract_address || !profile?.evm_address) {
      throw new Error('Missing contract address or wallet address')
    }

    const verification = await verifyBEP20Transfer(
      deposit.tx_hash,
      profile.evm_address,
      deposit.amount.toString(),
      asset.contract_address,
      asset.decimals || 18
    )

    if (!verification.verified) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          deposit_id,
          error: verification.error,
          confirmations: verification.confirmations
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[monitor-deposit] Checking deposit ${deposit_id}: ${verification.confirmations}/${deposit.required_confirmations} confirmations`)

    if (verification.confirmations >= deposit.required_confirmations) {
      const { error: creditError } = await supabaseClient.rpc('credit_deposit_balance', {
        p_user_id: deposit.user_id,
        p_asset_symbol: asset.symbol,
        p_amount: parseFloat(deposit.amount)
      })

      if (creditError) {
        console.error('[monitor-deposit] Failed to credit balance:', creditError)
        throw creditError
      }

      const { error: updateError } = await supabaseClient
        .from('deposits')
        .update({
          confirmations: verification.confirmations,
          status: 'completed',
          credited_at: new Date().toISOString()
        })
        .eq('id', deposit_id)

      if (updateError) throw updateError

      console.log(`[monitor-deposit] ✓ Credited ${deposit.amount} ${asset.symbol} to user ${deposit.user_id}`)
    } else {
      // Update confirmations
      await supabaseClient
        .from('deposits')
        .update({ confirmations: verification.confirmations })
        .eq('id', deposit_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deposit_id,
        status: verification.confirmations >= deposit.required_confirmations ? 'completed' : 'pending',
        confirmations: verification.confirmations,
        required: deposit.required_confirmations
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
