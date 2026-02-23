import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Razorpay integration is not active. Reject all webhook calls.
  console.warn('[razorpay-webhook] Webhook endpoint disabled - Razorpay integration not configured.');

  return new Response(JSON.stringify({ 
    error: 'Webhook endpoint disabled. Razorpay integration is not active.',
  }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
