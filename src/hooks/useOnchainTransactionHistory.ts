import { useState, useEffect, useCallback, useRef } from 'react';
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

export interface IndexingStatus {
  isIndexing: boolean;
  lastIndexedAt: Date | null;
  lastError: string | null;
  lastResult: {
    success: boolean;
    indexed: number;
    created: number;
    skipped?: number;
    provider?: string;
    wallet?: string;
    duration_ms?: number;
    error?: string;
    error_code?: string;
  } | null;
}

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
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatus>({
    isIndexing: false,
    lastIndexedAt: null,
    lastError: null,
    lastResult: null,
  });
  
  const indexingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  
  const { 
    direction = 'all', 
    status = 'all', 
    tokenSymbol,
    searchHash,
    limit = 100 
  } = options;

  // Fetch transactions from the onchain_transactions table
  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['onchain-transactions', user?.id, direction, status, tokenSymbol, searchHash, limit],
    queryFn: async () => {
      if (!user) return [];

      console.log('[onchain-history] Fetching transactions from DB...');

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
        console.error('[onchain-history] Query error:', error);
        throw error;
      }

      console.log(`[onchain-history] Loaded ${data?.length || 0} transactions from DB`);
      return (data || []) as OnchainTransaction[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  // Index new transactions from blockchain with timeout
  const indexTransactions = useCallback(async (forceRefresh = false) => {
    if (!user || indexingRef.current) {
      console.log('[onchain-history] Skipping index: no user or already indexing');
      return;
    }

    indexingRef.current = true;
    setIndexingStatus(prev => ({ ...prev, isIndexing: true, lastError: null }));

    // Set timeout for 15 seconds max
    const indexTimeout = setTimeout(() => {
      console.warn('[onchain-history] Index timed out after 15 seconds');
      indexingRef.current = false;
      setIndexingStatus(prev => ({
        ...prev,
        isIndexing: false,
        lastError: 'Request timed out. Please try again.',
      }));
    }, 15000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('[onchain-history] No session, skipping index');
        clearTimeout(indexTimeout);
        indexingRef.current = false;
        setIndexingStatus(prev => ({ 
          ...prev, 
          isIndexing: false,
          lastError: 'Not authenticated. Please log in again.',
        }));
        return;
      }

      console.log('[onchain-history] Calling index-bep20-history edge function...');
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('index-bep20-history', {
        body: { lookbackHours: 168, forceRefresh },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      clearTimeout(indexTimeout);
      const duration = Date.now() - startTime;
      console.log(`[onchain-history] Index response in ${duration}ms:`, data);

      if (error) {
        console.error('[onchain-history] Index function error:', error);
        setIndexingStatus(prev => ({
          ...prev,
          isIndexing: false,
          lastError: error.message || 'Failed to sync blockchain data',
          lastResult: null,
        }));
      } else if (data) {
        const result = data as IndexingStatus['lastResult'];
        
        if (result?.success === false) {
          console.warn('[onchain-history] Index returned error:', result.error);
          setIndexingStatus(prev => ({
            ...prev,
            isIndexing: false,
            lastIndexedAt: new Date(),
            lastError: result.error || null,
            lastResult: result,
          }));
        } else {
          setIndexingStatus(prev => ({
            ...prev,
            isIndexing: false,
            lastIndexedAt: new Date(),
            lastError: null,
            lastResult: result,
          }));
          
          // Refetch transactions if new ones were created
          if (result?.created && result.created > 0) {
            console.log(`[onchain-history] Indexed ${result.created} new transactions, refetching...`);
            await refetch();
          }
        }
      }
    } catch (err: any) {
      clearTimeout(indexTimeout);
      console.error('[onchain-history] Index failed:', err);
      setIndexingStatus(prev => ({
        ...prev,
        isIndexing: false,
        lastError: err.message || 'Network error. Please check your connection.',
      }));
    } finally {
      indexingRef.current = false;
    }
  }, [user, refetch]);

  // Index on mount (debounced)
  useEffect(() => {
    if (!user) return;

    // Small delay to avoid multiple rapid calls
    const timer = setTimeout(() => {
      indexTransactions();
    }, 500);

    return () => clearTimeout(timer);
  }, [user?.id]); // Only re-run if user changes

  // Periodic indexing (every 60 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (!indexingRef.current) {
        indexTransactions();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user, indexTransactions]);

  // Real-time subscription for instant updates
  useEffect(() => {
    if (!user) return;

    console.log('[onchain-history] Setting up realtime subscription...');
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
      .subscribe((status) => {
        console.log('[onchain-history] Realtime subscription status:', status);
      });

    return () => {
      console.log('[onchain-history] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    transactions,
    isLoading,
    indexingStatus,
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
