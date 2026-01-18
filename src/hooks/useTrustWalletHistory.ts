import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrustWalletTransaction } from '@/components/history/TrustWalletHistoryItem';
import { useEffect, useMemo } from 'react';

interface UseTrustWalletHistoryOptions {
  userId?: string;
  limit?: number;
  transactionTypes?: string[];
  balanceTypes?: ('withdrawable' | 'holding')[];
  dateFrom?: string;
  dateTo?: string;
}

export function useTrustWalletHistory(options: UseTrustWalletHistoryOptions = {}) {
  const {
    userId,
    limit = 50,
    transactionTypes,
    balanceTypes,
    dateFrom,
    dateTo,
  } = options;

  const queryClient = useQueryClient();
  
  // Memoize query key to prevent unnecessary effect re-runs
  const queryKey = useMemo(
    () => ['trust-wallet-history', userId, limit, transactionTypes, balanceTypes, dateFrom, dateTo],
    [userId, limit, transactionTypes, balanceTypes, dateFrom, dateTo]
  );

  // Set up real-time subscription for instant updates
  useEffect(() => {
    if (!userId) return;

    // Subscribe to changes in unified_bsk_ledger for this user
    // This ensures both sender AND receiver see transfers instantly
    const channel = supabase
      .channel(`history-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'unified_bsk_ledger',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate and refetch on any new transaction
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, queryKey]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('unified_bsk_transactions')
        .select('*', { count: 'exact' });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (transactionTypes && transactionTypes.length > 0) {
        query = query.in('transaction_type', transactionTypes);
      }

      if (balanceTypes && balanceTypes.length > 0) {
        query = query.in('balance_type', balanceTypes);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        transactions: (data || []) as TrustWalletTransaction[],
        totalCount: count || 0,
      };
    },
    enabled: true,
  });
}
