import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // STEP 2: Check if user already has this badge
    // ==========================================
    const { data: existingBadge, error: existingError } = await supabase
      .from('user_badge_holdings')
      .select('current_badge, purchased_at')
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

    // Check BOTH balance types (holding + withdrawable)
    const holdingBalance = balance.holding_balance || 0;
    const withdrawableBalance = balance.withdrawable_balance || 0;
    const totalAvailable = holdingBalance + withdrawableBalance;
    
    console.log('💰 Balance check:', { 
      holding: holdingBalance, 
      withdrawable: withdrawableBalance, 
      total: totalAvailable, 
      required: cost 
    });
    
    if (totalAvailable < cost) {
      console.warn('⚠️ Insufficient BSK balance:', { available: totalAvailable, required: cost });
      return new Response(
        JSON.stringify({ 
          error: `Insufficient BSK balance. You need ${cost} BSK but only have ${totalAvailable} BSK total.`,
          purchased: false 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // STEP 4: Determine deduction strategy
    // Priority: holding_balance first, then withdrawable_balance
    // ==========================================
    let deductFromHolding = 0;
    let deductFromWithdrawable = 0;
    let paymentMethod = '';

    if (holdingBalance >= cost) {
      // Sufficient holding balance - use only that
      deductFromHolding = cost;
      paymentMethod = 'bsk_holding';
    } else {
      // Use all holding balance, rest from withdrawable
      deductFromHolding = holdingBalance;
      deductFromWithdrawable = cost - holdingBalance;
      paymentMethod = 'bsk_mixed';
    }

    console.log('💳 Payment breakdown:', { 
      fromHolding: deductFromHolding, 
      fromWithdrawable: deductFromWithdrawable,
      method: paymentMethod
    });

    const newHoldingBalance = holdingBalance - deductFromHolding;
    const newWithdrawableBalance = withdrawableBalance - deductFromWithdrawable;

    // ==========================================
    // STEP 5: ATOMIC TRANSACTION - Deduct BSK
    // ==========================================
    const { error: deductError } = await supabase
      .from('user_bsk_balances')
      .update({ 
        holding_balance: newHoldingBalance,
        withdrawable_balance: newWithdrawableBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (deductError) {
      console.error('❌ Failed to deduct BSK:', deductError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process payment',
          purchased: false 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ BSK deducted successfully');

    // ==========================================
    // STEP 6: Create ledger entries for audit trail
    // ==========================================
    const purchaseId = crypto.randomUUID();

    // Create holding ledger entry if any was deducted
    if (deductFromHolding > 0) {
      await supabase.from('bsk_holding_ledger').insert({
        user_id,
        amount_bsk: -deductFromHolding,
        tx_type: 'badge_purchase',
        balance_before: holdingBalance,
        balance_after: newHoldingBalance,
        reference_id: purchaseId,
        notes: `Badge purchase: ${badge_name} (${deductFromHolding} BSK from holding)`,
        created_at: new Date().toISOString()
      });
      console.log('✅ Holding ledger entry created');
    }

    // Create withdrawable ledger entry if any was deducted
    if (deductFromWithdrawable > 0) {
      await supabase.from('bsk_withdrawable_ledger').insert({
        user_id,
        amount_bsk: -deductFromWithdrawable,
        tx_type: 'badge_purchase',
        balance_before: withdrawableBalance,
        balance_after: newWithdrawableBalance,
        reference_id: purchaseId,
        notes: `Badge purchase: ${badge_name} (${deductFromWithdrawable} BSK from withdrawable)`,
        created_at: new Date().toISOString()
      });
      console.log('✅ Withdrawable ledger entry created');
    }

    // ==========================================
    // STEP 7: Insert/Update badge in user_badge_holdings
    // ==========================================
    const { error: holdingError } = await supabase
      .from('user_badge_holdings')
      .upsert({
        user_id,
        current_badge: badge_name,
        purchased_at: new Date().toISOString(),
        previous_badge: existingBadge?.current_badge || null,
        badge_cost: cost,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (holdingError) {
      console.error('❌ Failed to assign badge, ROLLING BACK:', holdingError);
      
      // ROLLBACK: Refund BSK to both balances
      await supabase
        .from('user_bsk_balances')
        .update({ 
          holding_balance: holdingBalance,
          withdrawable_balance: withdrawableBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id);

      return new Response(
        JSON.stringify({ 
          error: 'Failed to assign badge. Payment has been refunded.',
          purchased: false 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Badge assigned successfully');

    // ==========================================
    // STEP 8: Record purchase in badge_purchases table
    // ==========================================
    await supabase
      .from('badge_purchases')
      .insert({
        id: purchaseId,
        user_id,
        badge_name,
        previous_badge: existingBadge?.current_badge || null,
        bsk_amount: cost,
        inr_amount: 0,
        bsk_rate_at_purchase: 1,
        payment_method: paymentMethod,
        status: 'completed',
        is_upgrade: !!existingBadge?.current_badge
      });

    // ==========================================
    // STEP 9: Trigger commission processing
    // ==========================================
    try {
      await supabase.functions.invoke('process-badge-subscription-commission', {
        body: {
          user_id,
          badge_name,
          bsk_amount: cost,
          previous_badge: existingBadge?.current_badge || null
        }
      });
      console.log('✅ Commission processing triggered');
    } catch (commissionError) {
      console.warn('⚠️ Commission processing failed (non-critical):', commissionError);
    }

    console.log('🎉 Badge purchase completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        purchased: true,
        badge: badge_name,
        new_holding_balance: newHoldingBalance,
        new_withdrawable_balance: newWithdrawableBalance,
        total_balance: newHoldingBalance + newWithdrawableBalance,
        deducted_from: paymentMethod
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
