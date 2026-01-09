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
  transaction_type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
  status: string;
  tx_hash: string | null;
  network: string | null;
  confirmations: number | null;
  required_confirmations: number;
  to_address: string | null;
  fee: number | null;
  completed_at: string | null;
  counterparty?: string; // For internal transfers
}

export type TransactionFilter = 'all' | 'deposit' | 'withdrawal' | 'transfer';
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

      const results: CryptoTransaction[] = [];

      // Fetch deposits
      if (transactionType === 'all' || transactionType === 'deposit') {
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

        // Apply status filter
        if (status !== 'all') {
          if (status === 'pending') {
            depositsQuery = depositsQuery.in('status', ['pending', 'confirming', 'processing']);
          } else if (status === 'completed') {
            depositsQuery = depositsQuery.in('status', ['completed', 'credited']);
          } else if (status === 'failed') {
            depositsQuery = depositsQuery.in('status', ['failed', 'rejected']);
          }
        }

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

      // Fetch withdrawals
      if (transactionType === 'all' || transactionType === 'withdrawal') {
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
            withdrawalsQuery = withdrawalsQuery.in('status', ['pending', 'processing']);
          } else if (status === 'completed') {
            withdrawalsQuery = withdrawalsQuery.eq('status', 'completed');
          } else if (status === 'failed') {
            withdrawalsQuery = withdrawalsQuery.in('status', ['failed', 'rejected']);
          }
        }

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

      // Fetch internal transfers (sent by user)
      if (transactionType === 'all' || transactionType === 'transfer') {
        const { data: sentTransfers, error: sentError } = await supabase
          .from('crypto_internal_transfers')
          .select(`
            id,
            sender_id,
            recipient_id,
            created_at,
            amount,
            fee,
            status,
            transaction_ref,
            assets (symbol, name, logo_url)
          `)
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (sentError) {
          console.error('Error fetching sent transfers:', sentError);
        }

        if (sentTransfers) {
          // Fetch recipient profiles separately
          const recipientIds = [...new Set(sentTransfers.map(t => t.recipient_id))];
          const { data: recipientProfiles } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', recipientIds);

          const profileMap = new Map(recipientProfiles?.map(p => [p.id, p]) || []);

          results.push(...sentTransfers.map((t: any) => {
            const recipient = profileMap.get(t.recipient_id);
            return {
              id: t.id,
              user_id: t.sender_id,
              created_at: t.created_at,
              amount: parseFloat(t.amount),
              symbol: t.assets?.symbol || 'Unknown',
              asset_name: t.assets?.name || 'Unknown',
              logo_url: t.assets?.logo_url || null,
              transaction_type: 'transfer_out' as const,
              status: t.status,
              tx_hash: t.transaction_ref,
              network: null,
              confirmations: null,
              required_confirmations: 0,
              to_address: null,
              fee: t.fee ? parseFloat(t.fee) : null,
              completed_at: t.created_at,
              counterparty: recipient?.full_name || recipient?.username || 'User'
            };
          }));
        }

        // Fetch internal transfers (received by user)
        const { data: receivedTransfers, error: receivedError } = await supabase
          .from('crypto_internal_transfers')
          .select(`
            id,
            sender_id,
            recipient_id,
            created_at,
            net_amount,
            status,
            transaction_ref,
            assets (symbol, name, logo_url)
          `)
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (receivedError) {
          console.error('Error fetching received transfers:', receivedError);
        }

        if (receivedTransfers) {
          // Fetch sender profiles separately
          const senderIds = [...new Set(receivedTransfers.map(t => t.sender_id))];
          const { data: senderProfiles } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', senderIds);

          const profileMap = new Map(senderProfiles?.map(p => [p.id, p]) || []);

          results.push(...receivedTransfers.map((t: any) => {
            const sender = profileMap.get(t.sender_id);
            return {
              id: `${t.id}_recv`,
              user_id: t.recipient_id,
              created_at: t.created_at,
              amount: parseFloat(t.net_amount),
              symbol: t.assets?.symbol || 'Unknown',
              asset_name: t.assets?.name || 'Unknown',
              logo_url: t.assets?.logo_url || null,
              transaction_type: 'transfer_in' as const,
              status: t.status,
              tx_hash: t.transaction_ref,
              network: null,
              confirmations: null,
              required_confirmations: 0,
              to_address: null,
              fee: null,
              completed_at: t.created_at,
              counterparty: sender?.full_name || sender?.username || 'User'
            };
          }));
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
        () => fetchTransactions()
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
        () => fetchTransactions()
      )
      .subscribe();

    const transfersChannel = supabase
      .channel('crypto-transfers-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crypto_internal_transfers'
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(transfersChannel);
    };
  }, [user, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions
  };
}
