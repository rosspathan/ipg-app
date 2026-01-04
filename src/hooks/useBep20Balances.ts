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

  // Real-time subscription for app balances
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchAppBalances])

  // Query on-chain balances with prices and auto-sync to wallet_balances
  const { data: balances, isLoading, error, refetch } = useQuery({
    queryKey: ['bep20-balances', walletAddress, assets.map(a => a.symbol).join(','), user?.id],
    queryFn: async (): Promise<Bep20Balance[]> => {
      if (!walletAddress || assets.length === 0) return []

      // Fetch prices for all assets
      let prices: Record<string, number> = {}
      try {
        const { data: priceData } = await supabase.functions.invoke('fetch-crypto-prices', {
          body: { symbols: assets.map(a => a.symbol) }
        })
        prices = priceData?.prices || {}
      } catch (err) {
        console.warn('Failed to fetch prices:', err)
      }

      const results = await Promise.all(
        assets.map(async (asset) => {
          let onchainBalance = 0
          try {
            if (asset.symbol === 'BNB' || !asset.contractAddress) {
              onchainBalance = await getBNBBalance(walletAddress)
            } else {
              onchainBalance = await getERC20Balance(asset.contractAddress, walletAddress, asset.decimals)
            }
          } catch (err) {
            console.warn(`Failed to fetch ${asset.symbol} balance:`, err)
          }

          const priceUsd = prices[asset.symbol] || 0
          const onchainUsdValue = onchainBalance * priceUsd
          const appBal = appBalances[asset.id] || { available: 0, locked: 0, total: 0 }

          return {
            assetId: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            logoUrl: asset.logoUrl,
            onchainBalance,
            appBalance: appBal.total,
            appAvailable: appBal.available,
            appLocked: appBal.locked,
            contractAddress: asset.contractAddress,
            priceUsd,
            onchainUsdValue
          }
        })
      )

      // Auto-sync on-chain balances to wallet_balances table
      if (user?.id) {
        const assetsToSync = results.filter(b => b.onchainBalance > 0)
        if (assetsToSync.length > 0) {
          console.log('[useBep20Balances] Auto-syncing', assetsToSync.length, 'assets to wallet_balances...')
          
          // Fetch existing locked amounts to preserve them
          const { data: existingBalances } = await supabase
            .from('wallet_balances')
            .select('asset_id, available, locked, total')
            .eq('user_id', user.id)
            .in('asset_id', assetsToSync.map(a => a.assetId))
          
          const existingMap = new Map(existingBalances?.map(b => [b.asset_id, b]) || [])
          
          // Upsert each balance (preserving locked amounts)
          for (const asset of assetsToSync) {
            const existing = existingMap.get(asset.assetId)
            const currentLocked = existing?.locked || 0
            const currentTotal = existing?.total || 0
            
            // Only sync if on-chain balance is greater than current total
            if (asset.onchainBalance > currentTotal) {
              const newTotal = asset.onchainBalance
              const newAvailable = Math.max(0, newTotal - currentLocked)
              
              const { error: upsertError } = await supabase.from('wallet_balances').upsert({
                user_id: user.id,
                asset_id: asset.assetId,
                available: newAvailable,
                locked: currentLocked,
                total: newTotal,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id,asset_id' })
              
              if (upsertError) {
                console.error('[useBep20Balances] Failed to sync', asset.symbol, ':', upsertError)
              } else {
                console.log('[useBep20Balances] Synced', asset.symbol, ':', newTotal, '(available:', newAvailable, ', locked:', currentLocked, ')')
                // Update the appBalance in results to reflect the sync
                asset.appBalance = newTotal
                asset.appAvailable = newAvailable
                asset.appLocked = currentLocked
              }
            }
          }
        }
      }

      // Sort: tokens with onchain balance first, then by symbol
      return results.sort((a, b) => {
        if (a.onchainBalance > 0 && b.onchainBalance === 0) return -1
        if (a.onchainBalance === 0 && b.onchainBalance > 0) return 1
        return a.symbol.localeCompare(b.symbol)
      })
    },
    enabled: !!walletAddress && assets.length > 0,
    staleTime: 30000,
    refetchInterval: 30000
  })

  return {
    balances: balances || [],
    isLoading,
    error,
    refetch,
    walletAddress
  }
}
