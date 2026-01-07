import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EscrowBalance {
  id: string;
  user_id: string;
  asset_symbol: string;
  deposited: number;
  locked: number;
  available: number;
  escrow_address: string | null;
  last_deposit_tx: string | null;
  last_deposit_at: string | null;
}

export interface EscrowDeposit {
  id: string;
  user_id: string;
  asset_symbol: string;
  amount: number;
  tx_hash: string;
  from_address: string;
  status: string;
  confirmations: number;
  required_confirmations: number;
  created_at: string;
}

export interface EscrowContractConfig {
  id: string;
  contract_address: string;
  chain: string;
  chain_id: number;
  is_active: boolean;
  relayer_address: string | null;
}

export function useEscrowBalance(assetSymbol?: string) {
  const queryClient = useQueryClient();

  // Fetch escrow balances
  const { data: balances, isLoading, refetch } = useQuery({
    queryKey: ['escrow-balances', assetSymbol],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('escrow_balances')
        .select('*')
        .eq('user_id', user.id);

      if (assetSymbol) {
        query = query.eq('asset_symbol', assetSymbol);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EscrowBalance[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch escrow deposits
  const { data: deposits } = useQuery({
    queryKey: ['escrow-deposits', assetSymbol],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('escrow_deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (assetSymbol) {
        query = query.eq('asset_symbol', assetSymbol);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EscrowDeposit[];
    },
  });

  // Fetch escrow contract config
  const { data: contractConfig } = useQuery({
    queryKey: ['escrow-contract-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escrow_contract_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as EscrowContractConfig | null;
    },
  });

  // Request withdrawal
  const withdrawMutation = useMutation({
    mutationFn: async ({ asset_symbol, amount, to_address }: { 
      asset_symbol: string; 
      amount: number; 
      to_address?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('escrow-withdraw', {
        body: { asset_symbol, amount, to_address }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success('Withdrawal request created');
      queryClient.invalidateQueries({ queryKey: ['escrow-balances'] });
      queryClient.invalidateQueries({ queryKey: ['escrow-withdrawals'] });
    },
    onError: (error: Error) => {
      toast.error(`Withdrawal failed: ${error.message}`);
    }
  });

  // Get balance for specific asset
  const getBalance = (symbol: string): EscrowBalance | undefined => {
    return balances?.find(b => b.asset_symbol === symbol);
  };

  // Get total available balance
  const getTotalAvailable = (): number => {
    return balances?.reduce((sum, b) => sum + (b.available || 0), 0) || 0;
  };

  return {
    balances,
    deposits,
    contractConfig,
    isLoading,
    refetch,
    getBalance,
    getTotalAvailable,
    withdraw: withdrawMutation.mutate,
    isWithdrawing: withdrawMutation.isPending,
  };
}
