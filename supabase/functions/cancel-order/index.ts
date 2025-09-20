import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { order_id, client_order_id } = await req.json();

    if (!order_id && !client_order_id) {
      return new Response(JSON.stringify({ 
        error: 'Either order_id or client_order_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create service role client for database operations
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the order
    let orderQuery = serviceSupabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id);

    if (order_id) {
      orderQuery = orderQuery.eq('id', order_id);
    } else {
      orderQuery = orderQuery.eq('client_order_id', client_order_id);
    }

    const { data: order, error: orderError } = await orderQuery.single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ 
        error: 'Order not found or not authorized to cancel' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if order can be cancelled
    if (!['open', 'partially_filled'].includes(order.status)) {
      return new Response(JSON.stringify({ 
        error: `Cannot cancel order with status: ${order.status}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cancel the order
    const { data: cancelledOrder, error: cancelError } = await serviceSupabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .select()
      .single();

    if (cancelError) {
      console.error('Order cancellation error:', cancelError);
      return new Response(JSON.stringify({ 
        error: 'Failed to cancel order',
        details: cancelError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log the order cancellation
    console.log(`Order cancelled: ${order.id} - ${order.side} ${order.quantity} ${order.symbol}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Order cancelled successfully',
      order: {
        id: cancelledOrder.id,
        symbol: cancelledOrder.symbol,
        side: cancelledOrder.side,
        type: cancelledOrder.type,
        quantity: parseFloat(cancelledOrder.quantity),
        price: cancelledOrder.price ? parseFloat(cancelledOrder.price) : null,
        status: cancelledOrder.status,
        filled_quantity: parseFloat(cancelledOrder.filled_quantity),
        remaining_quantity: parseFloat(cancelledOrder.remaining_quantity),
        cancelled_at: cancelledOrder.cancelled_at,
        client_order_id: cancelledOrder.client_order_id
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});