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
      .eq('id', userId)
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
    // STEP 2: ATOMIC TRANSACTION via Database Function
    // ==========================================
    console.log(`[Badge Purchase] Calling atomic purchase function...`);
    
    const { data: purchaseResult, error: purchaseError } = await supabase
      .rpc('atomic_badge_purchase', {
        p_user_id: userId,
        p_badge_name: toBadge,
        p_previous_badge: fromBadge || null,
        p_paid_amount_bsk: paidAmountBSK,
        p_payment_ref: paymentRef,
        p_payment_method: paymentMethod
      });

    if (purchaseError) {
      console.error(`[Badge Purchase] Transaction failed:`, purchaseError);
      
      // Parse error message for specific error types
      const errorMsg = purchaseError.message || '';
      
      if (errorMsg.includes('INSUFFICIENT_BALANCE')) {
        const match = errorMsg.match(/Required ([\d.]+), Available ([\d.]+)/);
        const required = match ? parseFloat(match[1]) : paidAmountBSK;
        const available = match ? parseFloat(match[2]) : 0;
        const shortfall = required - available;
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'INSUFFICIENT_BALANCE',
            message: `You need ${shortfall.toFixed(2)} more BSK to complete this purchase`,
            details: {
              required_balance: required,
              current_balance: available,
              shortfall: shortfall
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        );
      }
      
      if (errorMsg.includes('DUPLICATE_BADGE')) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'DUPLICATE_BADGE',
            message: `You already own the ${toBadge} badge`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        );
      }
      
      // Generic error
      throw new Error(`Badge purchase failed: ${errorMsg}`);
    }

    console.log(`[Badge Purchase] Transaction completed successfully:`, purchaseResult);

    // ==========================================
    // STEP 3: TRIGGER COMMISSIONS
    // ==========================================
    try {
      await supabase.functions.invoke('process-badge-subscription-commission', {
        body: {
          user_id: userId,
          badge_name: toBadge,
          bsk_amount: paidAmountBSK,
          previous_badge: fromBadge || null,
        },
      });
    } catch (e) {
      console.warn('[Badge Purchase] Direct commission failed:', (e as any)?.message || e);
    }

    // Call 50-level team income processor
    try {
      await supabase.functions.invoke('process-team-income-rewards', {
        body: {
          payer_id: userId,
          event_type: 'badge_purchase',
          event_id: paymentRef,
          badge_name: toBadge,
          payment_amount: paidAmountBSK,
        },
      });
    } catch (e) {
      console.warn('[Badge Purchase] Team income processing failed:', (e as any)?.message || e);
    }

    // Check VIP milestone rewards for sponsor if user purchased VIP badge
    if (toBadge === 'VIP') {
      try {
        const { data: referralLink } = await supabase
          .from('referral_links_new')
          .select('sponsor_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (referralLink?.sponsor_id) {
          console.log(`[Badge Purchase] Checking VIP milestones for sponsor: ${referralLink.sponsor_id}`);
          await supabase.functions.invoke('check-vip-milestones', {
            body: { sponsor_id: referralLink.sponsor_id },
          });
        }
      } catch (e) {
        console.warn('[Badge Purchase] VIP milestone check failed:', (e as any)?.message || e);
      }
    }

    console.log(`[Badge Purchase] SUCCESS: ${toBadge} badge purchased by ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        badge: toBadge,
        amount_paid: paidAmountBSK,
        new_balance: purchaseResult.new_balance,
        purchase_id: purchaseResult.purchase_id
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
