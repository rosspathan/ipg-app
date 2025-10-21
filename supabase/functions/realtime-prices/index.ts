import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Binance WebSocket streams
const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';

interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Upgrade to WebSocket
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let binanceWs: WebSocket | null = null;
  const subscribedSymbols = new Set<string>();

  socket.onopen = () => {
    console.log('[RealTime Prices] Client connected');
    socket.send(JSON.stringify({ type: 'connected', message: 'Real-time price feed ready' }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('[RealTime Prices] Received:', message);

      if (message.type === 'subscribe' && message.symbols) {
        // Subscribe to Binance streams for multiple symbols
        const symbols = message.symbols as string[];
        
        // Convert to Binance format (e.g., BTC/USDT -> btcusdt)
        const binanceSymbols = symbols.map(s => 
          s.replace('/', '').toLowerCase()
        );

        // Create combined stream endpoint
        const streams = binanceSymbols.map(s => `${s}@ticker`).join('/');
        const wsUrl = `${BINANCE_WS_BASE}/${streams}`;

        console.log('[RealTime Prices] Connecting to:', wsUrl);

        // Close existing connection if any
        if (binanceWs) {
          binanceWs.close();
        }

        // Connect to Binance WebSocket
        binanceWs = new WebSocket(wsUrl);

        binanceWs.onopen = () => {
          console.log('[RealTime Prices] Connected to Binance');
          socket.send(JSON.stringify({
            type: 'subscribed',
            symbols: symbols
          }));
        };

        binanceWs.onmessage = (binanceEvent) => {
          try {
            const data = JSON.parse(binanceEvent.data);
            
            // Handle both single and stream data formats
            const tickerData = data.data || data;
            
            if (tickerData.e === '24hrTicker') {
              // Convert Binance ticker to our format
              const symbol = tickerData.s.toUpperCase().replace(/USDT$/, '/USDT');
              
              const priceUpdate: PriceUpdate = {
                symbol,
                price: parseFloat(tickerData.c),
                change24h: parseFloat(tickerData.p),
                volume24h: parseFloat(tickerData.v),
                high24h: parseFloat(tickerData.h),
                low24h: parseFloat(tickerData.l)
              };

              socket.send(JSON.stringify({
                type: 'price_update',
                data: priceUpdate
              }));
            }
          } catch (error) {
            console.error('[RealTime Prices] Parse error:', error);
          }
        };

        binanceWs.onerror = (error) => {
          console.error('[RealTime Prices] Binance WS error:', error);
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Binance connection error'
          }));
        };

        binanceWs.onclose = () => {
          console.log('[RealTime Prices] Binance disconnected');
          socket.send(JSON.stringify({
            type: 'disconnected',
            message: 'Price feed disconnected'
          }));
        };

        symbols.forEach(s => subscribedSymbols.add(s));
      }

      if (message.type === 'unsubscribe') {
        if (binanceWs) {
          binanceWs.close();
          binanceWs = null;
        }
        subscribedSymbols.clear();
        socket.send(JSON.stringify({ type: 'unsubscribed' }));
      }

      if (message.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('[RealTime Prices] Message error:', error);
    }
  };

  socket.onclose = () => {
    console.log('[RealTime Prices] Client disconnected');
    if (binanceWs) {
      binanceWs.close();
    }
  };

  socket.onerror = (error) => {
    console.error('[RealTime Prices] Socket error:', error);
  };

  return response;
});