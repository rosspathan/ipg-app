import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BSC_RPC = 'https://bsc-dataseed.binance.org'

async function getERC20Balance(contractAddress: string, walletAddress: string, decimals: number): Promise<number> {
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create client with user's auth to get their ID
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get current user
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      console.error('[sync-user-balances] Auth error:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[sync-user-balances] Syncing balances for user ${user.id}`)

    // Use service role client for database writes (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's wallet address from profiles
    const { data: profile } = await adminClient
      .from('profiles')
      .select('evm_address')
      .eq('id', user.id)
      .single()

    if (!profile?.evm_address) {
      console.log('[sync-user-balances] No EVM address found for user')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No wallet address configured',
        synced: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const walletAddress = profile.evm_address
    console.log(`[sync-user-balances] Wallet address: ${walletAddress}`)

    // Fetch BEP20 assets from DB
    const { data: assets } = await adminClient
      .from('assets')
      .select('id, symbol, name, contract_address, decimals')
      .or('network.ilike.%bep20%,network.ilike.%bsc%')
      .eq('is_active', true)

    if (!assets || assets.length === 0) {
      console.log('[sync-user-balances] No BEP20 assets found')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No assets to sync',
        synced: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[sync-user-balances] Found ${assets.length} BEP20 assets to check`)

    // Fetch current wallet_balances
    const { data: existingBalances } = await adminClient
      .from('wallet_balances')
      .select('asset_id, available, locked')
      .eq('user_id', user.id)
      .in('asset_id', assets.map(a => a.id))

    const existingMap = new Map(existingBalances?.map(b => [b.asset_id, b]) || [])

    // Fetch on-chain balances and sync
    let syncedCount = 0
    const syncResults: Array<{ symbol: string; onchain: number; credited: number }> = []

    for (const asset of assets) {
      try {
        let onchainBalance = 0
        
        if (asset.symbol === 'BNB' || !asset.contract_address) {
          onchainBalance = await getBNBBalance(walletAddress)
        } else {
          onchainBalance = await getERC20Balance(
            asset.contract_address, 
            walletAddress, 
            asset.decimals || 18
          )
        }

        if (onchainBalance <= 0) continue

        const existing = existingMap.get(asset.id)
        const currentLocked = existing?.locked || 0
        const currentAvailable = existing?.available || 0
        const currentTotal = currentAvailable + currentLocked

        // Only credit if on-chain balance is greater than current total (deposit detected)
        if (onchainBalance > currentTotal) {
          const newAvailable = onchainBalance - currentLocked

          console.log(`[sync-user-balances] Crediting ${asset.symbol}: ${currentTotal} -> ${onchainBalance} (available: ${newAvailable}, locked: ${currentLocked})`)

          // Upsert using service role (bypasses RLS) - don't include 'total' as it's generated
          const { error: upsertError } = await adminClient
            .from('wallet_balances')
            .upsert({
              user_id: user.id,
              asset_id: asset.id,
              available: newAvailable,
              locked: currentLocked,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,asset_id' })

          if (upsertError) {
            console.error(`[sync-user-balances] Failed to upsert ${asset.symbol}:`, upsertError)
          } else {
            syncedCount++
            syncResults.push({
              symbol: asset.symbol,
              onchain: onchainBalance,
              credited: onchainBalance - currentTotal
            })
          }
        }
      } catch (err) {
        console.error(`[sync-user-balances] Error fetching ${asset.symbol}:`, err)
      }
    }

    console.log(`[sync-user-balances] Synced ${syncedCount} assets for user ${user.id}`)

    return new Response(JSON.stringify({ 
      success: true, 
      synced: syncedCount,
      results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[sync-user-balances] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
