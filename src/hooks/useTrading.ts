import { useState, useEffect } from 'react';
import { tradingEngine, OrderData, OrderResult } from '@/services/tradingEngine';
import { useTradingBalances } from './useTradingBalances';
import { useTradingFees } from './useTradingFees';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface PlaceOrderParams {
  market_symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop_limit';
  quantity: number;
  price?: number;
  stop_price?: number;
  time_in_force?: 'GTC' | 'IOC';
}

export const useTrading = (marketSymbol?: string) => {
  const [orderBook, setOrderBook] = useState<{ bids: [number, number][]; asks: [number, number][] }>({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [ticker, setTicker] = useState<{ last_price: number; change_24h: number; volume_24h: number } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { balances, hasBalance, lockBalance, unlockBalance } = useTradingBalances();
  const { getFeePreview } = useTradingFees();
  const { toast } = useToast();

  // Place an order
  const placeOrder = async (params: PlaceOrderParams): Promise<OrderResult> => {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        throw new Error('User not authenticated');
      }

      // Validate balance requirements
      const [baseAsset, quoteAsset] = params.market_symbol.split('/');
      const requiredAsset = params.side === 'buy' ? quoteAsset : baseAsset;
      const requiredAmount = params.side === 'buy' 
        ? (params.type === 'market' ? params.quantity * (ticker?.last_price || 0) * 1.05 : params.quantity * (params.price || 0))
        : params.quantity;

      if (!hasBalance(requiredAsset, requiredAmount)) {
        return {
          success: false,
          error: `Insufficient ${requiredAsset} balance. Required: ${requiredAmount.toFixed(8)}`
        };
      }

      // Prepare order data
      const orderData: OrderData = {
        user_id: userData.user.id,
        market_symbol: params.market_symbol,
        side: params.side,
        type: params.type,
        quantity: params.quantity,
        price: params.price,
        stop_price: params.stop_price,
        time_in_force: params.time_in_force || 'GTC'
      };

      // Place order through trading engine
      const result = await tradingEngine.placeOrder(orderData);

      if (result.success) {
        toast({
          title: "Order Placed",
          description: `${params.side.toUpperCase()} order for ${params.quantity} ${baseAsset} placed successfully`,
        });
      } else {
        toast({
          title: "Order Failed",
          description: result.error || "Failed to place order",
          variant: "destructive",
        });
      }

      return result;
    } catch (error: any) {
      console.error('Error placing order:', error);
      const errorMessage = error.message || 'Failed to place order';
      
      toast({
        title: "Order Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Cancel an order
  const cancelOrder = async (orderId: string): Promise<boolean> => {
    try {
      const result = await tradingEngine.cancelOrder(orderId);
      
      if (result.success) {
        toast({
          title: "Order Cancelled",
          description: "Order cancelled successfully",
        });
        return true;
      } else {
        toast({
          title: "Cancel Failed",
          description: result.error || "Failed to cancel order",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Cancel Failed",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get fee preview for an order
  const getOrderFeePreview = async (
    market_symbol: string,
    amount: number,
    price: number,
    side: 'buy' | 'sell'
  ) => {
    try {
      return await getFeePreview(market_symbol, amount, price, side);
    } catch (error) {
      console.error('Error getting fee preview:', error);
      return { maker_fee: 0, taker_fee: 0, fee_asset: 'USDT' };
    }
  };

  // Load market data
  const loadMarketData = async (market: string) => {
    try {
      // Load order book
      const orderBookData = await tradingEngine.getOrderBook(market);
      setOrderBook(orderBookData);

      // Load recent trades
      const tradesData = await tradingEngine.getRecentTrades(market);
      setRecentTrades(tradesData);

      // Calculate ticker from recent trades if available
      if (tradesData.length > 0) {
        const lastTrade = tradesData[0];
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dayTrades = tradesData.filter(t => new Date(t.created_at) > dayAgo);
        
        const volume24h = dayTrades.reduce((sum, t) => sum + parseFloat(t.total_value || '0'), 0);
        const firstPrice = dayTrades[dayTrades.length - 1]?.price || lastTrade.price;
        const change24h = firstPrice > 0 ? ((lastTrade.price - firstPrice) / firstPrice) * 100 : 0;

        setTicker({
          last_price: lastTrade.price,
          change_24h: change24h,
          volume_24h: volume24h
        });
      }
    } catch (error) {
      console.error('Error loading market data:', error);
    }
  };

  // Subscribe to real-time updates for a market
  useEffect(() => {
    if (!marketSymbol) return;

    loadMarketData(marketSymbol);

    // Subscribe to market updates
    const marketChannel = tradingEngine.subscribeToMarket(marketSymbol, {
      onOrderBookUpdate: (orderBook) => {
        setOrderBook(orderBook);
      },
      onTradeUpdate: (trade) => {
        setRecentTrades(prev => [trade.new, ...prev.slice(0, 49)]);
        // Update ticker with latest trade
        if (trade.new) {
          setTicker(prev => ({
            last_price: trade.new.price,
            change_24h: prev?.change_24h || 0,
            volume_24h: prev?.volume_24h || 0
          }));
        }
      }
    });

    // Subscribe to user updates
    const { data: userData } = supabase.auth.getUser();
    let userChannels: any = null;
    
    userData.then(({ data }) => {
      if (data?.user?.id) {
        userChannels = tradingEngine.subscribeToUserUpdates(data.user.id, {
          onOrderUpdate: () => {
            // Refresh order data handled by useOrderHistory
          },
          onBalanceUpdate: () => {
            // Refresh balance data handled by useTradingBalances
          }
        });
      }
    });

    return () => {
      if (marketChannel) {
        supabase.removeChannel(marketChannel);
      }
      if (userChannels) {
        supabase.removeChannel(userChannels.orderChannel);
        supabase.removeChannel(userChannels.balanceChannel);
      }
    };
  }, [marketSymbol]);

  return {
    // Market data
    orderBook,
    recentTrades,
    ticker,
    
    // User balances
    balances,
    hasBalance,
    
    // Actions
    placeOrder,
    cancelOrder,
    getOrderFeePreview,
    loadMarketData,
    
    // State
    loading
  };
};