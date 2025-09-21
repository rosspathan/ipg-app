import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { BinanceWebSocketClient, type MarketTicker, type MarketOrderBook, type MarketTrade } from '@/utils/marketFeed';

interface MarketState {
  // Connection status
  isConnected: boolean;
  connectionError: string | null;
  
  // Market data by symbol
  tickers: Record<string, MarketTicker>;
  orderBooks: Record<string, MarketOrderBook>;
  trades: Record<string, MarketTrade[]>;
  
  // Current subscriptions
  subscriptions: Set<string>;
  
  // WebSocket client instance
  client: BinanceWebSocketClient | null;
  
  // Actions
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  setConnectionStatus: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  updateTicker: (ticker: MarketTicker) => void;
  updateOrderBook: (orderBook: MarketOrderBook) => void;
  addTrade: (trade: MarketTrade) => void;
  clearMarketData: (symbol?: string) => void;
  disconnect: () => void;
}

// Create debounced update functions to prevent excessive re-renders
let tickerUpdateTimeout: NodeJS.Timeout | null = null;
let orderBookUpdateTimeout: NodeJS.Timeout | null = null;

export const useMarketStore = create<MarketState>()(
  subscribeWithSelector((set, get) => ({
    isConnected: false,
    connectionError: null,
    tickers: {},
    orderBooks: {},
    trades: {},
    subscriptions: new Set(),
    client: null,

    subscribe: (symbol: string) => {
      const state = get();
      
      // Initialize client if not exists
      if (!state.client) {
        const client = new BinanceWebSocketClient({
          onTicker: (ticker) => {
            // Debounce ticker updates to ~10fps
            if (tickerUpdateTimeout) clearTimeout(tickerUpdateTimeout);
            tickerUpdateTimeout = setTimeout(() => {
              get().updateTicker(ticker);
            }, 100);
          },
          onOrderBook: (orderBook) => {
            // Debounce order book updates to ~10fps
            if (orderBookUpdateTimeout) clearTimeout(orderBookUpdateTimeout);
            orderBookUpdateTimeout = setTimeout(() => {
              get().updateOrderBook(orderBook);
            }, 100);
          },
          onTrade: (trade) => {
            // Trades are less frequent, no need to debounce
            get().addTrade(trade);
          },
          onConnectionChange: (connected) => {
            get().setConnectionStatus(connected);
            // Clear error on successful connection
            if (connected) {
              get().setConnectionError(null);
            }
          },
          onError: (error) => {
            console.error('Market feed error:', error);
            get().setConnectionError(error);
            get().setConnectionStatus(false);
          }
        });

        set({ client });
      }

      const client = get().client!;
      
      // Add to subscriptions
      const newSubscriptions = new Set(state.subscriptions);
      newSubscriptions.add(symbol);
      
      set({ subscriptions: newSubscriptions });
      
      // Subscribe via WebSocket
      client.subscribe(symbol);
      
      console.log(`Subscribed to market data for ${symbol}`);
    },

    unsubscribe: (symbol: string) => {
      const state = get();
      
      if (state.client) {
        state.client.unsubscribe(symbol);
      }
      
      // Remove from subscriptions
      const newSubscriptions = new Set(state.subscriptions);
      newSubscriptions.delete(symbol);
      
      set({ subscriptions: newSubscriptions });
      
      console.log(`Unsubscribed from market data for ${symbol}`);
    },

    setConnectionStatus: (connected: boolean) => {
      set({ 
        isConnected: connected,
        connectionError: connected ? null : get().connectionError
      });
    },

    setConnectionError: (error: string | null) => {
      set({ connectionError: error });
    },

    updateTicker: (ticker: MarketTicker) => {
      set((state) => ({
        tickers: {
          ...state.tickers,
          [ticker.symbol]: ticker
        }
      }));
    },

    updateOrderBook: (orderBook: MarketOrderBook) => {
      set((state) => ({
        orderBooks: {
          ...state.orderBooks,
          [orderBook.symbol]: orderBook
        }
      }));
    },

    addTrade: (trade: MarketTrade) => {
      set((state) => {
        const existingTrades = state.trades[trade.symbol] || [];
        const newTrades = [trade, ...existingTrades].slice(0, 100); // Keep last 100 trades
        
        return {
          trades: {
            ...state.trades,
            [trade.symbol]: newTrades
          }
        };
      });
    },

    clearMarketData: (symbol?: string) => {
      if (symbol) {
        set((state) => {
          const newTickers = { ...state.tickers };
          const newOrderBooks = { ...state.orderBooks };
          const newTrades = { ...state.trades };
          
          delete newTickers[symbol];
          delete newOrderBooks[symbol];
          delete newTrades[symbol];
          
          return {
            tickers: newTickers,
            orderBooks: newOrderBooks,
            trades: newTrades
          };
        });
      } else {
        set({
          tickers: {},
          orderBooks: {},
          trades: {}
        });
      }
    },

    disconnect: () => {
      const state = get();
      
      if (state.client) {
        state.client.disconnect();
      }
      
      // Clear timeouts
      if (tickerUpdateTimeout) {
        clearTimeout(tickerUpdateTimeout);
        tickerUpdateTimeout = null;
      }
      if (orderBookUpdateTimeout) {
        clearTimeout(orderBookUpdateTimeout);
        orderBookUpdateTimeout = null;
      }
      
      set({
        client: null,
        isConnected: false,
        connectionError: null,
        subscriptions: new Set(),
        tickers: {},
        orderBooks: {},
        trades: {}
      });
    }
  }))
);

// Selectors for easy access to market data
export const useMarketTicker = (symbol: string) => 
  useMarketStore((state) => state.tickers[symbol]);

export const useMarketOrderBook = (symbol: string) => 
  useMarketStore((state) => state.orderBooks[symbol]);

export const useMarketTrades = (symbol: string) => 
  useMarketStore((state) => state.trades[symbol] || []);

export const useMarketConnection = () => 
  useMarketStore((state) => ({ 
    isConnected: state.isConnected, 
    error: state.connectionError 
  }));

// Hook for diagnostics
export const useMarketDiagnostics = () => {
  const client = useMarketStore((state) => state.client);
  const subscriptions = useMarketStore((state) => state.subscriptions);
  
  return {
    connectionStatus: client?.getConnectionStatus() || {},
    subscriptions: Array.from(subscriptions),
    isClientInitialized: !!client
  };
};