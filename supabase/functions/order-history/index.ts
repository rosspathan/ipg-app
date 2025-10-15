import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'orders'; // 'orders' or 'trades'
    const symbol = url.searchParams.get('symbol');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log('[order-history] Request:', { user_id: user.id, type, symbol, status, limit, offset });

    if (type === 'orders') {
      // Fetch user orders
      let query = supabaseClient
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: orders, error: ordersError, count } = await query;

      if (ordersError) {
        throw ordersError;
      }

      console.log('[order-history] Found orders:', orders?.length || 0);

      return new Response(
        JSON.stringify({
          success: true,
          orders: orders || [],
          count: count || 0,
          limit,
          offset,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (type === 'trades') {
      // Fetch user trades
      let query = supabaseClient
        .from('trades')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data: trades, error: tradesError, count } = await query;

      if (tradesError) {
        throw tradesError;
      }

      console.log('[order-history] Found trades:', trades?.length || 0);

      // Add user-specific context to trades
      const tradesWithContext = trades?.map(trade => ({
        ...trade,
        side: trade.buyer_id === user.id ? 'buy' : 'sell',
        is_buyer: trade.buyer_id === user.id,
        is_seller: trade.seller_id === user.id,
      })) || [];

      return new Response(
        JSON.stringify({
          success: true,
          trades: tradesWithContext,
          count: count || 0,
          limit,
          offset,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Invalid type. Must be "orders" or "trades"');
    }

  } catch (error) {
    console.error('[order-history] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
