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
  tx_hash?: string;
  reference_id?: string;
  balance_after?: number;
  notes?: string;
  created_at: string;
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

  // Realtime subscription
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
