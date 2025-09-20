import { useState, useEffect } from 'react';
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

export interface OrderResult {
  success: boolean;
  order_id?: string;
  error?: string;
}

export const useTradingSimple = (marketSymbol?: string) => {
  const [loading, setLoading] = useState(false);
  const [balances] = useState([
    { asset_symbol: 'USDT', available: 1000, locked: 0, total: 1000 },
    { asset_symbol: 'BTC', available: 0.1, locked: 0, total: 0.1 },
    { asset_symbol: 'ETH', available: 1.5, locked: 0, total: 1.5 }
  ]);
  
  const { toast } = useToast();

  // Mock order book data
  const [orderBook] = useState({
    bids: [[45000, 0.5], [44999, 1.2], [44998, 0.8]] as [number, number][],
    asks: [[45001, 0.3], [45002, 0.7], [45003, 1.1]] as [number, number][]
  });

  // Mock recent trades
  const [recentTrades] = useState([
    { id: '1', price: 45000, quantity: 0.1, created_at: new Date().toISOString() },
    { id: '2', price: 44999, quantity: 0.05, created_at: new Date().toISOString() }
  ]);

  // Mock ticker data
  const [ticker] = useState({
    last_price: 45000,
    change_24h: 2.5,
    volume_24h: 1250000
  });

  const hasBalance = (symbol: string, amount: number): boolean => {
    const balance = balances.find(b => b.asset_symbol === symbol);
    return balance ? balance.available >= amount : false;
  };

  const placeOrder = async (params: PlaceOrderParams): Promise<OrderResult> => {
    setLoading(true);
    try {
      // Simulate order placement
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        throw new Error('User not authenticated');
      }

      // Check balance requirements
      const [baseAsset, quoteAsset] = params.market_symbol.split('/');
      const requiredAsset = params.side === 'buy' ? quoteAsset : baseAsset;
      const requiredAmount = params.side === 'buy' 
        ? params.quantity * (params.price || ticker.last_price)
        : params.quantity;

      if (!hasBalance(requiredAsset, requiredAmount)) {
        return {
          success: false,
          error: `Insufficient ${requiredAsset} balance. Required: ${requiredAmount.toFixed(8)}`
        };
      }

      // Create order in existing orders table (fallback)
      try {
        const { data, error } = await supabase
          .from('orders')
          .insert([{
            user_id: userData.user.id,
            symbol: params.market_symbol,
            side: params.side,
            order_type: params.type,
            amount: params.quantity,
            price: params.price,
            status: 'pending',
            trading_type: 'spot',
            filled_amount: 0,
            remaining_amount: params.quantity,
            fees_paid: 0,
            fee_asset: 'USDT'
          }])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Order Placed",
          description: `${params.side.toUpperCase()} order for ${params.quantity} ${baseAsset} placed successfully`,
        });

        return {
          success: true,
          order_id: data?.id
        };
      } catch (dbError) {
        console.warn('Database insertion failed, order simulated:', dbError);
        
        toast({
          title: "Order Simulated",
          description: `${params.side.toUpperCase()} order simulated (database not ready)`,
        });

        return {
          success: true,
          order_id: 'simulated-' + Date.now()
        };
      }
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

  const cancelOrder = async (orderId: string): Promise<boolean> => {
    try {
      toast({
        title: "Order Cancelled",
        description: "Order cancelled successfully (simulated)",
      });
      return true;
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

  const getOrderFeePreview = async (
    market_symbol: string,
    amount: number,
    price: number,
    side: 'buy' | 'sell'
  ) => {
    // Simple fee calculation: 0.1% maker, 0.15% taker
    const tradeValue = amount * price;
    const maker_fee = tradeValue * 0.001; // 0.1%
    const taker_fee = tradeValue * 0.0015; // 0.15%
    
    return {
      maker_fee,
      taker_fee,
      fee_asset: 'USDT'
    };
  };

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
    
    // State
    loading
  };
};