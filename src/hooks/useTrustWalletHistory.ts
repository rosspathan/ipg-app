import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrustWalletTransaction } from '@/components/history/TrustWalletHistoryItem';

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

  return useQuery({
    queryKey: ['trust-wallet-history', userId, limit, transactionTypes, balanceTypes, dateFrom, dateTo],
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
