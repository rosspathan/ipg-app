 import { useState, useEffect, useCallback } from 'react';
 import { useQuery, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import BigNumber from 'bignumber.js';
 
 // Configure BigNumber for financial precision
 BigNumber.config({
   DECIMAL_PLACES: 8,
   ROUNDING_MODE: BigNumber.ROUND_DOWN,
 });
 
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
   limit?: number;
 }
 
 export function useTradeHistory(options: UseTradeHistoryOptions = {}) {
   const { symbol, limit = 50 } = options;
   const queryClient = useQueryClient();
   const [userId, setUserId] = useState<string | null>(null);
 
   // Get current user
   useEffect(() => {
     const getUser = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       setUserId(user?.id || null);
     };
     getUser();
   }, []);
 
   // Fetch trade fills (executions)
   const fillsQuery = useQuery({
     queryKey: ['user-trade-fills', userId, symbol, limit],
     queryFn: async () => {
       if (!userId) return [];
 
       // Query trades directly (view may not be available yet)
       const { data: buyTrades, error: buyError } = await supabase
         .from('trades')
         .select('*')
         .eq('buyer_id', userId)
         .order('trade_time', { ascending: false })
         .limit(limit);
 
       const { data: sellTrades, error: sellError } = await supabase
         .from('trades')
         .select('*')
         .eq('seller_id', userId)
         .order('trade_time', { ascending: false })
         .limit(limit);
 
       if (buyError) console.error('Error fetching buy trades:', buyError);
       if (sellError) console.error('Error fetching sell trades:', sellError);
 
       // Combine and transform into user-perspective fills
       const fills: TradeFill[] = [];
       
       (buyTrades || []).forEach(t => {
         if (!symbol || t.symbol === symbol) {
           fills.push({
             trade_id: t.id,
             pair: t.symbol,
             side: 'buy',
             role: 'taker', // Simplified assumption
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
             role: 'maker', // Simplified assumption
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
 
       // Sort by execution time descending
       fills.sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime());
       
       return fills.slice(0, limit);
     },
     enabled: !!userId,
      refetchInterval: 15000,
   });
 
   // Fetch all orders (order history)
   const ordersQuery = useQuery({
     queryKey: ['user-order-history', userId, symbol, limit],
     queryFn: async () => {
       if (!userId) return [];
 
       let query = supabase
         .from('orders')
         .select('*')
         .eq('user_id', userId)
         .order('created_at', { ascending: false })
         .limit(limit);
 
       if (symbol) {
         query = query.eq('symbol', symbol);
       }
 
       const { data, error } = await query;
       if (error) throw error;
 
       return (data || []) as Order[];
     },
     enabled: !!userId,
     refetchInterval: 15000,
   });
 
   // Fetch open orders only
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
 
       if (symbol) {
         query = query.eq('symbol', symbol);
       }
 
       const { data, error } = await query;
       if (error) throw error;
 
       return (data || []) as Order[];
     },
     enabled: !!userId,
     refetchInterval: 10000, // Refresh open orders every 10 seconds
   });
 
   // Fetch funds movements (trading ledger)
   const fundsQuery = useQuery({
     queryKey: ['user-funds-movements', userId, limit],
     queryFn: async () => {
       if (!userId) return [];
 
       const { data, error } = await supabase
         .from('trading_balance_ledger')
         .select('*')
         .eq('user_id', userId)
         .order('created_at', { ascending: false })
         .limit(limit);
 
       if (error) throw error;
 
       return (data || []) as FundsMovement[];
     },
     enabled: !!userId,
     refetchInterval: 10000,
   });
 
   // Calculate stats
   const stats = {
     totalTrades: fillsQuery.data?.length || 0,
     openOrdersCount: openOrdersQuery.data?.length || 0,
     totalVolume: fillsQuery.data?.reduce((sum, f) => 
       new BigNumber(sum).plus(f.total).toNumber(), 0
     ) || 0,
     totalFees: fillsQuery.data?.reduce((sum, f) => 
       new BigNumber(sum).plus(f.fee).toNumber(), 0
     ) || 0,
   };
 
   // Refresh all data
   const refresh = useCallback(() => {
     queryClient.invalidateQueries({ queryKey: ['user-trade-fills'] });
     queryClient.invalidateQueries({ queryKey: ['user-order-history'] });
     queryClient.invalidateQueries({ queryKey: ['user-open-orders'] });
     queryClient.invalidateQueries({ queryKey: ['user-funds-movements'] });
   }, [queryClient]);
 
   // Set up realtime subscription for trades
   useEffect(() => {
     if (!userId) return;
 
     const channel = supabase
       .channel('trades-realtime')
       .on(
         'postgres_changes',
         {
           event: 'INSERT',
           schema: 'public',
           table: 'trades',
         },
         (payload) => {
           const trade = payload.new as any;
           // Only refresh if this trade involves the current user
           if (trade.buyer_id === userId || trade.seller_id === userId) {
             refresh();
           }
         }
       )
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'orders',
           filter: `user_id=eq.${userId}`,
         },
         () => {
           refresh();
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [userId, refresh]);
 
   return {
     fills: fillsQuery.data || [],
     orders: ordersQuery.data || [],
     openOrders: openOrdersQuery.data || [],
     fundsMovements: fundsQuery.data || [],
     isLoadingFills: fillsQuery.isLoading,
     isLoadingOrders: ordersQuery.isLoading,
     isLoadingOpenOrders: openOrdersQuery.isLoading,
     isLoadingFunds: fundsQuery.isLoading,
     stats,
     refresh,
     userId,
   };
 }
 
 /**
  * Hook for cancelling orders with proper balance unlock
  */
 export function useOrderCancel() {
   const queryClient = useQueryClient();
   const [isCancelling, setIsCancelling] = useState(false);
 
   const cancelOrder = async (orderId: string) => {
     setIsCancelling(true);
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session?.access_token) {
         throw new Error('Session expired. Please log in again.');
       }
 
       const { data: result, error } = await supabase.functions.invoke('cancel-order', {
         body: { order_id: orderId },
         headers: {
           Authorization: `Bearer ${session.access_token}`
         }
       });
 
       if (error) {
         let errorMessage = error.message || 'Failed to cancel order';
         if (error.context?.body) {
           try {
             const bodyText = await error.context.body.text?.() || error.context.body;
             const parsed = typeof bodyText === 'string' ? JSON.parse(bodyText) : bodyText;
             if (parsed?.error) {
               errorMessage = parsed.error;
             }
           } catch {
             // Keep original error
           }
         }
         throw new Error(errorMessage);
       }
 
       if (!result?.success) {
         throw new Error(result?.error || 'Failed to cancel order');
       }
 
       toast.success('Order cancelled', {
         description: `${result.unlocked_amount} ${result.unlocked_asset} unlocked`
       });
 
       // Invalidate all relevant queries
       queryClient.invalidateQueries({ queryKey: ['user-open-orders'] });
       queryClient.invalidateQueries({ queryKey: ['user-order-history'] });
       queryClient.invalidateQueries({ queryKey: ['user-trade-fills'] });
       queryClient.invalidateQueries({ queryKey: ['user-funds-movements'] });
       queryClient.invalidateQueries({ queryKey: ['all-open-orders'] });
       queryClient.invalidateQueries({ queryKey: ['user-orders'] });
       queryClient.invalidateQueries({ queryKey: ['user-balance'] });
       queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
 
       return result;
     } catch (error: any) {
       toast.error('Cancel failed', {
         description: error.message,
       });
       throw error;
     } finally {
       setIsCancelling(false);
     }
   };
 
   return { cancelOrder, isCancelling };
 }