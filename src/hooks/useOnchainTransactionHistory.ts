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
  from_address?: string;
  to_address?: string;
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
    warning?: string;
    fallback_reason?: string;
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

const HASH_RE = /^0x[a-fA-F0-9]{64}$/;

const isOnchainHash = (value: string | null | undefined) => !!value && HASH_RE.test(value.trim());

const isStalePending = (status: string | null | undefined, hasRealTxHash: boolean, updatedAt?: string | null) => {
  const s = (status || '').toLowerCase();
  if (hasRealTxHash) return false;
  if (!['pending', 'processing', 'confirming', 'broadcasted', 'sent'].includes(s)) return false;
  if (!updatedAt) return false;

  const ageMs = Date.now() - new Date(updatedAt).getTime();
  return ageMs > 6 * 60 * 60 * 1000; // 6h
};

const normalizeStatus = (
  status: string | null | undefined,
  hasRealTxHash: boolean,
  updatedAt?: string | null
): OnchainTransaction['status'] => {
  const s = (status || '').toLowerCase();

  if (['completed', 'credited', 'success', 'confirmed'].includes(s)) return 'CONFIRMED';
  if (['failed', 'rejected', 'cancelled', 'error'].includes(s)) return 'FAILED';
  if (s === 'dropped') return 'DROPPED';
  if (isStalePending(s, hasRealTxHash, updatedAt)) return 'FAILED';
  if (['processing', 'sent', 'confirming', 'broadcasted'].includes(s)) return 'CONFIRMING';
  return 'PENDING';
};

const normalizeTxHash = (raw: string | null | undefined, fallbackPrefix: string, id: string) => {
  if (isOnchainHash(raw)) return raw!.trim().toLowerCase();
  return `${fallbackPrefix}:${id}`;
};

const withDerivedFromTo = (tx: OnchainTransaction): OnchainTransaction => {
  if (tx.direction === 'SELF') {
    return { ...tx, from_address: tx.wallet_address, to_address: tx.wallet_address };
  }

  if (tx.direction === 'SEND') {
    return { ...tx, from_address: tx.wallet_address, to_address: tx.counterparty_address };
  }

  return { ...tx, from_address: tx.counterparty_address, to_address: tx.wallet_address };
};

