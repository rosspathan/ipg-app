import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebSocketClient {
  socket: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
}

const clients = new Map<string, WebSocketClient>();
let supabase: any;

// Initialize Supabase client
function initSupabase() {
  supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// Broadcast to subscribed clients
function broadcast(channel: string, data: any) {
  const message = JSON.stringify({
    channel,
    data,
    timestamp: Date.now()
  });

  clients.forEach((client) => {
    if (client.subscriptions.has(channel) && client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(message);
      } catch (error) {
        console.error('Error sending to client:', error);
      }
    }
  });
}

// Get order book data from the order_book view
async function getOrderBook(symbol: string) {
  console.log(`[OrderBook] Fetching order book for ${symbol}`);
  
  const { data, error } = await supabase
    .from('order_book')
    .select('*')
    .eq('symbol', symbol);

  if (error) {
    console.error('[OrderBook] Error fetching order book:', error);
    return { bids: [], asks: [] };
  }

  console.log(`[OrderBook] Got ${data?.length || 0} price levels for ${symbol}`);

  const bids = (data || [])
    .filter((order: any) => order.side === 'buy')
    .map((order: any) => ({
      price: parseFloat(order.price),
      quantity: parseFloat(order.total_quantity),
      orderCount: parseInt(order.order_count)
    }))
    .sort((a: any, b: any) => b.price - a.price)
    .slice(0, 20);

  const asks = (data || [])
    .filter((order: any) => order.side === 'sell')
    .map((order: any) => ({
      price: parseFloat(order.price),
      quantity: parseFloat(order.total_quantity),
      orderCount: parseInt(order.order_count)
    }))
    .sort((a: any, b: any) => a.price - b.price)
    .slice(0, 20);

  console.log(`[OrderBook] ${symbol}: ${bids.length} bids, ${asks.length} asks`);
  return { bids, asks };
}

// Get recent trades
async function getRecentTrades(symbol: string, limit = 50) {
  console.log(`[Trades] Fetching recent trades for ${symbol}`);
  
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('symbol', symbol)
    .order('trade_time', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Trades] Error fetching trades:', error);
    return [];
  }

  console.log(`[Trades] Got ${data?.length || 0} trades for ${symbol}`);

  return (data || []).map((trade: any) => ({
    id: trade.id,
    price: parseFloat(trade.price),
    quantity: parseFloat(trade.quantity),
    time: trade.trade_time,
    side: trade.taker_side || (trade.buyer_id ? 'buy' : 'sell')
  }));
}

// Get ticker data from market_prices table
async function getTicker(symbol: string) {
  // Read from market_prices table instead of broken RPC
  const { data, error } = await supabase
    .from('market_prices')
    .select('symbol, current_price, price_change_24h, price_change_percentage_24h, high_24h, low_24h, volume_24h')
    .eq('symbol', symbol)
    .maybeSingle();

  if (error) {
    console.warn(`[Ticker] Failed to fetch for ${symbol}:`, error.message);
  }

  return {
    symbol,
    lastPrice: parseFloat(data?.current_price || 0),
    priceChange24h: parseFloat(data?.price_change_24h || 0),
    priceChangePercent24h: parseFloat(data?.price_change_percentage_24h || 0),
    high24h: parseFloat(data?.high_24h || 0),
    low24h: parseFloat(data?.low_24h || 0),
    volume24h: parseFloat(data?.volume_24h || 0),
    count24h: 0
  };
}

// Handle client messages
async function handleMessage(clientId: string, message: string) {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    const msg = JSON.parse(message);
    
    switch (msg.type) {
      case 'subscribe':
        const channel = msg.channel;
        client.subscriptions.add(channel);
        console.log(`Client ${clientId} subscribed to ${channel}`);

        // Send initial data based on channel type
        if (channel.startsWith('orderbook:')) {
          const symbol = channel.split(':')[1];
          const orderBook = await getOrderBook(symbol);
          client.socket.send(JSON.stringify({
            channel,
            data: orderBook,
            timestamp: Date.now()
          }));
        } else if (channel.startsWith('trades:')) {
          const symbol = channel.split(':')[1];
          const trades = await getRecentTrades(symbol);
          client.socket.send(JSON.stringify({
            channel,
            data: trades,
            timestamp: Date.now()
          }));
        } else if (channel.startsWith('ticker:')) {
          const symbol = channel.split(':')[1];
          const ticker = await getTicker(symbol);
          client.socket.send(JSON.stringify({
            channel,
            data: ticker,
            timestamp: Date.now()
          }));
        }
        break;

      case 'unsubscribe':
        client.subscriptions.delete(msg.channel);
        console.log(`Client ${clientId} unsubscribed from ${msg.channel}`);
        break;

      case 'ping':
        client.socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

// Set up real-time subscriptions
function setupRealtimeSubscriptions() {
  // Subscribe to order changes
  supabase
    .channel('orders-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders'
    }, (payload: any) => {
      console.log('Order change:', payload);
      
      const symbol = payload.new?.symbol || payload.old?.symbol;
      if (symbol) {
        // Broadcast to orderbook subscribers
        setTimeout(async () => {
          const orderBook = await getOrderBook(symbol);
          broadcast(`orderbook:${symbol}`, orderBook);
        }, 100); // Small delay to ensure DB consistency
      }

      // Broadcast to user channels
      const userId = payload.new?.user_id || payload.old?.user_id;
      if (userId) {
        broadcast(`user:${userId}`, {
          type: 'order_update',
          order: payload.new || payload.old,
          event: payload.eventType
        });
      }
    })
    .subscribe();

  // Subscribe to trade changes
  supabase
    .channel('trades-channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'trades'
    }, (payload: any) => {
      console.log('New trade:', payload);
      
      const trade = payload.new;
      const symbol = trade.symbol;

      // Broadcast new trade
      broadcast(`trades:${symbol}`, {
        id: trade.id,
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.quantity),
        time: trade.trade_time,
        side: trade.buyer_id ? 'buy' : 'sell'
      });

      // Update ticker data
      setTimeout(async () => {
        const ticker = await getTicker(symbol);
        broadcast(`ticker:${symbol}`, ticker);
      }, 100);

      // Broadcast to user channels
      broadcast(`user:${trade.buyer_id}`, {
        type: 'trade_update',
        trade: trade
      });
      broadcast(`user:${trade.seller_id}`, {
        type: 'trade_update',
        trade: trade
      });
    })
    .subscribe();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders
    });
  }

  // Initialize Supabase if not already done
  if (!supabase) {
    initSupabase();
    setupRealtimeSubscriptions();
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientId = crypto.randomUUID();
  
  // Store client connection
  clients.set(clientId, {
    socket,
    subscriptions: new Set()
  });

  socket.onopen = () => {
    console.log(`WebSocket client ${clientId} connected`);
    socket.send(JSON.stringify({ 
      type: 'connected', 
      clientId,
      timestamp: Date.now() 
    }));
  };

  socket.onmessage = (event) => {
    handleMessage(clientId, event.data);
  };

  socket.onclose = () => {
    console.log(`WebSocket client ${clientId} disconnected`);
    clients.delete(clientId);
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);
  };

  return response;
});