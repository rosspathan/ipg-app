import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface CryptoTransaction {
  id: string;
  user_id: string;
  created_at: string;
  amount: number;
  symbol: string;
  asset_name: string;
  logo_url: string | null;
  transaction_type: 'deposit' | 'withdrawal';
  status: string;
  tx_hash: string | null;
  network: string | null;
  confirmations: number | null;
  required_confirmations: number;
  to_address: string | null;
  fee: number | null;
  completed_at: string | null;
}

export type TransactionFilter = 'all' | 'deposit' | 'withdrawal';
export type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';

interface UseCryptoTransactionHistoryOptions {
  transactionType?: TransactionFilter;
  status?: StatusFilter;
  limit?: number;
}

export function useCryptoTransactionHistory(options: UseCryptoTransactionHistoryOptions = {}) {
  const { user } = useAuthUser();
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { transactionType = 'all', status = 'all', limit = 50 } = options;

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch deposits
      let depositsQuery = supabase
        .from('deposits')
        .select(`
          id,
          user_id,
          created_at,
          amount,
          status,
          tx_hash,
          network,
          confirmations,
          required_confirmations,
          credited_at,
          assets (
            symbol,
            name,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch withdrawals
      let withdrawalsQuery = supabase
        .from('withdrawals')
        .select(`
          id,
          user_id,
          created_at,
          amount,
          status,
          tx_hash,
          network,
          to_address,
          fee,
          approved_at,
          assets (
            symbol,
            name,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (status !== 'all') {
        if (status === 'pending') {
          depositsQuery = depositsQuery.in('status', ['pending', 'confirming', 'processing']);
          withdrawalsQuery = withdrawalsQuery.in('status', ['pending', 'processing']);
        } else if (status === 'completed') {
          depositsQuery = depositsQuery.in('status', ['completed', 'credited']);
          withdrawalsQuery = withdrawalsQuery.eq('status', 'completed');
        } else if (status === 'failed') {
          depositsQuery = depositsQuery.in('status', ['failed', 'rejected']);
          withdrawalsQuery = withdrawalsQuery.in('status', ['failed', 'rejected']);
        }
      }

      const results: CryptoTransaction[] = [];

      // Fetch deposits if not filtering to withdrawals only
      if (transactionType === 'all' || transactionType === 'deposit') {
        const { data: deposits, error: depositsError } = await depositsQuery.limit(limit);
        if (depositsError) throw depositsError;
        
        if (deposits) {
          results.push(...deposits.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            created_at: d.created_at,
            amount: parseFloat(d.amount),
            symbol: d.assets?.symbol || 'Unknown',
            asset_name: d.assets?.name || 'Unknown',
            logo_url: d.assets?.logo_url || null,
            transaction_type: 'deposit' as const,
            status: d.status,
            tx_hash: d.tx_hash,
            network: d.network,
            confirmations: d.confirmations,
            required_confirmations: d.required_confirmations || 12,
            to_address: null,
            fee: null,
            completed_at: d.credited_at
          })));
        }
      }

      // Fetch withdrawals if not filtering to deposits only
      if (transactionType === 'all' || transactionType === 'withdrawal') {
        const { data: withdrawals, error: withdrawalsError } = await withdrawalsQuery.limit(limit);
        if (withdrawalsError) throw withdrawalsError;
        
        if (withdrawals) {
          results.push(...withdrawals.map((w: any) => ({
            id: w.id,
            user_id: w.user_id,
            created_at: w.created_at,
            amount: parseFloat(w.amount),
            symbol: w.assets?.symbol || 'Unknown',
            asset_name: w.assets?.name || 'Unknown',
            logo_url: w.assets?.logo_url || null,
            transaction_type: 'withdrawal' as const,
            status: w.status,
            tx_hash: w.tx_hash,
            network: w.network,
            confirmations: null,
            required_confirmations: 12,
            to_address: w.to_address,
            fee: w.fee ? parseFloat(w.fee) : null,
            completed_at: w.approved_at
          })));
        }
      }

      // Sort by created_at descending
      results.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(results.slice(0, limit));
    } catch (err) {
      console.error('Error fetching crypto transactions:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user, transactionType, status, limit]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const depositsChannel = supabase
      .channel('crypto-deposits-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposits',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    const withdrawalsChannel = supabase
      .channel('crypto-withdrawals-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(withdrawalsChannel);
    };
  }, [user, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions
  };
}
