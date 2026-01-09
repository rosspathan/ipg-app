import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getStoredEvmAddress } from '@/lib/wallet/evmAddress'

const BSC_RPC = 'https://bsc-dataseed.binance.org'

interface Bep20Asset {
  id: string
  symbol: string
  name: string
  contractAddress: string | null
  decimals: number
  logoUrl: string | null
}

export interface Bep20Balance {
  assetId: string
  symbol: string
  name: string
  logoUrl: string | null
  onchainBalance: number
  appBalance: number
  appAvailable: number
  appLocked: number
  contractAddress: string | null
  priceUsd: number
  onchainUsdValue: number
}

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

export function useBep20Balances() {
  const { user } = useAuthUser()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [assets, setAssets] = useState<Bep20Asset[]>([])
  const [appBalances, setAppBalances] = useState<Record<string, { available: number; locked: number; total: number }>>({})

  // Fetch wallet address
  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) return
      const addr = await getStoredEvmAddress(user.id)
      if (addr) setWalletAddress(addr)
    }
    fetch()
  }, [user?.id])

  // Fetch BEP20 assets from DB
  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase
        .from('assets')
        .select('id, symbol, name, contract_address, decimals, logo_url')
        .or('network.ilike.%bep20%,network.ilike.%bsc%')
        .eq('is_active', true)

      if (data) {
        setAssets(data.map(a => ({
          id: a.id,
          symbol: a.symbol,
          name: a.name,
          contractAddress: a.contract_address,
          decimals: a.decimals || 18,
          logoUrl: a.logo_url
        })))
      }
    }
    fetchAssets()
  }, [])

  // Fetch app balances from wallet_balances (available + locked)
  const fetchAppBalances = useCallback(async () => {
    if (!user?.id || assets.length === 0) return
    
    const { data } = await supabase
      .from('wallet_balances')
      .select('asset_id, available, locked, total')
      .eq('user_id', user.id)
      .in('asset_id', assets.map(a => a.id))

    if (data) {
      const balMap: Record<string, { available: number; locked: number; total: number }> = {}
      data.forEach(b => {
        balMap[b.asset_id] = {
          available: b.available || 0,
          locked: b.locked || 0,
          total: b.total || ((b.available || 0) + (b.locked || 0))
        }
      })
      setAppBalances(balMap)
    }
  }, [user?.id, assets])

  useEffect(() => {
    fetchAppBalances()
  }, [fetchAppBalances])

  // Real-time subscription for app balances + trades
  useEffect(() => {
    if (!user?.id) return

    // Subscribe to wallet_balances changes
    const balanceChannel = supabase
      .channel(`bep20-app-balances-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_balances',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('[useBep20Balances] Balance changed, refetching...')
          fetchAppBalances()
        }
      )
      .subscribe()

    // Subscribe to trades table (HYBRID MODEL: refresh after trade execution)
    const tradesChannel = supabase
      .channel(`user-trades-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `buyer_id=eq.${user.id}`
        },
        () => {
          console.log('[useBep20Balances] Trade executed (buyer), refetching...')
          fetchAppBalances()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `seller_id=eq.${user.id}`
        },
        () => {
          console.log('[useBep20Balances] Trade executed (seller), refetching...')
          fetchAppBalances()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(balanceChannel)
      supabase.removeChannel(tradesChannel)
    }
  }, [user?.id, fetchAppBalances])

  // Trigger server-side balance sync
  const syncBalances = useCallback(async () => {
    if (!user?.id) return
    
    try {
      console.log('[useBep20Balances] Triggering server-side balance sync...')
      const { data, error } = await supabase.functions.invoke('sync-user-balances')
      
      if (error) {
        console.error('[useBep20Balances] Sync failed:', error)
      } else {
        console.log('[useBep20Balances] Sync result:', data)
      }
      
      // Always refetch app balances after sync attempt
      await fetchAppBalances()
    } catch (err) {
      console.error('[useBep20Balances] Sync error:', err)
    }
  }, [user?.id, fetchAppBalances])

  // Auto-sync on mount when user exists (server reads wallet from profiles)
  useEffect(() => {
    if (user?.id && assets.length > 0) {
      syncBalances()
    }
  }, [user?.id, assets.length, syncBalances])

  // Query on-chain balances with prices (optional - only when walletAddress exists)
  const { data: onchainData, isLoading: isLoadingOnchain, error, refetch } = useQuery({
    queryKey: ['bep20-onchain', walletAddress, assets.map(a => a.symbol).join(',')],
    queryFn: async (): Promise<Record<string, { onchainBalance: number; priceUsd: number }>> => {
      if (!walletAddress || assets.length === 0) return {}

      // Fetch prices from market_prices table
      let prices: Record<string, number> = { 'USDT': 1 }
      try {
        // Get all prices from market_prices table (populated by fetch-crypto-prices edge function)
        const { data: marketPrices } = await supabase
          .from('market_prices')
          .select('symbol, current_price')
        
        if (marketPrices) {
          for (const mp of marketPrices) {
            // Parse "BNB/USDT" -> "BNB", "IPG/USDT" -> "IPG"
            const parts = mp.symbol?.split('/') || []
            const baseSymbol = parts[0]
            const quoteSymbol = parts[1]
            
            if (baseSymbol && quoteSymbol === 'USDT' && mp.current_price) {
              prices[baseSymbol] = mp.current_price
              // Also map "BNB ORIGINAL" from "BNB ORIGINAL/USDT"
              if (baseSymbol.includes(' ')) {
                prices[baseSymbol] = mp.current_price
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch prices:', err)
      }

      const results: Record<string, { onchainBalance: number; priceUsd: number }> = {}
      
      await Promise.all(
        assets.map(async (asset) => {
          let onchainBalance = 0
          try {
            // Check if native BNB (no contract address) - works for 'BNB' or 'BNB ORIGINAL'
            if (!asset.contractAddress) {
              onchainBalance = await getBNBBalance(walletAddress)
            } else {
              onchainBalance = await getERC20Balance(asset.contractAddress, walletAddress, asset.decimals)
            }
          } catch (err) {
            console.warn(`Failed to fetch ${asset.symbol} balance:`, err)
          }
          
          results[asset.id] = {
            onchainBalance,
            priceUsd: prices[asset.symbol] || 0
          }
        })
      )

      return results
    },
    enabled: !!walletAddress && assets.length > 0,
    staleTime: 30000,
    refetchInterval: 30000
  })

  // Always derive balances from assets + appBalances (internal ledger)
  // This ensures trading UI always shows correct internal balances
  const balances: Bep20Balance[] = assets.map((asset) => {
    const appBal = appBalances[asset.id] || { available: 0, locked: 0, total: 0 }
    const onchain = onchainData?.[asset.id] || { onchainBalance: 0, priceUsd: 0 }
    
    return {
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      logoUrl: asset.logoUrl,
      onchainBalance: onchain.onchainBalance,
      appBalance: appBal.total,
      appAvailable: appBal.available,
      appLocked: appBal.locked,
      contractAddress: asset.contractAddress,
      priceUsd: onchain.priceUsd,
      onchainUsdValue: onchain.onchainBalance * onchain.priceUsd
    }
  }).sort((a, b) => {
    // Sort: tokens with balance first, then by symbol
    const aHasBalance = a.appBalance > 0 || a.onchainBalance > 0
    const bHasBalance = b.appBalance > 0 || b.onchainBalance > 0
    if (aHasBalance && !bHasBalance) return -1
    if (!aHasBalance && bHasBalance) return 1
    return a.symbol.localeCompare(b.symbol)
  })

  // Loading state: only when assets haven't loaded yet
  const isLoading = assets.length === 0

  return {
    balances,
    isLoading,
    error,
    refetch,
    walletAddress,
    syncBalances
  }
}