const ranking = (tx: OnchainTransaction) => {
  const sourceScore = tx.source === 'ONCHAIN' ? 3 : tx.source === 'INTERNAL' ? 2 : 1;
  const statusScore = tx.status === 'CONFIRMED' ? 3 : tx.status === 'CONFIRMING' ? 2 : tx.status === 'PENDING' ? 1 : 0;
  return sourceScore * 10 + statusScore;
};

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
  const initialIndexDoneRef = useRef<string | null>(null);
  const lastIndexAttemptAtRef = useRef(0);

  const {
    direction = 'all',
    status = 'all',
    tokenSymbol,
    searchHash,
    limit = 100,
  } = options;

  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['onchain-transactions', user?.id, direction, status, tokenSymbol, searchHash, limit],
    queryFn: async () => {
      if (!user) return [];

      const fetchWindow = Math.max(limit * 3, 150);
      console.log('[onchain-history] Fetching transactions from DB...');

      const [
        onchainRes,
        internalRes,
        custodialRes,
        withdrawalsRes,
        profileRes,
        hotWalletRes,
      ] = await Promise.all([
        supabase
          .from('onchain_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(fetchWindow),

        supabase
          .from('internal_balance_transfers')
          .select(`
            id, user_id, direction, amount, status, tx_hash, created_at, updated_at,
            assets (symbol, name, logo_url, contract_address, decimals)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(fetchWindow),

        supabase
          .from('custodial_withdrawals')
          .select(`
            id, user_id, amount, status, tx_hash, to_address, error_message, created_at, updated_at,
            assets (symbol, name, logo_url, contract_address, decimals)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(fetchWindow),

        supabase
          .from('withdrawals')
          .select(`
            id, user_id, amount, status, tx_hash, to_address, network, created_at, updated_at,
            assets (symbol, name, logo_url, contract_address, decimals)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(fetchWindow),

        supabase
          .from('profiles')
          .select('wallet_address, bsc_wallet_address, wallet_addresses')
          .eq('user_id', user.id)
          .maybeSingle(),

        supabase
          .from('platform_hot_wallet')
          .select('address')
          .eq('is_active', true)
          .eq('chain', 'BSC')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (onchainRes.error) {
        console.error('[onchain-history] Query error:', onchainRes.error);
        throw onchainRes.error;
      }

      const userWallet = (
        profileRes.data?.bsc_wallet_address ||
        (profileRes.data as any)?.wallet_addresses?.['bsc-mainnet'] ||
        (profileRes.data as any)?.wallet_addresses?.['bsc'] ||
        profileRes.data?.wallet_address ||
        ''
      ).toLowerCase();

      const hotWallet = (hotWalletRes.data?.address || '').toLowerCase();

      const onchainRows = ((onchainRes.data || []) as OnchainTransaction[]).map(withDerivedFromTo);

      const internalRows = ((internalRes.data || []) as any[])
        .filter((row) => {
          // Keep to_trading events and only keep to_wallet when a real on-chain hash exists.
          // This removes placeholder internal rows that were causing duplicate/stale pending history entries.
          if (row.direction === 'to_trading') return true;
          if (row.direction === 'to_wallet') return isOnchainHash(row.tx_hash);
          return false;
        })
        .map((row) => {
          const directionMapped: OnchainTransaction['direction'] = row.direction === 'to_trading' ? 'SEND' : 'RECEIVE';
          const realHash = isOnchainHash(row.tx_hash);
          const txHash = normalizeTxHash(row.tx_hash, 'internal_transfer', row.id);
          const txStatus = normalizeStatus(row.status, realHash, row.updated_at || row.created_at);
          const asset = row.assets || {};

          const mapped: OnchainTransaction = {
            id: `internal-${row.id}`,
            user_id: row.user_id,
            wallet_address: userWallet || '',
            chain_id: 56,
            token_contract: asset.contract_address || '0x0000000000000000000000000000000000000000',
            token_symbol: asset.symbol || 'UNKNOWN',
            token_name: asset.name || asset.symbol || null,
            token_decimals: asset.decimals ?? 18,
            token_logo_url: asset.logo_url || null,
            direction: directionMapped,
            counterparty_address: hotWallet || '',
            amount_raw: String(row.amount ?? 0),
            amount_formatted: Number(row.amount || 0),
            status: txStatus,
            confirmations: txStatus === 'CONFIRMED' ? 12 : 0,
            required_confirmations: 12,
            block_number: null,
            tx_hash: txHash,
            log_index: null,
            gas_fee_wei: null,
            gas_fee_formatted: null,
            nonce: null,
            source: 'INTERNAL',
            error_message: null,
            created_at: row.created_at,
            updated_at: row.updated_at || row.created_at,
            confirmed_at: txStatus === 'CONFIRMED' ? (row.updated_at || row.created_at) : null,
          };

          return withDerivedFromTo(mapped);
        });

      const custodialRows = ((custodialRes.data || []) as any[]).map((row) => {
        const realHash = isOnchainHash(row.tx_hash);
        const txHash = normalizeTxHash(row.tx_hash, 'custodial_withdrawal', row.id);
        const txStatus = normalizeStatus(row.status, realHash, row.updated_at || row.created_at);
        const asset = row.assets || {};

        const mapped: OnchainTransaction = {
          id: `custodial-${row.id}`,
          user_id: row.user_id,
          wallet_address: (row.to_address || userWallet || '').toLowerCase(),
          chain_id: 56,
          token_contract: asset.contract_address || '0x0000000000000000000000000000000000000000',
          token_symbol: asset.symbol || 'UNKNOWN',
          token_name: asset.name || asset.symbol || null,
          token_decimals: asset.decimals ?? 18,
          token_logo_url: asset.logo_url || null,
          direction: 'RECEIVE',
          counterparty_address: hotWallet || '',
          amount_raw: String(row.amount ?? 0),
          amount_formatted: Number(row.amount || 0),
          status: txStatus,
          confirmations: txStatus === 'CONFIRMED' ? 12 : 0,
          required_confirmations: 12,
          block_number: null,
          tx_hash: txHash,
          log_index: null,
          gas_fee_wei: null,
          gas_fee_formatted: null,
          nonce: null,
          source: 'INTERNAL',
          error_message: row.error_message || null,
          created_at: row.created_at,
          updated_at: row.updated_at || row.created_at,
          confirmed_at: txStatus === 'CONFIRMED' ? (row.updated_at || row.created_at) : null,
        };

        return withDerivedFromTo(mapped);
      });

      const withdrawalRows = ((withdrawalsRes.data || []) as any[]).map((row) => {
        const realHash = isOnchainHash(row.tx_hash);
        const txHash = normalizeTxHash(row.tx_hash, 'withdrawal', row.id);
        const txStatus = normalizeStatus(row.status, realHash, row.updated_at || row.created_at);
        const asset = row.assets || {};

        const mapped: OnchainTransaction = {
          id: `withdrawal-${row.id}`,
          user_id: row.user_id,
          wallet_address: (row.to_address || userWallet || '').toLowerCase(),
          chain_id: String(row.network || '').toLowerCase().includes('bep20') ? 56 : 56,
          token_contract: asset.contract_address || '0x0000000000000000000000000000000000000000',
          token_symbol: asset.symbol || 'UNKNOWN',
          token_name: asset.name || asset.symbol || null,
          token_decimals: asset.decimals ?? 18,
          token_logo_url: asset.logo_url || null,
          direction: 'RECEIVE',
          counterparty_address: hotWallet || '',
          amount_raw: String(row.amount ?? 0),
          amount_formatted: Number(row.amount || 0),
          status: txStatus,
          confirmations: txStatus === 'CONFIRMED' ? 12 : 0,
          required_confirmations: 12,
          block_number: null,
          tx_hash: txHash,
          log_index: null,
          gas_fee_wei: null,
          gas_fee_formatted: null,
          nonce: null,
          source: 'INTERNAL',
          error_message: null,
          created_at: row.created_at,
          updated_at: row.updated_at || row.created_at,
          confirmed_at: txStatus === 'CONFIRMED' ? (row.updated_at || row.created_at) : null,
        };

        return withDerivedFromTo(mapped);
      });

      const merged = [...onchainRows, ...internalRows, ...custodialRows, ...withdrawalRows];

      const deduped = new Map<string, OnchainTransaction>();
      for (const tx of merged) {
        const txHashKey = tx.tx_hash.toLowerCase();
        const dedupeKey = isOnchainHash(tx.tx_hash)
          ? [
              txHashKey,
              String(tx.log_index ?? 0),
              tx.token_contract?.toLowerCase?.() || '',
              (tx.from_address || '').toLowerCase(),
              (tx.to_address || '').toLowerCase(),
              tx.direction,
            ].join('|')
          : `${tx.source}|${tx.id}`;

        const existing = deduped.get(dedupeKey);
        if (!existing || ranking(tx) > ranking(existing)) {
          deduped.set(dedupeKey, tx);
        }
      }

      let result = Array.from(deduped.values());

      if (direction !== 'all') {
        result = result.filter((tx) => tx.direction === direction);
      }

      if (status !== 'all') {
        if (status === 'PENDING') {
          result = result.filter((tx) => tx.status === 'PENDING' || tx.status === 'CONFIRMING');
        } else if (status === 'FAILED') {
          result = result.filter((tx) => tx.status === 'FAILED' || tx.status === 'DROPPED');
        } else {
          result = result.filter((tx) => tx.status === 'CONFIRMED');
        }
      }

      if (tokenSymbol) {
        const tokenLower = tokenSymbol.toLowerCase();
        result = result.filter((tx) => tx.token_symbol.toLowerCase() === tokenLower);
      }

      if (searchHash) {
        const hashLower = searchHash.toLowerCase();
        result = result.filter((tx) => tx.tx_hash.toLowerCase().includes(hashLower));
      }

      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      result = result.slice(0, limit);

      console.log(`[onchain-history] Loaded ${result.length} unified transactions`);
      return result;
    },
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const indexTransactions = useCallback(async (forceRefresh = false) => {
    if (!user || indexingRef.current) {
      console.log('[onchain-history] Skipping index: no user or already indexing');
      return;
    }

    const now = Date.now();
    if (!forceRefresh && now - lastIndexAttemptAtRef.current < 30_000) {
      console.log('[onchain-history] Skipping index: throttled');
      return;
    }
    lastIndexAttemptAtRef.current = now;

    indexingRef.current = true;
    setIndexingStatus((prev) => ({ ...prev, isIndexing: true, lastError: null }));

    let didTimeout = false;
    const indexTimeout = setTimeout(() => {
      didTimeout = true;
      console.warn('[onchain-history] Index timed out after 10 seconds');
      setIndexingStatus((prev) => ({
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
        setIndexingStatus((prev) => ({
          ...prev,
          isIndexing: false,
          lastError: 'Not authenticated. Please log in again.',
        }));
        return;
      }

      console.log('[onchain-history] Calling index-bep20-history edge function...');
      const startTime = Date.now();

      const { data, error } = await supabase.functions.invoke('index-bep20-history', {
        body: { lookbackHours: 720, forceRefresh },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      clearTimeout(indexTimeout);
      const duration = Date.now() - startTime;
      console.log(`[onchain-history] Index response in ${duration}ms:`, data);

      if (didTimeout) return;

      if (error) {
        const msg = error.message || 'Failed to sync blockchain data';
        const blockingError = msg.includes('WORKER_LIMIT') || msg.includes('546') || transactions.length === 0;
        const userMsg = msg.includes('WORKER_LIMIT') || msg.includes('546')
          ? 'Server is busy (worker limit). Please wait 30 seconds and retry.'
          : msg;

        console.error('[onchain-history] Index function error:', error);
        setIndexingStatus((prev) => ({
          ...prev,
          isIndexing: false,
          lastError: blockingError ? userMsg : null,
          lastResult: {
            success: false,
            indexed: 0,
            created: 0,
            error: msg,
            error_code: msg.includes('WORKER_LIMIT') ? 'WORKER_LIMIT' : 'FUNCTION_ERROR',
            duration_ms: duration,
            warning: blockingError ? undefined : 'Sync provider temporarily unavailable; showing existing history.',
          },
        }));
        return;
      }

      if (data) {
        const result = data as IndexingStatus['lastResult'];
        const errorCode = (result as any)?.error_code || '';
        const isBlocking = ['NO_WALLET_ADDRESS', 'UNAUTHORIZED', 'INVALID_TOKEN', 'SERVER_ERROR', 'MISSING_SERVICE_KEY', 'DB_ERROR'].includes(errorCode);

        setIndexingStatus((prev) => ({
          ...prev,
          isIndexing: false,
          lastIndexedAt: new Date(),
          lastError: isBlocking ? ((result as any)?.error ?? null) : null,
          lastResult: result,
        }));

        await refetch();
      }
    } catch (err: any) {
      clearTimeout(indexTimeout);
      if (didTimeout) return;

      console.error('[onchain-history] Index failed:', err);
      setIndexingStatus((prev) => ({
        ...prev,
        isIndexing: false,
        lastError: transactions.length === 0 ? (err?.message || 'Network error. Please check your connection.') : null,
        lastResult: {
          success: false,
          indexed: 0,
          created: 0,
          error_code: 'NETWORK_ERROR',
          error: err?.message || 'Network error',
          warning: transactions.length > 0 ? 'Network issue during sync; showing cached history.' : undefined,
        },
      }));
    } finally {
      clearTimeout(indexTimeout);
      indexingRef.current = false;
    }
  }, [user, refetch, transactions.length]);

  // StrictMode-safe initial index: first effect pass is cleaned up; second pass executes timer.
  useEffect(() => {
    if (!user?.id) return;
    if (initialIndexDoneRef.current === user.id) return;

    const timer = window.setTimeout(() => {
      indexTransactions(false);
      initialIndexDoneRef.current = user.id;
    }, 500);

    return () => window.clearTimeout(timer);
  }, [user?.id, indexTransactions]);

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
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[onchain-history] Realtime update:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['onchain-transactions'] });
        }
      )
      .subscribe((subStatus) => {
        console.log('[onchain-history] Realtime subscription status:', subStatus);
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
    indexTransactions,
  };
}

export function useOnchainTokens() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['onchain-tokens', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const [onchainRes, internalRes, custodialRes, withdrawalsRes] = await Promise.all([
        supabase
          .from('onchain_transactions')
          .select('token_symbol, token_logo_url')
          .eq('user_id', user.id),
        supabase
          .from('internal_balance_transfers')
          .select('assets(symbol, logo_url)')
          .eq('user_id', user.id)
          .limit(200),
        supabase
          .from('custodial_withdrawals')
          .select('assets(symbol, logo_url)')
          .eq('user_id', user.id)
          .limit(200),
        supabase
          .from('withdrawals')
          .select('assets(symbol, logo_url)')
          .eq('user_id', user.id)
          .limit(200),
      ]);

      if (onchainRes.error) throw onchainRes.error;

      const tokenMap = new Map<string, string | null>();

      (onchainRes.data || []).forEach((t: any) => {
        if (t?.token_symbol && !tokenMap.has(t.token_symbol)) {
          tokenMap.set(t.token_symbol, t.token_logo_url || null);
        }
      });

      [...(internalRes.data || []), ...(custodialRes.data || []), ...(withdrawalsRes.data || [])].forEach((row: any) => {
        const symbol = row?.assets?.symbol;
        const logo = row?.assets?.logo_url || null;
        if (symbol && !tokenMap.has(symbol)) {
          tokenMap.set(symbol, logo);
        }
      });

      return Array.from(tokenMap.entries()).map(([symbol, logo]) => ({
        symbol,
        logo_url: logo,
      }));
    },
    enabled: !!user,
  });
}
