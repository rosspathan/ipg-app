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

// Get order book data
async function getOrderBook(symbol: string) {
  const { data, error } = await supabase
    .from('order_book')
    .select('*')
    .eq('symbol', symbol);

  if (error) {
    console.error('Error fetching order book:', error);
    return { bids: [], asks: [] };
  }

  const bids = data
    .filter((order: any) => order.side === 'buy')
    .map((order: any) => [order.price, order.total_quantity])
    .sort((a: any, b: any) => b[0] - a[0])
    .slice(0, 20);

  const asks = data
    .filter((order: any) => order.side === 'sell')
    .map((order: any) => [order.price, order.total_quantity])
    .sort((a: any, b: any) => a[0] - b[0])
    .slice(0, 20);

  return { bids, asks };
}

// Get recent trades
async function getRecentTrades(symbol: string, limit = 50) {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('symbol', symbol)
    .order('trade_time', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }

  return data.map((trade: any) => ({
    id: trade.id,
    price: parseFloat(trade.price),
    quantity: parseFloat(trade.quantity),
    time: trade.trade_time,
    side: trade.buyer_id ? 'buy' : 'sell' // Infer side from buyer presence
  }));
}

// Get ticker data
async function getTicker(symbol: string) {
  const { data, error } = await supabase
    .rpc('get_market_ticker', { market_symbol: symbol });

  if (error || !data || data.length === 0) {
    console.error('Error fetching ticker:', error);
    return {
      symbol,
      lastPrice: 0,
      priceChange24h: 0,
      priceChangePercent24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      count24h: 0
    };
  }

  const ticker = data[0];
  return {
    symbol: ticker.symbol,
    lastPrice: parseFloat(ticker.last_price || 0),
    priceChange24h: parseFloat(ticker.price_change_24h || 0),
    priceChangePercent24h: parseFloat(ticker.price_change_percent_24h || 0),
    high24h: parseFloat(ticker.high_24h || 0),
    low24h: parseFloat(ticker.low_24h || 0),
    volume24h: parseFloat(ticker.volume_24h || 0),
    count24h: parseInt(ticker.count_24h || 0)
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