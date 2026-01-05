/**
 * Admin Reset Circuit Breaker
 * Allows admins to reset the circuit breaker to re-enable trading
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body for force reset option
    let forceReset = false;
    try {
      const body = await req.json();
      forceReset = body?.force === true;
    } catch {
      // No body or invalid JSON, continue normally
    }

    // Allow force reset from service role (for testing/deployment)
    if (forceReset) {
      console.log('[Circuit Breaker] Force reset requested');
    } else {
      // Get the authorization header to verify admin
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: 'No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user from token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is admin using the has_role function
      const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (roleError || !isAdmin) {
        console.log('[Circuit Breaker] User', user.id, 'is not admin');
        return new Response(
          JSON.stringify({ success: false, error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Circuit Breaker] Admin', user.id, 'resetting circuit breaker');
    }

    // Reset the circuit breaker
    const { error: updateError } = await supabase
      .from('trading_engine_settings')
      .update({ 
        circuit_breaker_active: false,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (updateError) {
      console.error('[Circuit Breaker] Error resetting:', updateError);
      throw updateError;
    }

    console.log('[Circuit Breaker] Successfully reset', forceReset ? '(force)' : `by admin`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Circuit breaker reset - trading is now enabled' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Circuit Breaker] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
