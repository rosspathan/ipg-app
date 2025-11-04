import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * PLACEHOLDER STUB for Razorpay order creation
 * 
 * Future implementation will:
 * - Create Razorpay order using RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * - Generate order_id and return to frontend
 * - Record pending deposit in database
 * - Handle minimum/maximum deposit limits
 * - Implement rate limiting per user
 */

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

    const { amount, currency = 'INR', receiptId } = await req.json();

    console.log('[razorpay-create-order] STUB: Would create order for user:', user.id);
    console.log('[razorpay-create-order] STUB: Amount:', amount, currency);

    // TODO: Call Razorpay API to create order
    // const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    // const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    // const orderResponse = await createRazorpayOrder(amount, currency, receiptId);

    // STUB: Return fake order data
    const stubOrderId = `order_stub_${Date.now()}`;

    // TODO: Record pending deposit
    // await supabaseClient.from('fiat_deposits').insert({
    //   user_id: user.id,
    //   amount,
    //   currency,
    //   razorpay_order_id: orderResponse.id,
    //   status: 'pending'
    // });

    return new Response(JSON.stringify({ 
      success: true,
      orderId: stubOrderId,
      amount,
      currency,
      message: 'Order creation stub - manual deposit required',
      stub: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[razorpay-create-order] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
