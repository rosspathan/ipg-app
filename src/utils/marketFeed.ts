interface MarketTicker {
  symbol: string;
  lastPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  openPrice: number;
  timestamp: number;
}

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface MarketOrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

interface MarketTrade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

type MarketDataCallback = {
  onTicker?: (ticker: MarketTicker) => void;
  onOrderBook?: (orderBook: MarketOrderBook) => void;
  onTrade?: (trade: MarketTrade) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
};

class BinanceWebSocketClient {
  private connections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: MarketDataCallback = {};
  
  private readonly BASE_URL = 'wss://stream.binance.com:9443/ws/';
  private readonly RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Progressive backoff
  
  // Symbol mapping for our internal pairs to Binance format
  private readonly SYMBOL_MAP: Record<string, string> = {
    'BTC/USDT': 'btcusdt',
    'ETH/USDT': 'ethusdt', 
    'BNB/USDT': 'bnbusdt',
    'ADA/USDT': 'adausdt',
    'SOL/USDT': 'solusdt',
    'MATIC/USDT': 'maticusdt',
    'DOT/USDT': 'dotusdt',
    'AVAX/USDT': 'avaxusdt'
  };

  constructor(callbacks: MarketDataCallback = {}) {
    this.callbacks = callbacks;
  }

  private mapSymbolToBinance(symbol: string): string {
    return this.SYMBOL_MAP[symbol] || symbol.toLowerCase().replace('/', '');
  }

  private mapSymbolFromBinance(binanceSymbol: string): string {
    const entry = Object.entries(this.SYMBOL_MAP).find(([_, value]) => value === binanceSymbol);
    return entry ? entry[0] : binanceSymbol.toUpperCase();
  }

  private getConnectionKey(symbol: string): string {
    return this.mapSymbolToBinance(symbol);
  }

  private createWebSocketUrl(symbol: string): string {
    const binanceSymbol = this.mapSymbolToBinance(symbol);
    const streams = [
      `${binanceSymbol}@ticker`,
      `${binanceSymbol}@depth20@100ms`,
      `${binanceSymbol}@trade`
    ];
    return `${this.BASE_URL}${streams.join('/')}`;
  }

