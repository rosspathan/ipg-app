import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgePurchaseRequest {
  userId: string;
  toBadge: string;
  fromBadge?: string;
  paidAmountBSK: number;
  paymentRef: string;
  paymentMethod: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, toBadge, fromBadge, paidAmountBSK, paymentRef, paymentMethod } 
      = await req.json() as BadgePurchaseRequest;

    console.log(`[Badge Purchase] Processing: User ${userId}, Badge ${toBadge}, Amount ${paidAmountBSK} BSK`);

    // ==========================================
    // STEP 1: CHECK KYC APPROVAL (SOFT VALIDATION)
    // ==========================================
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_kyc_approved')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.warn(`[Badge Purchase] Profile fetch warning: ${profileError.message}`);
    }

    // Log KYC status but don't block purchase
    if (!profile?.is_kyc_approved) {
      console.warn(`[Badge Purchase] ⚠️ KYC NOT APPROVED for user ${userId} - purchase allowed but flagged`);
    } else {
      console.log(`[Badge Purchase] KYC verified ✅`);
    }

    // ==========================================
    // STEP 2: DEDUCT BSK FROM USER BALANCE
    // ==========================================
    const { data: currentBalance } = await supabase
      .from('user_bsk_balances')
      .select('holding_balance')
      .eq('user_id', userId)
      .maybeSingle();

    const availableBalance = Number(currentBalance?.holding_balance || 0);

    if (availableBalance < paidAmountBSK) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: `Insufficient BSK balance. Required: ${paidAmountBSK}, Available: ${availableBalance}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    const newBalance = availableBalance - paidAmountBSK;

    await supabase
      .from('user_bsk_balances')
      .upsert({
        user_id: userId,
        holding_balance: newBalance,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    console.log(`[Badge Purchase] Deducted ${paidAmountBSK} BSK. New balance: ${newBalance}`);

    // ==========================================
    // STEP 3: RECORD BADGE PURCHASE
    // ==========================================
    const { error: purchaseError } = await supabase
      .from('badge_purchases')
      .insert({
        user_id: userId,
        badge_name: toBadge,
        previous_badge: fromBadge || null,
        bsk_amount: paidAmountBSK,
        inr_amount: 0,
        bsk_rate_at_purchase: 1,
        is_upgrade: !!fromBadge,
        payment_method: paymentMethod,
        payment_ref: paymentRef,
        status: 'completed'
      });

    if (purchaseError) {
      throw new Error(`Badge purchase insert failed: ${purchaseError.message}`);
    }

    // ==========================================
    // STEP 4: UPDATE USER_BADGE_HOLDINGS
    // ==========================================
    const { error: holdingError } = await supabase
      .from('user_badge_holdings')
      .upsert({
        user_id: userId,
        current_badge: toBadge,
        purchased_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (holdingError) {
      throw new Error(`Badge holding update failed: ${holdingError.message}`);
    }

    // ==========================================
    // STEP 5: TRIGGER COMMISSIONS
    // ==========================================
    // Call direct commission processor (10% to L1 sponsor)
    await supabase.functions.invoke('process-badge-subscription-commission', {
      body: { user_id: userId, badge_name: toBadge, amount_bsk: paidAmountBSK }
    });

    // Call 50-level team income processor
    await supabase.functions.invoke('process-team-income-rewards', {
      body: { 
        payer_id: userId, 
        event_type: 'badge_purchase',
        event_id: paymentRef,
        badge_name: toBadge,
        payment_amount: paidAmountBSK
      }
    });

    console.log(`[Badge Purchase] SUCCESS: ${toBadge} badge purchased by ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        badge: toBadge,
        amount_paid: paidAmountBSK
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[Badge Purchase] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
