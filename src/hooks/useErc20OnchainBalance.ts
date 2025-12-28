import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { getStoredEvmAddress } from '@/lib/wallet/evmAddress'

interface OnchainBalanceResult {
  balance: string
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// Simple ERC20 balance checker using JSON-RPC
async function getERC20Balance(contractAddress: string, walletAddress: string, decimals: number): Promise<string> {
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
  const balanceHex = result.result
  const balanceWei = BigInt(balanceHex)
  const divisor = BigInt(10 ** decimals)
  const balance = Number(balanceWei) / Number(divisor)
  
  return balance.toFixed(decimals)
}

async function getBNBBalance(walletAddress: string): Promise<string> {
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
  const balanceHex = result.result
  const balanceWei = BigInt(balanceHex)
  const divisor = BigInt(10 ** 18)
  const balance = Number(balanceWei) / Number(divisor)
  
  return balance.toFixed(18)
}

export function useErc20OnchainBalance(
  symbol: string,
  network: 'bsc' = 'bsc'
): OnchainBalanceResult {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [assetInfo, setAssetInfo] = useState<{ contract: string; decimals: number; isNative?: boolean } | null>(null)

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

  // Fetch asset info (contract address and decimals)
  useEffect(() => {
    const fetchAssetInfo = async () => {
      // Check if it's native BNB
      if (symbol === 'BNB') {
        setAssetInfo({ contract: '', decimals: 18, isNative: true })
        return
      }

      // Try to find asset in database
      let { data: asset } = await supabase
        .from('assets')
        .select('contract_address, decimals')
        .eq('symbol', symbol)
        .or('network.ilike.%bep20%,network.ilike.%bsc%')
        .not('contract_address', 'is', null)
        .eq('is_active', true)
        .maybeSingle()

      // If no match with BEP20/BSC filter, try just by symbol
      if (!asset?.contract_address) {
        const { data: fallbackAsset } = await supabase
          .from('assets')
          .select('contract_address, decimals')
          .eq('symbol', symbol)
          .not('contract_address', 'is', null)
          .eq('is_active', true)
          .maybeSingle()
        
        asset = fallbackAsset
      }

      if (asset?.contract_address) {
        setAssetInfo({
          contract: asset.contract_address,
          decimals: asset.decimals || 18,
          isNative: false
        })
      }
    }

    if (symbol && network) {
      fetchAssetInfo()
    }
  }, [symbol, network])

  // Query on-chain balance
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['onchain-balance', symbol, network, walletAddress, assetInfo?.contract],
    queryFn: async () => {
      if (!walletAddress || !assetInfo) {
        return '0'
      }

      // Handle native BNB balance
      if (assetInfo.isNative) {
        return await getBNBBalance(walletAddress)
      }

      // Handle ERC20 tokens
      if (!assetInfo.contract) {
        return '0'
      }

      return await getERC20Balance(assetInfo.contract, walletAddress, assetInfo.decimals)
    },
    enabled: !!walletAddress && !!assetInfo,
    refetchInterval: 30000,
    staleTime: 20000
  })

  return {
    balance: data || '0',
    isLoading,
    error: error as Error | null,
    refetch
  }
}
