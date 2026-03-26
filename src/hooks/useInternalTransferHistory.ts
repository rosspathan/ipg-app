import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InternalTransfer {
  id: string;
  asset_symbol: string;
  direction: 'to_trading' | 'to_wallet';
  amount: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'success' | 'failed';
  status_detail?: string;
  tx_hash?: string;
  reference_id?: string;
  balance_after?: number;
  notes?: string;
  linked_withdrawal_id?: string;
  linked_deposit_id?: string;
  created_at: string;
  updated_at?: string;
}

/** Derive a user-friendly label from direction + status + status_detail */
export function getTransferDisplayStatus(tx: InternalTransfer): {
  label: string;
  color: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
  message: string;
} {
  const isDeposit = tx.direction === 'to_trading';

  if (tx.status === 'success') {
    return {
      label: isDeposit ? 'Credited' : 'Completed',
      color: 'emerald',
      message: isDeposit
        ? 'Credited to trading balance'
        : 'Completed and sent on-chain',
    };
  }

  if (tx.status === 'failed') {
    return {
      label: 'Failed',
      color: 'rose',
      message: tx.status_detail || (isDeposit ? 'Deposit failed' : 'Withdrawal failed — funds refunded'),
    };
  }

  // Pending — use status_detail for granularity
  if (isDeposit) {
    if (tx.status_detail?.includes('review')) {
      return { label: 'Needs Review', color: 'purple', message: tx.status_detail };
    }
    return {
      label: 'Confirming',
      color: 'amber',
      message: tx.status_detail || 'Waiting for blockchain confirmation',
    };
  }

  // Withdrawal pending
  const detail = tx.status_detail?.toLowerCase() || '';
  if (detail.includes('broadcasting') || detail.includes('processing')) {
    return { label: 'Broadcasting', color: 'blue', message: tx.status_detail || 'Broadcasting on-chain' };
  }
  if (detail.includes('review')) {
    return { label: 'Needs Review', color: 'purple', message: tx.status_detail || 'Needs admin review' };
  }
  if (detail.includes('liquidity') || detail.includes('solvency') || detail.includes('blocked')) {
    return { label: 'Queued', color: 'amber', message: tx.status_detail || 'Queued — awaiting liquidity' };
  }
  return {
    label: 'Queued',
    color: 'amber',
    message: tx.status_detail || 'Queued for hot wallet processing',
  };
}

export function useInternalTransferHistory() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['internal-transfer-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('internal_balance_transfers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InternalTransfer[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('internal-transfers-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'internal_balance_transfers',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['internal-transfer-history'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}
