import { useState, useEffect } from 'react'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'
import { bsc } from 'viem/chains'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface OnchainBalanceResult {
  balance: string
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// No fallbacks needed - all contract addresses are now in the database

export function useErc20OnchainBalance(
  symbol: string,
  network: 'bsc' = 'bsc'
): OnchainBalanceResult {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [assetInfo, setAssetInfo] = useState<{ contract: `0x${string}`; decimals: number } | null>(null)

  // Fetch user's wallet address
  useEffect(() => {
    const fetchWalletAddress = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address, wallet_addresses')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        const address = profile.wallet_addresses?.['bsc-mainnet'] ||
                       profile.wallet_addresses?.['evm-mainnet'] ||
                       profile.wallet_address
        setWalletAddress(address)
      }
    }

    fetchWalletAddress()
  }, [])

  // Fetch asset info (contract address and decimals)
  useEffect(() => {
    const fetchAssetInfo = async () => {
      // Try to find asset in database - try different network variations
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
          contract: asset.contract_address as `0x${string}`,
          decimals: asset.decimals || 18
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

      const publicClient = createPublicClient({
        chain: bsc,
        transport: http('https://bsc-dataseed.binance.org')
      })

      // Handle native BNB balance
      if ('isNative' in assetInfo && assetInfo.isNative) {
        const balance = await publicClient.getBalance({
          address: walletAddress as `0x${string}`
        })
        return formatUnits(balance, assetInfo.decimals)
      }

      // Handle ERC20 tokens
      if (!assetInfo.contract) {
        return '0'
      }

      const balance = await publicClient.readContract({
        address: assetInfo.contract,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`]
      })

      return formatUnits(balance, assetInfo.decimals)
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
