import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BigNumber from 'bignumber.js';

BigNumber.config({ DECIMAL_PLACES: 8, ROUNDING_MODE: BigNumber.ROUND_DOWN });

export interface TradeFill {
  trade_id: string;
  pair: string;
  side: 'buy' | 'sell';
  role: 'maker' | 'taker';
  price: number;
  amount: number;
  total: number;
  fee: number;
  fee_asset: string;
  order_id: string;
  executed_at: string;
  created_at: string;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: string;
  amount: number;
  price: number | null;
  status: string;
  filled_amount: number;
  remaining_amount: number;
  average_price: number | null;
  fees_paid: number;
  fee_asset: string | null;
  locked_amount: number | null;
  locked_asset_symbol: string | null;
  created_at: string;
  updated_at: string;
  filled_at: string | null;
  cancelled_at: string | null;
}

export interface FundsMovement {
  id: string;
  asset_symbol: string;
  delta_available: number;
  delta_locked: number;
  entry_type: string;
  reference_type: string;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

interface UseTradeHistoryOptions {
  symbol?: string;
  pageSize?: number;
}

const PAGE_SIZE = 20;

export function useTradeHistory(options: UseTradeHistoryOptions = {}) {
  const { symbol, pageSize = PAGE_SIZE } = options;
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  // Pagination state per tab
  const [ordersPage, setOrdersPage] = useState(0);
  const [fillsPage, setFillsPage] = useState(0);
  const [fundsPage, setFundsPage] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Reset pages when symbol changes
  useEffect(() => {
    setOrdersPage(0);
    setFillsPage(0);
    setFundsPage(0);
  }, [symbol]);

  // Fetch trade fills with pagination
  const fillsQuery = useQuery({
    queryKey: ['user-trade-fills', userId, symbol, fillsPage, pageSize],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };

      // We need to fetch from both buyer and seller perspectives
      // For accurate pagination, we use a combined approach
      const limit = pageSize;
      const offset = fillsPage * pageSize;

      const { data: buyTrades, error: buyError } = await supabase
        .from('trades')
        .select('*', { count: 'exact' })
        .eq('buyer_id', userId)
        .order('trade_time', { ascending: false });

      const { data: sellTrades, error: sellError } = await supabase
        .from('trades')
        .select('*', { count: 'exact' })
        .eq('seller_id', userId)
        .order('trade_time', { ascending: false });

      if (buyError) console.error('Error fetching buy trades:', buyError);
      if (sellError) console.error('Error fetching sell trades:', sellError);

      const fills: TradeFill[] = [];

      (buyTrades || []).forEach(t => {
        if (!symbol || t.symbol === symbol) {
          fills.push({
            trade_id: t.id,
            pair: t.symbol,
            side: 'buy',
            role: 'taker',
            price: Number(t.price),
            amount: Number(t.quantity),
            total: Number(t.total_value),
            fee: Number(t.buyer_fee),
            fee_asset: t.fee_asset || 'USDI',
            order_id: t.buy_order_id,
            executed_at: t.trade_time,
            created_at: t.created_at,
          });
        }
      });

      (sellTrades || []).forEach(t => {
        if (!symbol || t.symbol === symbol) {
          fills.push({
            trade_id: t.id,
            pair: t.symbol,
            side: 'sell',
            role: 'maker',
            price: Number(t.price),
            amount: Number(t.quantity),
            total: Number(t.total_value),
            fee: Number(t.seller_fee),
            fee_asset: t.fee_asset || 'USDI',
            order_id: t.sell_order_id,
            executed_at: t.trade_time,
            created_at: t.created_at,
          });
        }
      });

      fills.sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime());

      const total = fills.length;
      const paginated = fills.slice(offset, offset + limit);

      return { data: paginated, total };
    },
    enabled: !!userId,
    refetchInterval: 15000,
  });

  // Fetch order history with pagination
  const ordersQuery = useQuery({
    queryKey: ['user-order-history', userId, symbol, ordersPage, pageSize],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };

      let countQuery = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (symbol) countQuery = countQuery.eq('symbol', symbol);

      const { count } = await countQuery;

      let query = supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(ordersPage * pageSize, (ordersPage + 1) * pageSize - 1);

      if (symbol) query = query.eq('symbol', symbol);

      const { data, error } = await query;
      if (error) throw error;

      return { data: (data || []) as Order[], total: count || 0 };
    },
    enabled: !!userId,
    refetchInterval: 15000,
  });

  // Fetch open orders (no pagination needed - always show all)
  const openOrdersQuery = useQuery({
    queryKey: ['user-open-orders', userId, symbol],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'open', 'partially_filled'])
        .order('created_at', { ascending: false });

      if (symbol) query = query.eq('symbol', symbol);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Order[];
    },
    enabled: !!userId,
    refetchInterval: 10000,
  });

  // Fetch funds movements with pagination
  const fundsQuery = useQuery({
    queryKey: ['user-funds-movements', userId, fundsPage, pageSize],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };

      const { count } = await supabase
        .from('trading_balance_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { data, error } = await supabase
        .from('trading_balance_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(fundsPage * pageSize, (fundsPage + 1) * pageSize - 1);

      if (error) throw error;
      return { data: (data || []) as FundsMovement[], total: count || 0 };
    },
    enabled: !!userId,
    refetchInterval: 10000,
  });

  const stats = {
    totalTrades: fillsQuery.data?.total || 0,
    openOrdersCount: openOrdersQuery.data?.length || 0,
    totalVolume: fillsQuery.data?.data?.reduce((sum, f) =>
      new BigNumber(sum).plus(f.total).toNumber(), 0
    ) || 0,
    totalFees: fillsQuery.data?.data?.reduce((sum, f) =>
      new BigNumber(sum).plus(f.fee).toNumber(), 0
    ) || 0,
  };

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user-trade-fills'] });
    queryClient.invalidateQueries({ queryKey: ['user-order-history'] });
    queryClient.invalidateQueries({ queryKey: ['user-open-orders'] });
    queryClient.invalidateQueries({ queryKey: ['user-funds-movements'] });
  }, [queryClient]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('trades-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades' }, (payload) => {
        const trade = payload.new as any;
        if (trade.buyer_id === userId || trade.seller_id === userId) refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, () => {
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refresh]);

  const ordersTotalPages = Math.max(1, Math.ceil((ordersQuery.data?.total || 0) / pageSize));
  const fillsTotalPages = Math.max(1, Math.ceil((fillsQuery.data?.total || 0) / pageSize));
  const fundsTotalPages = Math.max(1, Math.ceil((fundsQuery.data?.total || 0) / pageSize));

  return {
    fills: fillsQuery.data?.data || [],
    fillsTotal: fillsQuery.data?.total || 0,
    fillsPage,
    fillsTotalPages,
    setFillsPage,

    orders: ordersQuery.data?.data || [],
    ordersTotal: ordersQuery.data?.total || 0,
    ordersPage,
    ordersTotalPages,
    setOrdersPage,

    openOrders: openOrdersQuery.data || [],

    fundsMovements: fundsQuery.data?.data || [],
    fundsTotal: fundsQuery.data?.total || 0,
    fundsPage,
    fundsTotalPages,
    setFundsPage,

    isLoadingFills: fillsQuery.isLoading,
    isLoadingOrders: ordersQuery.isLoading,
    isLoadingOpenOrders: openOrdersQuery.isLoading,
    isLoadingFunds: fundsQuery.isLoading,
    stats,
    refresh,
    userId,
  };
}

export function useOrderCancel() {
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);

  const cancelOrder = async (orderId: string) => {
    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expired. Please log in again.');

      const { data: result, error } = await supabase.functions.invoke('cancel-order', {
        body: { order_id: orderId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        let errorMessage = error.message || 'Failed to cancel order';
        if (error.context?.body) {
          try {
            const bodyText = await error.context.body.text?.() || error.context.body;
            const parsed = typeof bodyText === 'string' ? JSON.parse(bodyText) : bodyText;
            if (parsed?.error) errorMessage = parsed.error;
          } catch { }
        }
        throw new Error(errorMessage);
      }

      if (!result?.success) throw new Error(result?.error || 'Failed to cancel order');

      toast.success('Order cancelled', { description: `${result.unlocked_amount} ${result.unlocked_asset} unlocked` });

      ['user-open-orders', 'user-order-history', 'user-trade-fills', 'user-funds-movements',
       'all-open-orders', 'user-orders', 'user-balance', 'trading-balances'].forEach(k =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
      return result;
    } catch (error: any) {
      toast.error('Cancel failed', { description: error.message });
      throw error;
    } finally {
      setIsCancelling(false);
    }
  };

  return { cancelOrder, isCancelling };
}
