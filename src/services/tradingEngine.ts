import { supabase } from '@/integrations/supabase/client';

export interface OrderData {
  user_id: string;
  market_symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop_limit';
  price?: number;
  stop_price?: number;
  quantity: number;
  quote_quantity?: number;
  time_in_force: 'GTC' | 'IOC';
  client_order_id?: string;
}

export interface OrderResult {
  success: boolean;
  order_id?: string;
  filled_quantity?: number;
  average_price?: number;
  trades?: TradeResult[];
  error?: string;
}

export interface TradeResult {
  id: string;
  price: number;
  quantity: number;
  maker_user_id: string;
  taker_user_id: string;
  maker_fee: number;
  taker_fee: number;
  fee_asset: string;
}

class TradingEngine {
  private static instance: TradingEngine;
  
  public static getInstance(): TradingEngine {
    if (!TradingEngine.instance) {
      TradingEngine.instance = new TradingEngine();
    }
    return TradingEngine.instance;
  }

  // Place a new order
  async placeOrder(orderData: OrderData): Promise<OrderResult> {
    try {
      // Validate order data
      const validation = this.validateOrder(orderData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Call the order placement edge function
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: orderData
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        order_id: data.order_id,
        filled_quantity: data.filled_quantity || 0,
        average_price: data.average_price,
        trades: data.trades || []
      };
    } catch (error: any) {
      console.error('Error placing order:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel an existing order
  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-order', {
        body: { order_id: orderId }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      return { success: false, error: error.message };
    }
  }

  // Get market information
  async getMarketInfo(marketSymbol: string) {
    try {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('*')
        .eq('symbol', marketSymbol)
        .eq('active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching market info:', error);
      return null;
    }
  }

  // Get order book for a market
  async getOrderBook(marketSymbol: string, depth: number = 50) {
    try {
      const { data, error } = await supabase.functions.invoke('get-orderbook', {
        body: { market_symbol: marketSymbol, depth }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order book:', error);
      return { bids: [], asks: [] };
    }
  }

  // Get recent trades for a market
  async getRecentTrades(marketSymbol: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('market_symbol', marketSymbol)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      return [];
    }
  }

  // Validate order before placement
  private validateOrder(orderData: OrderData): { valid: boolean; error?: string } {
    // Basic validation
    if (!orderData.market_symbol) {
      return { valid: false, error: 'Market symbol is required' };
    }

    if (!['buy', 'sell'].includes(orderData.side)) {
      return { valid: false, error: 'Invalid order side' };
    }

    if (!['market', 'limit', 'stop_limit'].includes(orderData.type)) {
      return { valid: false, error: 'Invalid order type' };
    }

    if (orderData.quantity <= 0) {
      return { valid: false, error: 'Quantity must be positive' };
    }

    // Limit and stop-limit orders require price
    if ((orderData.type === 'limit' || orderData.type === 'stop_limit') && !orderData.price) {
      return { valid: false, error: 'Price is required for limit orders' };
    }

    // Stop-limit orders require stop price
    if (orderData.type === 'stop_limit' && !orderData.stop_price) {
      return { valid: false, error: 'Stop price is required for stop-limit orders' };
    }

    // Price validation
    if (orderData.price && orderData.price <= 0) {
      return { valid: false, error: 'Price must be positive' };
    }

    if (orderData.stop_price && orderData.stop_price <= 0) {
      return { valid: false, error: 'Stop price must be positive' };
    }

    return { valid: true };
  }

  // Subscribe to market data updates via WebSocket
  subscribeToMarket(marketSymbol: string, callbacks: {
    onOrderBookUpdate?: (orderBook: any) => void;
    onTradeUpdate?: (trade: any) => void;
    onTickerUpdate?: (ticker: any) => void;
  }) {
    const channel = supabase
      .channel(`market-${marketSymbol}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trades',
        filter: `market_symbol=eq.${marketSymbol}`
      }, (payload) => {
        if (callbacks.onTradeUpdate) {
          callbacks.onTradeUpdate(payload);
        }
      })
      .subscribe();

    return channel;
  }

  // Subscribe to user-specific updates
  subscribeToUserUpdates(userId: string, callbacks: {
    onOrderUpdate?: (order: any) => void;
    onBalanceUpdate?: (balance: any) => void;
  }) {
    const orderChannel = supabase
      .channel(`user-orders-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (callbacks.onOrderUpdate) {
          callbacks.onOrderUpdate(payload);
        }
      })
      .subscribe();

    const balanceChannel = supabase
      .channel(`user-balances-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_trading_balances',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (callbacks.onBalanceUpdate) {
          callbacks.onBalanceUpdate(payload);
        }
      })
      .subscribe();

    return { orderChannel, balanceChannel };
  }
}

export const tradingEngine = TradingEngine.getInstance();