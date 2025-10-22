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

export function useErc20OnchainBalance(
  symbol: string,
  network: 'bsc' = 'bsc'
): OnchainBalanceResult {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [assetInfo, setAssetInfo] = useState<{ contract: string; decimals: number } | null>(null)

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
      const { data: asset } = await supabase
        .from('assets')
        .select('contract_address, decimals')
        .eq('symbol', symbol)
        .eq('network', network)
        .eq('is_active', true)
        .single()

      if (asset?.contract_address) {
        setAssetInfo({
          contract: asset.contract_address,
          decimals: asset.decimals || 18
        })
      }
    }

    fetchAssetInfo()
  }, [symbol, network])

  // Query on-chain balance
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['onchain-balance', symbol, network, walletAddress, assetInfo?.contract],
    queryFn: async () => {
      if (!walletAddress || !assetInfo?.contract) {
        return '0'
      }

      const publicClient = createPublicClient({
        chain: bsc,
        transport: http('https://bsc-dataseed.binance.org')
      })

      const balance = await publicClient.readContract({
        address: assetInfo.contract as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`]
      })

      return formatUnits(balance, assetInfo.decimals)
    },
    enabled: !!walletAddress && !!assetInfo?.contract,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000
  })

  return {
    balance: data || '0',
    isLoading,
    error: error as Error | null,
    refetch
  }
}
