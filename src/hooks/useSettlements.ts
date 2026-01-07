import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SettlementRequest {
  id: string;
  trade_id: string;
  user_id: string;
  counterparty_id: string;
  direction: 'send' | 'receive';
  asset_symbol: string;
  amount: number;
  from_wallet: string;
  to_wallet: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed' | 'expired';
  tx_hash: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  expires_at: string;
  error_message: string | null;
  created_at: string;
}

// Token contract addresses on BSC
export const TOKEN_CONTRACTS: Record<string, string> = {
  'USDT': '0x55d398326f99059fF775485246999027B3197955',
  'BSK': '0x65748C6a1377bF49CDF2B4E67D54f71F2CA47c78',
  'IPG': '0x05002c24c2A999253f5eEe44A85C2B6BAD7f656E',
  'BTC': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  'ETH': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  'BNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
};

export function useSettlements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending settlement requests for current user
  const { data: pendingSettlements, isLoading, refetch } = useQuery({
    queryKey: ['settlement-requests', 'pending'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('settlement_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('direction', 'send')
        .in('status', ['pending', 'submitted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SettlementRequest[];
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Fetch all settlements for current user (including history)
  const { data: allSettlements } = useQuery({
    queryKey: ['settlement-requests', 'all'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('settlement_requests')
        .select('*')
        .or(`user_id.eq.${user.id},counterparty_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as SettlementRequest[];
    },
  });

  // Confirm settlement with tx hash
  const confirmSettlementMutation = useMutation({
    mutationFn: async ({ settlementRequestId, txHash }: { settlementRequestId: string; txHash: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('confirm-settlement', {
        body: {
          settlement_request_id: settlementRequestId,
          tx_hash: txHash,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to confirm settlement');
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Settlement Confirmed',
        description: data.trade_complete 
          ? 'Trade fully settled on-chain!' 
          : 'Your transfer confirmed. Waiting for counterparty.',
      });
      queryClient.invalidateQueries({ queryKey: ['settlement-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Confirmation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update settlement request with submitted tx hash (before confirmation)
  const submitTxHashMutation = useMutation({
    mutationFn: async ({ settlementRequestId, txHash }: { settlementRequestId: string; txHash: string }) => {
      const { error } = await supabase
        .from('settlement_requests')
        .update({
          tx_hash: txHash,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', settlementRequestId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement-requests'] });
    },
  });

  return {
    pendingSettlements: pendingSettlements || [],
    allSettlements: allSettlements || [],
    isLoading,
    refetch,
    confirmSettlement: confirmSettlementMutation.mutate,
    submitTxHash: submitTxHashMutation.mutate,
    isConfirming: confirmSettlementMutation.isPending,
    pendingCount: pendingSettlements?.filter(s => s.status === 'pending').length || 0,
  };
}
