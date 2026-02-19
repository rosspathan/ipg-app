import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { getStoredEvmAddress } from '@/lib/wallet/evmAddress'

interface OnchainAsset {
  symbol: string
  name: string
  balance: number
  contractAddress: string | null
  decimals: number
  network: string
  logoUrl?: string
}

interface OnchainBalancesResult {
  balances: OnchainAsset[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// Simple ERC20 balance checker using JSON-RPC
async function getERC20Balance(contractAddress: string, walletAddress: string, decimals: number): Promise<number> {
  try {
    const data = `0x70a08231000000000000000000000000${walletAddress.replace('0x', '')}`
    
    const response = await fetch('https://bsc-dataseed.binance.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          data,
          to: contractAddress
        }, 'latest'],
        id: 1
      })
    })

    const result = await response.json()
    if (!result.result || result.result === '0x') return 0
    
    const balanceHex = result.result
    const balanceWei = BigInt(balanceHex)
    const divisor = BigInt(10 ** decimals)
    return Number(balanceWei) / Number(divisor)
  } catch (error) {
    console.error(`Error fetching ERC20 balance for ${contractAddress}:`, error)
    return 0
  }
}

async function getBNBBalance(walletAddress: string): Promise<number> {
  try {
    const response = await fetch('https://bsc-dataseed.binance.org', {
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
    if (!result.result || result.result === '0x') return 0
    
    const balanceHex = result.result
    const balanceWei = BigInt(balanceHex)
    const divisor = BigInt(10 ** 18)
    return Number(balanceWei) / Number(divisor)
  } catch (error) {
    console.error('Error fetching BNB balance:', error)
    return 0
  }
}

export function useOnchainBalances(): OnchainBalancesResult {
  const queryClient = useQueryClient()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [assets, setAssets] = useState<Array<{
    symbol: string
    name: string
    contractAddress: string | null
    decimals: number
    network: string
    logoUrl?: string
  }>>([])

  // Fetch user's wallet address (DB -> user_wallets -> local fallbacks)
  useEffect(() => {
    const fetchWalletAddress = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const address = await getStoredEvmAddress(user.id)
      if (address) setWalletAddress(address)
    }

    fetchWalletAddress()
  }, [])

  // Realtime subscription to auto-refresh when onchain_balances change
  useEffect(() => {
    const channel = supabase
      .channel('onchain-balances-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'onchain_balances',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['onchain-balances-all'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  // Fetch supported BEP20 assets from database
  useEffect(() => {
    const fetchAssets = async () => {
      const { data: dbAssets } = await supabase
        .from('assets')
        .select('symbol, name, contract_address, decimals, network, logo_url')
        .eq('is_active', true)
        .or('network.ilike.%bep20%,network.ilike.%bsc%')
      
      if (dbAssets) {
        // Add BNB as native token
        const assetsWithBNB = [
          {
            symbol: 'BNB',
            name: 'BNB',
            contractAddress: null,
            decimals: 18,
            network: 'BSC',
            logoUrl: undefined
          },
          ...dbAssets.map(a => ({
            symbol: a.symbol,
            name: a.name,
            contractAddress: a.contract_address,
            decimals: a.decimals || 18,
            network: a.network || 'BEP20',
            logoUrl: a.logo_url || undefined
          }))
        ]
        setAssets(assetsWithBNB)
      }
    }

    fetchAssets()
  }, [])

  // Query balances: always fetch LIVE RPC balances for instant reflection,
  // fall back to DB only when RPC fails
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['onchain-balances-all', walletAddress, assets.length],
    queryFn: async (): Promise<OnchainAsset[]> => {
      if (!walletAddress || assets.length === 0) {
        return []
      }

      // Fetch DB balances as fallback
      const { data: { user } } = await supabase.auth.getUser()
      let dbBalances: Record<string, number> = {}

      if (user) {
        const { data: dbAssets } = await supabase
          .from('assets')
          .select('id, symbol')
          .eq('is_active', true)

        const { data: obData } = await supabase
          .from('onchain_balances')
          .select('asset_id, balance')
          .eq('user_id', user.id)

        if (obData && dbAssets) {
          const idToSymbol: Record<string, string> = {}
          dbAssets.forEach(a => { idToSymbol[a.id] = a.symbol })
          obData.forEach(b => {
            const sym = idToSymbol[b.asset_id]
            if (sym) dbBalances[sym] = Number(b.balance) || 0
          })
        }
      }

      // Always fetch live RPC balances first for instant updates
      const balancePromises = assets.map(async (asset) => {
        let balance = 0

        try {
          if (asset.symbol === 'BNB') {
            balance = await getBNBBalance(walletAddress)
          } else if (asset.contractAddress) {
            balance = await getERC20Balance(asset.contractAddress, walletAddress, asset.decimals)
          }
        } catch (err) {
          console.warn(`[OnchainBalances] RPC failed for ${asset.symbol}, using DB fallback:`, err)
          // Fall back to DB balance if RPC fails
          balance = dbBalances[asset.symbol] || 0
        }

        return {
          symbol: asset.symbol,
          name: asset.name,
          balance,
          contractAddress: asset.contractAddress,
          decimals: asset.decimals,
          network: asset.network,
          logoUrl: asset.logoUrl
        }
      })

      const results = await Promise.all(balancePromises)
      
      // Filter out dust/near-zero balances (less than 0.000001)
      const filtered = results.filter(r => r.balance >= 0.000001 || r.symbol === 'BNB')
      
      // Sort: non-zero balances first (highest first), then alphabetically
      return filtered.sort((a, b) => {
        if (a.balance > 0 && b.balance <= 0) return -1
        if (a.balance <= 0 && b.balance > 0) return 1
        if (a.balance > 0 && b.balance > 0) return b.balance - a.balance
        return a.symbol.localeCompare(b.symbol)
      })
    },
    enabled: !!walletAddress && assets.length > 0,
    refetchInterval: 15000,
    staleTime: 10000
  })

  return {
    balances: data || [],
    isLoading,
    error: error as Error | null,
    refetch
  }
}
