import { useState, useEffect, useRef, useCallback } from 'react';

interface OrderBookData {
  bids: [number, number][];
  asks: [number, number][];
}

interface TradeData {
  id: string;
  price: number;
  quantity: number;
  time: string;
  side: 'buy' | 'sell';
}

interface TickerData {
  symbol: string;
  lastPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  count24h: number;
}

interface UserUpdate {
  type: 'order_update' | 'trade_update';
  order?: any;
  trade?: any;
  event?: string;
}

export const useTradingWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [orderBook, setOrderBook] = useState<Record<string, OrderBookData>>({});
  const [trades, setTrades] = useState<Record<string, TradeData[]>>({});
  const [ticker, setTicker] = useState<Record<string, TickerData>>({});
  const [userUpdates, setUserUpdates] = useState<UserUpdate[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptions = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    try {
      const wsUrl = `wss://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/trading-websocket`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Resubscribe to all channels
        subscriptions.current.forEach(channel => {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            channel
          }));
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'connected') {
            console.log('WebSocket connection confirmed:', message.clientId);
            return;
          }

          if (message.type === 'pong') {
            return;
          }

          const { channel, data } = message;

          if (channel.startsWith('orderbook:')) {
            const symbol = channel.split(':')[1];
            setOrderBook(prev => ({
              ...prev,
              [symbol]: data
            }));
          } else if (channel.startsWith('trades:')) {
            const symbol = channel.split(':')[1];
            if (Array.isArray(data)) {
              // Initial trades data
              setTrades(prev => ({
                ...prev,
                [symbol]: data
              }));
            } else {
              // Single trade update
              setTrades(prev => ({
                ...prev,
                [symbol]: [data, ...(prev[symbol] || [])].slice(0, 50)
              }));
            }
          } else if (channel.startsWith('ticker:')) {
            const symbol = channel.split(':')[1];
            setTicker(prev => ({
              ...prev,
              [symbol]: data
            }));
          } else if (channel.startsWith('user:')) {
            setUserUpdates(prev => [data, ...prev.slice(0, 99)]);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((channel: string) => {
    subscriptions.current.add(channel);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channel
      }));
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    subscriptions.current.delete(channel);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel
      }));
    }
  }, []);

  const subscribeToSymbol = useCallback((symbol: string) => {
    subscribe(`orderbook:${symbol}`);
    subscribe(`trades:${symbol}`);
    subscribe(`ticker:${symbol}`);
  }, [subscribe]);

  const unsubscribeFromSymbol = useCallback((symbol: string) => {
    unsubscribe(`orderbook:${symbol}`);
    unsubscribe(`trades:${symbol}`);
    unsubscribe(`ticker:${symbol}`);
  }, [unsubscribe]);

  const subscribeToUserUpdates = useCallback((userId: string) => {
    subscribe(`user:${userId}`);
  }, [subscribe]);

  // Ping-pong for connection health
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, []);

  // Initialize connection
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    orderBook,
    trades,
    ticker,
    userUpdates,
    subscribe,
    unsubscribe,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    subscribeToUserUpdates,
    connect,
    disconnect
  };
};