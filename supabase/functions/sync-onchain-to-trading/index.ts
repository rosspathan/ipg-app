import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BSC_RPC = 'https://bsc-dataseed.binance.org'

interface SyncRequest {
  assetSymbols?: string[]  // Optional: specific assets to sync, or all if empty
}

// Get BNB balance
async function getBNBBalance(walletAddress: string): Promise<number> {
  const response = await fetch(BSC_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [walletAddress, 'latest'],
      id: 1
    })
  })
  const result = await response.json()
  if (result.error) throw new Error(result.error.message)
  return parseInt(result.result, 16) / 1e18
}

// Get BEP20 token balance
async function getBEP20Balance(contractAddress: string, walletAddress: string, decimals: number): Promise<number> {
  const data = `0x70a08231000000000000000000000000${walletAddress.slice(2).toLowerCase()}`
  const response = await fetch(BSC_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: contractAddress, data }, 'latest'],
      id: 1
    })
  })
  const result = await response.json()
  if (result.error) throw new Error(result.error.message)
  const balanceHex = result.result
  if (!balanceHex || balanceHex === '0x') return 0
  return parseInt(balanceHex, 16) / Math.pow(10, decimals)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[sync-onchain-to-trading] Auth error:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[sync-onchain-to-trading] Starting TWO-WAY sync for user: ${user.id}`)

    // Parse request body
    const body: SyncRequest = await req.json().catch(() => ({}))
    const assetSymbols = body.assetSymbols || []

    // Get user's wallet address - check both bsc_wallet_address and wallet_address
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('bsc_wallet_address, wallet_address')
      .eq('user_id', user.id)
      .single()

    const walletAddress = profile?.bsc_wallet_address || profile?.wallet_address
    if (profileError || !walletAddress) {
      console.error('[sync-onchain-to-trading] No wallet address found:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'No wallet address found. Please set up your wallet first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log(`[sync-onchain-to-trading] Wallet address: ${walletAddress}`)

    // Get BSC assets from database
    let assetsQuery = supabase
      .from('assets')
      .select('id, symbol, name, contract_address, decimals')
      .or('network.ilike.%bep20%,network.ilike.%bsc%')
      .eq('is_active', true)
      .eq('trading_enabled', true)

    // Filter by specific symbols if provided
    if (assetSymbols.length > 0) {
      assetsQuery = assetsQuery.in('symbol', assetSymbols)
    }

    const { data: assets, error: assetsError } = await assetsQuery

    if (assetsError || !assets || assets.length === 0) {
      console.error('[sync-onchain-to-trading] No assets found:', assetsError)
      return new Response(
        JSON.stringify({ success: false, error: 'No tradable assets found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[sync-onchain-to-trading] Found ${assets.length} assets to sync`)

    // Get current wallet_balances
    const { data: currentBalances } = await supabase
      .from('wallet_balances')
      .select('asset_id, available, locked, total')
      .eq('user_id', user.id)
      .in('asset_id', assets.map(a => a.id))

    const currentBalanceMap = new Map(
      (currentBalances || []).map(b => [b.asset_id, b])
    )

    // Use service role for writing
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results: { symbol: string; onchainBalance: number; synced: boolean; message: string; action?: string }[] = []

    // Sync each asset - TWO-WAY SYNC
    for (const asset of assets) {
      try {
        // Get on-chain balance
        let onchainBalance = 0
        if (asset.symbol === 'BNB' || !asset.contract_address) {
          onchainBalance = await getBNBBalance(walletAddress)
        } else {
          onchainBalance = await getBEP20Balance(
            asset.contract_address, 
            walletAddress, 
            asset.decimals || 18
          )
        }

        console.log(`[sync-onchain-to-trading] ${asset.symbol}: on-chain = ${onchainBalance}`)

        // Get existing balance
        const existing = currentBalanceMap.get(asset.id)
        const currentTotal = existing?.total || 0
        const currentLocked = existing?.locked || 0
        const currentAvailable = existing?.available || 0

        // TWO-WAY SYNC LOGIC:
        // 1. If on-chain > DB total: user deposited, increase available
        // 2. If on-chain < DB total: user withdrew externally, decrease available (respecting locked)
        // 3. If on-chain == DB total: already synced

        if (Math.abs(onchainBalance - currentTotal) < 0.000001) {
          // Already synced (within floating point tolerance)
          results.push({
            symbol: asset.symbol,
            onchainBalance,
            synced: true,
            message: 'Already synced',
            action: 'none'
          })
          continue
        }

        if (onchainBalance > currentTotal) {
          // User deposited - increase available
          const toAdd = onchainBalance - currentTotal
          const newAvailable = currentAvailable + toAdd
          const newTotal = onchainBalance

          const { error: upsertError } = await serviceClient
            .from('wallet_balances')
            .upsert({
              user_id: user.id,
              asset_id: asset.id,
              available: newAvailable,
              locked: currentLocked,
              total: newTotal,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,asset_id'
            })

          if (upsertError) {
            console.error(`[sync-onchain-to-trading] Failed to upsert ${asset.symbol}:`, upsertError)
            results.push({
              symbol: asset.symbol,
              onchainBalance,
              synced: false,
              message: `Database error: ${upsertError.message}`,
              action: 'add_failed'
            })
          } else {
            console.log(`[sync-onchain-to-trading] ${asset.symbol}: ADDED ${toAdd.toFixed(6)}, new available = ${newAvailable.toFixed(6)}`)
            results.push({
              symbol: asset.symbol,
              onchainBalance,
              synced: true,
              message: `Added ${toAdd.toFixed(6)} to trading balance`,
              action: 'added'
            })
          }
        } else {
          // User withdrew externally OR on-chain balance reduced
          // We need to reduce the DB balance to match on-chain
          const toRemove = currentTotal - onchainBalance
          
          // Calculate new available (can't go below 0, and must respect locked)
          // If on-chain < locked, user is in debt (shouldn't happen, but handle gracefully)
          let newAvailable = currentAvailable - toRemove
          let newLocked = currentLocked
          let warningMsg = ''

          if (newAvailable < 0) {
            // User withdrew more than their available balance (touched locked funds externally)
            // This is a critical issue - their locked orders can't settle
            const shortfall = Math.abs(newAvailable)
            newAvailable = 0
            
            // Also reduce locked if necessary
            if (onchainBalance < currentLocked) {
              newLocked = Math.max(0, onchainBalance)
              warningMsg = ` WARNING: On-chain balance (${onchainBalance.toFixed(6)}) is less than locked amount (${currentLocked.toFixed(6)}). Open orders may fail!`
            }
          }

          const newTotal = onchainBalance

          const { error: upsertError } = await serviceClient
            .from('wallet_balances')
            .upsert({
              user_id: user.id,
              asset_id: asset.id,
              available: newAvailable,
              locked: newLocked,
              total: newTotal,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,asset_id'
            })

          if (upsertError) {
            console.error(`[sync-onchain-to-trading] Failed to reduce ${asset.symbol}:`, upsertError)
            results.push({
              symbol: asset.symbol,
              onchainBalance,
              synced: false,
              message: `Database error: ${upsertError.message}`,
              action: 'reduce_failed'
            })
          } else {
            console.log(`[sync-onchain-to-trading] ${asset.symbol}: REDUCED by ${toRemove.toFixed(6)}, new available = ${newAvailable.toFixed(6)}, new total = ${newTotal.toFixed(6)}${warningMsg}`)
            results.push({
              symbol: asset.symbol,
              onchainBalance,
              synced: true,
              message: `Reduced trading balance by ${toRemove.toFixed(6)} to match on-chain.${warningMsg}`,
              action: 'reduced'
            })
          }
        }
      } catch (assetError: any) {
        console.error(`[sync-onchain-to-trading] Error syncing ${asset.symbol}:`, assetError)
        results.push({
          symbol: asset.symbol,
          onchainBalance: 0,
          synced: false,
          message: assetError.message || 'Unknown error'
        })
      }
    }

    const addedCount = results.filter(r => r.action === 'added').length
    const reducedCount = results.filter(r => r.action === 'reduced').length
    console.log(`[sync-onchain-to-trading] Completed. Added: ${addedCount}, Reduced: ${reducedCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        addedCount,
        reducedCount,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[sync-onchain-to-trading] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})