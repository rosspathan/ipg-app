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
  const hasInitialIndexAttemptRef = useRef(false);
  const lastIndexAttemptAtRef = useRef(0);
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

    // Throttle to avoid hammering the edge function (prevents WORKER_LIMIT)
    const now = Date.now();
    if (!forceRefresh && now - lastIndexAttemptAtRef.current < 30_000) {
      console.log('[onchain-history] Skipping index: throttled');
      return;
    }
    lastIndexAttemptAtRef.current = now;

    indexingRef.current = true;
    setIndexingStatus(prev => ({ ...prev, isIndexing: true, lastError: null }));

    // Hard cap UI loading at 10 seconds (requirement)
    let didTimeout = false;
    const indexTimeout = setTimeout(() => {
      didTimeout = true;
      console.warn('[onchain-history] Index timed out after 10 seconds');
      setIndexingStatus(prev => ({
        ...prev,
        isIndexing: false,
        lastError: 'Request timed out. Please try again.',
        lastResult: {
          success: false,
          indexed: 0,
          created: 0,
          error_code: 'TIMEOUT',
          error: 'Request timed out',
        },
      }));
      indexingRef.current = false;
    }, 10_000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
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

      // If we already timed out on the client, don't overwrite UI state with a late response.
      if (didTimeout) return;

      if (error) {
        const msg = error.message || 'Failed to sync blockchain data';
        const userMsg = msg.includes('WORKER_LIMIT') || msg.includes('546')
          ? 'Server is busy (worker limit). Please wait 30 seconds and retry.'
          : msg;

        console.error('[onchain-history] Index function error:', error);
        setIndexingStatus(prev => ({
          ...prev,
          isIndexing: false,
          lastError: userMsg,
          lastResult: {
            success: false,
            indexed: 0,
            created: 0,
            error: msg,
            error_code: msg.includes('WORKER_LIMIT') ? 'WORKER_LIMIT' : 'FUNCTION_ERROR',
            duration_ms: duration,
          },
        }));
        return;
      }

      if (data) {
        const result = data as IndexingStatus['lastResult'];
        setIndexingStatus(prev => ({
          ...prev,
          isIndexing: false,
          lastIndexedAt: new Date(),
          lastError: (result as any)?.success === false ? (result as any)?.error ?? null : null,
          lastResult: result,
        }));

        // Always refetch after an index attempt so UI updates immediately.
        await refetch();
      }
    } catch (err: any) {
      clearTimeout(indexTimeout);
      if (didTimeout) return;

      console.error('[onchain-history] Index failed:', err);
      setIndexingStatus(prev => ({
        ...prev,
        isIndexing: false,
        lastError: err?.message || 'Network error. Please check your connection.',
        lastResult: {
          success: false,
          indexed: 0,
          created: 0,
          error_code: 'NETWORK_ERROR',
          error: err?.message || 'Network error',
        },
      }));
    } finally {
      clearTimeout(indexTimeout);
      indexingRef.current = false;
    }
  }, [user, refetch]);

  // Index on mount (debounced) — guarded for StrictMode/dev double-invoke
  useEffect(() => {
    if (!user) return;
    if (hasInitialIndexAttemptRef.current) return;
    hasInitialIndexAttemptRef.current = true;

    const timer = setTimeout(() => {
      indexTransactions(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [user?.id, indexTransactions]);

  // NOTE: Removed periodic edge-function indexing to avoid WORKER_LIMIT.
  // Users can always pull-to-refresh / tap Refresh to resync.

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
