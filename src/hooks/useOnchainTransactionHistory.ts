import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface OnchainTransaction {
  id: string;
  user_id: string;
  wallet_address: string;
  chain_id: number;
  token_contract: string;
  token_symbol: string;
  token_name: string | null;
  token_decimals: number;
  token_logo_url: string | null;
  direction: 'SEND' | 'RECEIVE' | 'SELF';
  counterparty_address: string;
  amount_raw: string;
  amount_formatted: number;
  status: 'PENDING' | 'CONFIRMING' | 'CONFIRMED' | 'FAILED' | 'DROPPED';
  confirmations: number;
  required_confirmations: number;
  block_number: number | null;
  tx_hash: string;
  log_index: number | null;
  gas_fee_wei: string | null;
  gas_fee_formatted: number | null;
  nonce: number | null;
  source: 'ONCHAIN' | 'INTERNAL' | 'MANUAL';
  error_message: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
}

export type DirectionFilter = 'all' | 'SEND' | 'RECEIVE';
export type StatusFilter = 'all' | 'PENDING' | 'CONFIRMED' | 'FAILED';

interface UseOnchainTransactionHistoryOptions {
  direction?: DirectionFilter;
  status?: StatusFilter;
  tokenSymbol?: string;
  searchHash?: string;
  limit?: number;
}

export function useOnchainTransactionHistory(options: UseOnchainTransactionHistoryOptions = {}) {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const [isIndexing, setIsIndexing] = useState(false);
  
  const { 
    direction = 'all', 
    status = 'all', 
    tokenSymbol,
    searchHash,
    limit = 100 
  } = options;

  // Fetch transactions from the new onchain_transactions table
  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['onchain-transactions', user?.id, direction, status, tokenSymbol, searchHash, limit],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('onchain_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply direction filter
      if (direction !== 'all') {
        query = query.eq('direction', direction);
      }

      // Apply status filter
      if (status !== 'all') {
        if (status === 'PENDING') {
          query = query.in('status', ['PENDING', 'CONFIRMING']);
        } else if (status === 'FAILED') {
          query = query.in('status', ['FAILED', 'DROPPED']);
        } else {
          query = query.eq('status', status);
        }
      }

      // Apply token filter
      if (tokenSymbol) {
        query = query.ilike('token_symbol', tokenSymbol);
      }

      // Apply hash search
      if (searchHash) {
        query = query.ilike('tx_hash', `%${searchHash}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[useOnchainTransactionHistory] Query error:', error);
        throw error;
      }

      return (data || []) as OnchainTransaction[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Index new transactions from blockchain
  const indexTransactions = useCallback(async () => {
    if (!user || isIndexing) return;

    setIsIndexing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('[onchain-history] No session, skipping index');
        return;
      }

      console.log('[onchain-history] Indexing BEP-20 transactions...');
      const { data, error } = await supabase.functions.invoke('index-bep20-history', {
        body: { lookbackHours: 168 }, // 7 days
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.warn('[onchain-history] Index error:', error);
      } else if (data?.created > 0) {
        console.log(`[onchain-history] Indexed ${data.created} new transactions`);
        await refetch();
      }
    } catch (err) {
      console.warn('[onchain-history] Index failed:', err);
    } finally {
      setIsIndexing(false);
    }
  }, [user, isIndexing, refetch]);

  // Index on mount and periodically
  useEffect(() => {
    if (!user) return;

    // Index immediately on mount
    indexTransactions();

    // Then every 60 seconds
    const interval = setInterval(indexTransactions, 60000);
    return () => clearInterval(interval);
  }, [user, indexTransactions]);

  // Real-time subscription for instant updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`onchain-tx-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onchain_transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[onchain-history] Realtime update:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['onchain-transactions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    transactions,
    isLoading,
    isIndexing,
    error,
    refetch,
    indexTransactions
  };
}

// Get unique tokens from transaction history for filtering
export function useOnchainTokens() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['onchain-tokens', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('onchain_transactions')
        .select('token_symbol, token_logo_url')
        .eq('user_id', user.id);

      if (error) throw error;

      // Get unique tokens
      const tokenMap = new Map<string, string | null>();
      (data || []).forEach((t: any) => {
        if (!tokenMap.has(t.token_symbol)) {
          tokenMap.set(t.token_symbol, t.token_logo_url);
        }
      });

      return Array.from(tokenMap.entries()).map(([symbol, logo]) => ({
        symbol,
        logo_url: logo
      }));
    },
    enabled: !!user,
  });
}
