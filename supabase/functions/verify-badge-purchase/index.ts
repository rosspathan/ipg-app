import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import BigNumber from 'https://esm.sh/bignumber.js@9.1.2';

// Configure BigNumber for financial calculations
BigNumber.config({
  DECIMAL_PLACES: 8,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
  EXPONENTIAL_AT: [-20, 20],
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgePurchaseRequest {
  user_id: string;
  badge_name: string;
  cost: number;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] ============= VERIFY-BADGE-PURCHASE INVOKED =============`);
  console.log(`🚀 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`🚀 [${requestId}] Method: ${req.method}`);
  console.log(`🚀 [${requestId}] Headers:`, Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`🚀 [${requestId}] CORS preflight - returning immediately`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTH: Validate JWT and derive user_id from token ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', purchased: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      console.error(`❌ [${requestId}] Auth failed:`, authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', purchased: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawBody = await req.text();
    console.log(`📥 [${requestId}] Raw request body:`, rawBody);
    
    const { badge_name, cost }: BadgePurchaseRequest = JSON.parse(rawBody);
    
    // SECURITY: Always use authenticated user's ID, never trust client-supplied user_id
    const user_id = authUser.id;

    console.log(`🎖️ [${requestId}] Parsed request:`, { user_id, badge_name, cost_from_client: cost });
    console.log(`🎖️ [${requestId}] Request received at: ${Date.now() - startTime}ms`);

    // ==========================================
    // STEP 1: Fetch badge configuration (SERVER IS AUTHORITATIVE)
    // ==========================================
    const { data: badgeConfig, error: badgeError } = await supabase
      .from('badge_thresholds')
      .select('*')
      .eq('badge_name', badge_name)
      .eq('is_active', true)
      .maybeSingle();

    if (badgeError || !badgeConfig) {
      console.error('❌ Badge validation failed:', badgeError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid badge tier',
          purchased: false 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SERVER-AUTHORITATIVE: Use badge_thresholds.bsk_threshold as source of truth
    const targetBadgeThreshold = new BigNumber(badgeConfig.bsk_threshold);
    console.log('📊 Target badge threshold from DB:', targetBadgeThreshold.toString());

    // ==========================================
    // STEP 2: Check if user already has a badge & calculate upgrade pricing
    // ==========================================
    const { data: existingBadge, error: existingError } = await supabase
      .from('user_badge_holdings')
      .select('current_badge, purchased_at, price_bsk')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingError) {
      console.error('❌ Error checking existing badge:', existingError);
    }

    if (existingBadge?.current_badge === badge_name) {
      console.warn('⚠️ User already owns this badge');
      return new Response(
        JSON.stringify({ 
          error: 'You already own this badge',
          purchased: false 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SERVER-AUTHORITATIVE: Calculate actual cost based on DB thresholds
    let actualCost: number;
    const isUpgrade = !!existingBadge?.current_badge;
    
    if (isUpgrade && existingBadge.price_bsk) {
      // For upgrades, fetch previous badge threshold
      const { data: previousBadgeConfig } = await supabase
        .from('badge_thresholds')
        .select('bsk_threshold')
        .eq('badge_name', existingBadge.current_badge)
        .eq('is_active', true)
        .maybeSingle();

      const previousThreshold = new BigNumber(previousBadgeConfig?.bsk_threshold || existingBadge.price_bsk);
      const differential = targetBadgeThreshold.minus(previousThreshold);
      
      if (differential.lte(0)) {
        return new Response(
          JSON.stringify({ 
            error: 'Cannot downgrade to a lower tier badge',
            purchased: false 
          }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      actualCost = differential.toNumber();
      console.log(`🔄 Upgrade: ${existingBadge.current_badge} → ${badge_name}`);
      console.log(`💰 SERVER CALCULATED: ${previousThreshold.toString()} → ${targetBadgeThreshold.toString()} = ${actualCost} BSK`);
    } else {
      // New purchase: full threshold amount
      actualCost = targetBadgeThreshold.toNumber();
      console.log(`💰 New purchase: ${actualCost} BSK (from DB threshold)`);
    }

    // Sanity check: warn if client sent wrong cost
    if (cost !== actualCost && cost !== targetBadgeThreshold.toNumber()) {
      console.warn(`⚠️ Client cost mismatch: client=${cost}, server=${actualCost}`);
    }

    // ==========================================
    // STEP 3: Verify WITHDRAWABLE balance only (Option A)
    // ==========================================
    const { data: balance, error: balanceError } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance, holding_balance')
      .eq('user_id', user_id)
      .single();

    if (balanceError || !balance) {
      console.error('❌ Error fetching balance:', balanceError);
      return new Response(
        JSON.stringify({ 
          error: 'Unable to verify balance',
          purchased: false 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Only check withdrawable balance (holding cannot be used for purchases)
    const withdrawableBalance = new BigNumber(balance.withdrawable_balance || 0);
    
    console.log('💰 Balance check (WITHDRAWABLE ONLY):', { 
      withdrawable: withdrawableBalance.toString(), 
      holding: balance.holding_balance || 0,
      required: actualCost 
    });
    
    if (withdrawableBalance.lt(actualCost)) {
      console.warn('⚠️ Insufficient withdrawable balance:', { 
        available: withdrawableBalance.toString(), 
        required: actualCost 
      });
      return new Response(
        JSON.stringify({ 
          error: `Insufficient withdrawable balance. You need ${actualCost} BSK but only have ${withdrawableBalance.toString()} BSK available for purchases.`,
          purchased: false 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // STEP 4: Delegate to badge-purchase function with SERVER-CALCULATED amount
    // ==========================================
    console.log(`🎯 [${requestId}] =============== INVOKING BADGE-PURCHASE EDGE FUNCTION ===============`);
    console.log(`🎯 [${requestId}] Time elapsed: ${Date.now() - startTime}ms`);
    console.log(`📤 [${requestId}] Payload being sent:`, JSON.stringify({
      user_id,
      badge_name,
      previous_badge: existingBadge?.current_badge || null,
      bsk_amount: actualCost,
      is_upgrade: isUpgrade
    }, null, 2));
    
    const invokeStartTime = Date.now();
    
    const purchaseResponse = await supabase.functions.invoke('badge-purchase', {
      body: {
        user_id,
        badge_name,
        previous_badge: existingBadge?.current_badge || null,
        bsk_amount: actualCost,
        is_upgrade: isUpgrade
      }
    });
    
    const invokeDuration = Date.now() - invokeStartTime;
    
    console.log(`📬 [${requestId}] badge-purchase response received in ${invokeDuration}ms`);
    console.log(`📬 [${requestId}] Response status:`, purchaseResponse.status);
    console.log(`📬 [${requestId}] Response error:`, purchaseResponse.error);
    console.log(`📬 [${requestId}] Response data:`, JSON.stringify(purchaseResponse.data, null, 2));

    if (purchaseResponse.error) {
      console.error(`❌ [${requestId}] Badge purchase FAILED:`, purchaseResponse.error);
      console.error(`❌ [${requestId}] Full error object:`, JSON.stringify(purchaseResponse.error, null, 2));
      
      return new Response(
        JSON.stringify({ 
          error: purchaseResponse.error.message || 'Badge purchase failed',
          purchased: false,
          debug: {
            request_id: requestId,
            duration_ms: Date.now() - startTime,
            error_details: purchaseResponse.error
          }
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [${requestId}] Badge purchase SUCCEEDED`);
    console.log(`✅ [${requestId}] Total duration: ${Date.now() - startTime}ms`);
    console.log(`✅ [${requestId}] ============= VERIFY-BADGE-PURCHASE COMPLETE =============`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        purchased: true,
        badge: badge_name,
        cost_paid: actualCost,
        is_upgrade: isUpgrade,
        bonus_credited: purchaseResponse.data?.bonus_credited,
        bonus_amount: purchaseResponse.data?.bonus_amount,
        debug: {
          request_id: requestId,
          duration_ms: Date.now() - startTime,
          invoke_duration_ms: invokeDuration
        }
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(`❌ [${requestId}] CRITICAL EXCEPTION in verify-badge-purchase:`, error);
    console.error(`❌ [${requestId}] Error stack:`, error?.stack);
    console.error(`❌ [${requestId}] Error name:`, error?.name);
    console.error(`❌ [${requestId}] Error message:`, error?.message);
    console.error(`❌ [${requestId}] Duration before crash: ${Date.now() - startTime}ms`);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        purchased: false,
        debug: {
          request_id: requestId,
          error_message: error?.message,
          error_name: error?.name,
          duration_ms: Date.now() - startTime
        }
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
