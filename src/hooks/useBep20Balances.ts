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
  const [appBalances, setAppBalances] = useState<Record<string, number>>({})

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

  // Fetch app balances from wallet_balances
  useEffect(() => {
    const fetchAppBalances = async () => {
      if (!user?.id || assets.length === 0) return
      
      const { data } = await supabase
        .from('wallet_balances')
        .select('asset_id, available, locked')
        .eq('user_id', user.id)
        .in('asset_id', assets.map(a => a.id))

      if (data) {
        const balMap: Record<string, number> = {}
        data.forEach(b => {
          balMap[b.asset_id] = (b.available || 0) + (b.locked || 0)
        })
        setAppBalances(balMap)
      }
    }
    fetchAppBalances()
  }, [user?.id, assets])

  // Query on-chain balances with prices
  const { data: balances, isLoading, error, refetch } = useQuery({
    queryKey: ['bep20-balances', walletAddress, assets.map(a => a.symbol).join(',')],
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

          return {
            assetId: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            logoUrl: asset.logoUrl,
            onchainBalance,
            appBalance: appBalances[asset.id] || 0,
            contractAddress: asset.contractAddress,
            priceUsd,
            onchainUsdValue
          }
        })
      )

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
