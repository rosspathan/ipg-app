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
    // ATOMIC BADGE PURCHASE WITH TRANSACTION
    // ==========================================
    // Call the atomic database function that handles:
    // 1. Balance check & lock
    // 2. Idempotency check (duplicate badge prevention)
    // 3. Balance deduction
    // 4. Purchase recording
    // 5. Badge assignment
    // All in a single atomic transaction with automatic rollback on failure
    
    const { data: purchaseResult, error: purchaseError } = await supabase.rpc(
      'atomic_badge_purchase',
      {
        p_user_id: userId,
        p_badge_name: toBadge,
        p_previous_badge: fromBadge || null,
        p_bsk_amount: paidAmountBSK,
        p_payment_ref: paymentRef,
        p_payment_method: paymentMethod,
        p_unlock_levels: 50
      }
    );

    if (purchaseError) {
      console.error('[Badge Purchase] Atomic purchase failed:', purchaseError);
      
      // Parse specific error types
      if (purchaseError.message?.includes('INSUFFICIENT_BALANCE')) {
        const match = purchaseError.message.match(/Required ([\d.]+), Available ([\d.]+)/);
        const required = match ? parseFloat(match[1]) : paidAmountBSK;
        const available = match ? parseFloat(match[2]) : 0;
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'INSUFFICIENT_BALANCE',
            message: `You need ${(required - available).toFixed(2)} more BSK to complete this purchase`,
            details: {
              required_balance: required,
              current_balance: available,
              shortfall: required - available
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        );
      }
      
      if (purchaseError.message?.includes('DUPLICATE_BADGE')) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'DUPLICATE_BADGE',
            message: 'You already own this badge'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 409 
          }
        );
      }
      
      // Generic error
      throw new Error(`Badge purchase failed: ${purchaseError.message}`);
    }

    console.log(`[Badge Purchase] SUCCESS - Atomic transaction completed:`, purchaseResult);

    // ==========================================
    // STEP 5: TRIGGER COMMISSIONS
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
