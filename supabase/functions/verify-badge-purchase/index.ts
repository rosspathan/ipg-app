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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, badge_name, cost }: BadgePurchaseRequest = await req.json();

    console.log('🎖️ [Verify Badge Purchase] Request:', { user_id, badge_name, cost });

    // ==========================================
    // STEP 1: Verify badge exists and is active
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

    // ==========================================
    // STEP 2: Check if user already has this badge & calculate upgrade pricing
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

    // Calculate actual cost (differential for upgrades)
    let actualCost = cost;
    const isUpgrade = !!existingBadge?.current_badge;
    
    if (isUpgrade && existingBadge.price_bsk) {
      // For upgrades, only charge the difference
      const previousCost = new BigNumber(existingBadge.price_bsk);
      const newCost = new BigNumber(cost);
      const differential = newCost.minus(previousCost);
      
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
      console.log(`🔄 Upgrade detected: ${existingBadge.current_badge} → ${badge_name}`);
      console.log(`💰 Differential pricing: ${existingBadge.price_bsk} → ${cost} = ${actualCost} BSK to pay`);
    }

    // ==========================================
    // STEP 3: Verify user has sufficient BSK balance
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

    // Check BOTH balance types with BigNumber precision
    const holdingBalance = new BigNumber(balance.holding_balance || 0);
    const withdrawableBalance = new BigNumber(balance.withdrawable_balance || 0);
    const totalAvailable = holdingBalance.plus(withdrawableBalance);
    
    console.log('💰 Balance check:', { 
      holding: holdingBalance.toString(), 
      withdrawable: withdrawableBalance.toString(), 
      total: totalAvailable.toString(), 
      required: actualCost 
    });
    
    if (totalAvailable.lt(actualCost)) {
      console.warn('⚠️ Insufficient BSK balance:', { available: totalAvailable.toString(), required: actualCost });
      return new Response(
        JSON.stringify({ 
          error: `Insufficient BSK balance. You need ${actualCost} BSK but only have ${totalAvailable.toString()} BSK total.`,
          purchased: false 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // STEP 4: Delegate to improved badge-purchase function
    // ==========================================
    console.log('🎯 Delegating to badge-purchase function...');
    
    try {
      const purchaseResponse = await supabase.functions.invoke('badge-purchase', {
        body: {
          user_id,
          badge_name,
          previous_badge: existingBadge?.current_badge || null,
          bsk_amount: actualCost,
          is_upgrade: isUpgrade
        }
      });

      if (purchaseResponse.error) {
        console.error('❌ Badge purchase failed:', purchaseResponse.error);
        return new Response(
          JSON.stringify({ 
            error: purchaseResponse.error.message || 'Badge purchase failed',
            purchased: false 
          }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Badge purchase completed:', purchaseResponse.data);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          purchased: true,
          badge: badge_name,
          cost_paid: actualCost,
          is_upgrade: isUpgrade,
          bonus_credited: purchaseResponse.data?.bonus_credited,
          bonus_amount: purchaseResponse.data?.bonus_amount
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('❌ Critical badge purchase error:', error);
      return new Response(
        JSON.stringify({ 
          error: error?.message || 'Badge purchase failed',
          purchased: false 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ Critical error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        purchased: false 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