  private setupHeartbeat(connectionKey: string, ws: WebSocket) {
    // Clear existing interval
    if (this.heartbeatIntervals.has(connectionKey)) {
      clearInterval(this.heartbeatIntervals.get(connectionKey)!);
    }

    // Binance streams send data regularly, so we just monitor for silence
    let lastMessageTime = Date.now();
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastMessageTime > 30000) { // 30 second timeout
        console.warn(`No data received for ${connectionKey} in 30 seconds, reconnecting...`);
        this.reconnect(connectionKey);
      }
    }, 5000);

    this.heartbeatIntervals.set(connectionKey, interval);

    // Update last message time on any message
    const originalOnMessage = ws.onmessage;
    ws.onmessage = (event) => {
      lastMessageTime = Date.now();
      if (originalOnMessage) {
        originalOnMessage.call(ws, event);
      }
    };
  }

  private reconnect(connectionKey: string, attempt: number = 0) {
    if (this.reconnectTimeouts.has(connectionKey)) {
      clearTimeout(this.reconnectTimeouts.get(connectionKey)!);
    }

    const delay = this.RECONNECT_DELAYS[Math.min(attempt, this.RECONNECT_DELAYS.length - 1)];
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

    console.log(`Reconnecting ${connectionKey} in ${delay + jitter}ms (attempt ${attempt + 1})`);

    const timeout = setTimeout(() => {
      const symbol = this.mapSymbolFromBinance(connectionKey);
      const subscriptions = this.subscriptions.get(connectionKey);
      
      if (subscriptions && subscriptions.size > 0) {
        this.connectToSymbol(symbol, attempt + 1);
      }
    }, delay + jitter);

    this.reconnectTimeouts.set(connectionKey, timeout);
  }

  private handleMessage(connectionKey: string, event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const symbol = this.mapSymbolFromBinance(connectionKey);

      if (data.stream) {
        const [streamSymbol, streamType] = data.stream.split('@');
        
        switch (true) {
          case streamType === 'ticker':
            this.handleTickerUpdate(symbol, data.data);
            break;
          case streamType.startsWith('depth'):
            this.handleOrderBookUpdate(symbol, data.data);
            break;
          case streamType === 'trade':
            this.handleTradeUpdate(symbol, data.data);
            break;
        }
      } else {
        // Single stream format
        if (data.e === '24hrTicker') {
          this.handleTickerUpdate(symbol, data);
        } else if (data.e === 'depthUpdate' || data.lastUpdateId !== undefined) {
          this.handleOrderBookUpdate(symbol, data);
        } else if (data.e === 'trade') {
          this.handleTradeUpdate(symbol, data);
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.callbacks.onError?.(`Failed to parse market data: ${error}`);
    }
  }

  private handleTickerUpdate(symbol: string, data: any) {
    const ticker: MarketTicker = {
      symbol,
      lastPrice: parseFloat(data.c || data.lastPrice),
      priceChange24h: parseFloat(data.P || data.priceChange),
      priceChangePercent24h: parseFloat(data.P || data.priceChangePercent),
      high24h: parseFloat(data.h || data.highPrice),
      low24h: parseFloat(data.l || data.lowPrice),
      volume24h: parseFloat(data.v || data.volume),
      openPrice: parseFloat(data.o || data.openPrice),
      timestamp: parseInt(data.E || data.closeTime) || Date.now()
    };

    this.callbacks.onTicker?.(ticker);
  }

  private handleOrderBookUpdate(symbol: string, data: any) {
    const orderBook: MarketOrderBook = {
      symbol,
      bids: (data.bids || data.b || []).slice(0, 20).map((bid: [string, string]) => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1])
      })),
      asks: (data.asks || data.a || []).slice(0, 20).map((ask: [string, string]) => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1])
      })),
      timestamp: parseInt(data.E || data.lastUpdateId) || Date.now()
    };

    this.callbacks.onOrderBook?.(orderBook);
  }

  private handleTradeUpdate(symbol: string, data: any) {
    const trade: MarketTrade = {
      id: (data.t || data.tradeId || Date.now()).toString(),
      symbol,
      price: parseFloat(data.p || data.price),
      quantity: parseFloat(data.q || data.quantity),
      side: data.m === false ? 'buy' : 'sell', // Binance: m = true means buyer is market maker (sell)
      timestamp: parseInt(data.T || data.tradeTime) || Date.now()
    };

    this.callbacks.onTrade?.(trade);
  }

  private connectToSymbol(symbol: string, reconnectAttempt: number = 0) {
    const connectionKey = this.getConnectionKey(symbol);
    
    // Close existing connection
    if (this.connections.has(connectionKey)) {
      this.connections.get(connectionKey)?.close();
    }

    try {
      const ws = new WebSocket(this.createWebSocketUrl(symbol));

      ws.onopen = () => {
        console.log(`WebSocket connected for ${symbol} (${connectionKey})`);
        this.callbacks.onConnectionChange?.(true);
        
        // Clear reconnect timeout on successful connection
        if (this.reconnectTimeouts.has(connectionKey)) {
          clearTimeout(this.reconnectTimeouts.get(connectionKey)!);
          this.reconnectTimeouts.delete(connectionKey);
        }
      };

      ws.onmessage = (event) => this.handleMessage(connectionKey, event);

      ws.onclose = (event) => {
        console.log(`WebSocket closed for ${symbol}: ${event.code} ${event.reason}`);
        this.callbacks.onConnectionChange?.(false);
        
        // Only reconnect if we still have subscriptions for this symbol
        if (this.subscriptions.get(connectionKey)?.size) {
          this.reconnect(connectionKey, reconnectAttempt);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${symbol}:`, error);
        this.callbacks.onError?.(`Connection error for ${symbol}`);
      };

      this.connections.set(connectionKey, ws);
      this.setupHeartbeat(connectionKey, ws);

    } catch (error) {
      console.error(`Failed to connect to ${symbol}:`, error);
      this.callbacks.onError?.(`Failed to connect to ${symbol}: ${error}`);
      this.reconnect(connectionKey, reconnectAttempt);
    }
  }

  subscribe(symbol: string) {
    const connectionKey = this.getConnectionKey(symbol);
    
    if (!this.subscriptions.has(connectionKey)) {
      this.subscriptions.set(connectionKey, new Set());
    }
    
    this.subscriptions.get(connectionKey)!.add(symbol);
    
    // Connect if not already connected
    if (!this.connections.has(connectionKey) || 
        this.connections.get(connectionKey)?.readyState !== WebSocket.OPEN) {
      this.connectToSymbol(symbol);
    }
  }

  unsubscribe(symbol: string) {
    const connectionKey = this.getConnectionKey(symbol);
    
    if (this.subscriptions.has(connectionKey)) {
      this.subscriptions.get(connectionKey)!.delete(symbol);
      
      // If no more subscriptions, close connection
      if (this.subscriptions.get(connectionKey)!.size === 0) {
        this.connections.get(connectionKey)?.close();
        this.connections.delete(connectionKey);
        this.subscriptions.delete(connectionKey);
        
        // Clear timeouts
        if (this.reconnectTimeouts.has(connectionKey)) {
          clearTimeout(this.reconnectTimeouts.get(connectionKey)!);
          this.reconnectTimeouts.delete(connectionKey);
        }
        if (this.heartbeatIntervals.has(connectionKey)) {
          clearInterval(this.heartbeatIntervals.get(connectionKey)!);
          this.heartbeatIntervals.delete(connectionKey);
        }
      }
    }
  }

  isConnected(symbol?: string): boolean {
    if (!symbol) {
      return Array.from(this.connections.values()).some(ws => ws.readyState === WebSocket.OPEN);
    }
    
    const connectionKey = this.getConnectionKey(symbol);
    const ws = this.connections.get(connectionKey);
    return ws?.readyState === WebSocket.OPEN || false;
  }

  disconnect() {
    // Close all connections
    this.connections.forEach(ws => ws.close());
    this.connections.clear();
    this.subscriptions.clear();
    
    // Clear all timeouts and intervals
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
    
    this.heartbeatIntervals.forEach(interval => clearInterval(interval));
    this.heartbeatIntervals.clear();
  }

  // Get connection status for diagnostics
  getConnectionStatus() {
    const status: Record<string, any> = {};
    
    this.subscriptions.forEach((symbols, connectionKey) => {
      const ws = this.connections.get(connectionKey);
      status[connectionKey] = {
        connected: ws?.readyState === WebSocket.OPEN,
        subscriptions: Array.from(symbols),
        readyState: ws?.readyState,
        url: ws?.url
      };
    });
    
    return status;
  }
}

export { BinanceWebSocketClient, type MarketTicker, type MarketOrderBook, type MarketTrade, type MarketDataCallback };