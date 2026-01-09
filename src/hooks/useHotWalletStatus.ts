import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ethers } from "ethers";

interface HotWalletStatus {
  address: string;
  chain: string;
  label: string | null;
  is_active: boolean;
  bnbBalance: string;
  bnbBalanceUsd: number;
  isLowGas: boolean;
}

const BSC_RPC_URL = "https://bsc-dataseed1.binance.org";
const BNB_USD_PRICE = 600; // Approximate, ideally fetch from API
const LOW_GAS_THRESHOLD = 0.1; // BNB

export function useHotWalletStatus() {
  return useQuery({
    queryKey: ['hot-wallet-status'],
    queryFn: async (): Promise<HotWalletStatus | null> => {
      // Get active hot wallet from database
      const { data: wallet, error } = await supabase
        .from('platform_hot_wallet')
        .select('address, chain, label, is_active')
        .eq('is_active', true)
        .eq('chain', 'BSC')
        .maybeSingle();

      if (error) throw error;
      if (!wallet) return null;

      // Fetch BNB balance from chain
      try {
        const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
        const balance = await provider.getBalance(wallet.address);
        const bnbBalance = ethers.formatEther(balance);
        const bnbBalanceNum = parseFloat(bnbBalance);

        return {
          ...wallet,
          bnbBalance,
          bnbBalanceUsd: bnbBalanceNum * BNB_USD_PRICE,
          isLowGas: bnbBalanceNum < LOW_GAS_THRESHOLD,
        };
      } catch (rpcError) {
        console.error('Failed to fetch on-chain balance:', rpcError);
        // Return wallet info without balance
        return {
          ...wallet,
          bnbBalance: '0',
          bnbBalanceUsd: 0,
          isLowGas: true,
        };
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
