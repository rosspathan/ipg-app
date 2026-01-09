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
  // On-chain balance (in user's personal wallet - display only)
  onchainBalance: number
  // Trading balance (funds deposited to hot wallet - used for trading)
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

/**
 * Hook to fetch BEP20 balances with clear separation:
 * - onchainBalance: User's personal wallet (display only, NOT for trading)
 * - appBalance/appAvailable/appLocked: Trading balance in hot wallet (used for orders)
 * 
 * IMPORTANT: Trading uses ONLY appAvailable. On-chain balance must be deposited first.
 */
export function useBep20Balances() {
  const { user } = useAuthUser()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [assets, setAssets] = useState<Bep20Asset[]>([])
  const [appBalances, setAppBalances] = useState<Record<string, { available: number; locked: number; total: number }>>({})
  const [onchainBalancesFromDb, setOnchainBalancesFromDb] = useState<Record<string, number>>({})

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

  // Fetch TRADING balances from wallet_balances (REAL custodial deposits only)
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
          available: Number(b.available) || 0,
          locked: Number(b.locked) || 0,
          total: Number(b.total) || ((Number(b.available) || 0) + (Number(b.locked) || 0))
        }
      })
      setAppBalances(balMap)
    }
  }, [user?.id, assets])

  // Fetch on-chain balances from onchain_balances table (synced by cron, display only)
  const fetchOnchainBalancesFromDb = useCallback(async () => {
    if (!user?.id || assets.length === 0) return
    
    const { data } = await supabase
      .from('onchain_balances')
      .select('asset_id, balance')
      .eq('user_id', user.id)
      .in('asset_id', assets.map(a => a.id))

    if (data) {
      const balMap: Record<string, number> = {}
      data.forEach(b => {
        balMap[b.asset_id] = Number(b.balance) || 0
      })
      setOnchainBalancesFromDb(balMap)
    }
  }, [user?.id, assets])

  useEffect(() => {
    fetchAppBalances()
    fetchOnchainBalancesFromDb()
  }, [fetchAppBalances, fetchOnchainBalancesFromDb])

  // Real-time subscription for trading balances
  useEffect(() => {
    if (!user?.id) return

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
          console.log('[useBep20Balances] Trading balance changed, refetching...')
          fetchAppBalances()
        }
      )
      .subscribe()

    // Subscribe to trades table (refresh after trade execution)
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

  // Query on-chain balances with prices (for display only)
  const { data: onchainData, isLoading: isLoadingOnchain, error, refetch } = useQuery({
    queryKey: ['bep20-onchain', walletAddress, assets.map(a => a.symbol).join(',')],
    queryFn: async (): Promise<Record<string, { onchainBalance: number; priceUsd: number }>> => {
      if (!walletAddress || assets.length === 0) return {}

      // Fetch prices from market_prices table
      let prices: Record<string, number> = { 'USDT': 1 }
      try {
        const { data: marketPrices } = await supabase
          .from('market_prices')
          .select('symbol, current_price')
        
        if (marketPrices) {
          for (const mp of marketPrices) {
            const parts = mp.symbol?.split('/') || []
            const baseSymbol = parts[0]
            const quoteSymbol = parts[1]
            
            if (baseSymbol && quoteSymbol === 'USDT' && mp.current_price) {
              prices[baseSymbol] = mp.current_price
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

  // Derive balances - CLEAR SEPARATION between on-chain and trading
  const balances: Bep20Balance[] = assets.map((asset) => {
    const appBal = appBalances[asset.id] || { available: 0, locked: 0, total: 0 }
    const onchain = onchainData?.[asset.id] || { onchainBalance: 0, priceUsd: 0 }
    
    // Use DB on-chain balance if available, otherwise fall back to live RPC
    const dbOnchainBal = onchainBalancesFromDb[asset.id] || 0
    const finalOnchainBalance = dbOnchainBal > 0 ? dbOnchainBal : onchain.onchainBalance
    
    return {
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      logoUrl: asset.logoUrl,
      // On-chain balance (display only - NOT for trading)
      onchainBalance: finalOnchainBalance,
      // Trading balance (actual custodial deposits - used for orders)
      appBalance: appBal.total,
      appAvailable: appBal.available,
      appLocked: appBal.locked,
      contractAddress: asset.contractAddress,
      priceUsd: onchain.priceUsd,
      onchainUsdValue: finalOnchainBalance * onchain.priceUsd
    }
  }).sort((a, b) => {
    // Sort: tokens with trading balance first, then on-chain balance, then alphabetically
    const aHasTradingBalance = a.appBalance > 0
    const bHasTradingBalance = b.appBalance > 0
    if (aHasTradingBalance && !bHasTradingBalance) return -1
    if (!aHasTradingBalance && bHasTradingBalance) return 1
    
    const aHasBalance = a.onchainBalance > 0
    const bHasBalance = b.onchainBalance > 0
    if (aHasBalance && !bHasBalance) return -1
    if (!aHasBalance && bHasBalance) return 1
    
    return a.symbol.localeCompare(b.symbol)
  })

  const isLoading = assets.length === 0

  return {
    balances,
    isLoading,
    error,
    refetch,
    walletAddress,
    // No sync function - trading balance only comes from hot wallet deposits
  }
}
