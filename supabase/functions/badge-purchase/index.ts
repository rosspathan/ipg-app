import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

interface PurchaseRequest {
  user_id: string;
  badge_name: string;
  previous_badge?: string;
  bsk_amount: number;
  is_upgrade: boolean;
}

/**
 * Normalizes badge names to handle variations like "i-Smart VIP", "I-SMART VIP", "VIP"
 * Returns canonical badge name for consistent processing
 */
function normalizeBadgeName(badge: string): string {
  const badgeUpper = badge.toUpperCase().trim();
  
  // Handle VIP variations - all map to "VIP"
  if (badgeUpper.includes('VIP') || badgeUpper.includes('SMART')) {
    return 'VIP';
  }
  
  // Return original for other badges (Silver, Gold, Platinum, Diamond)
  return badge;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, badge_name, previous_badge, bsk_amount, is_upgrade }: PurchaseRequest = await req.json();
    
    // Normalize badge name for consistent processing
    const normalizedBadge = normalizeBadgeName(badge_name);

    console.log('Badge purchase request:', { 
      user_id, 
      original_badge: badge_name, 
      normalized_badge: normalizedBadge,
      previous_badge, 
      bsk_amount, 
      is_upgrade 
    });

    // 1. Verify user has sufficient BSK balance
    const { data: balance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('withdrawable_balance, holding_balance')
      .eq('user_id', user_id)
      .single();

    if (balanceError) {
      console.error('Balance fetch error:', balanceError);
      throw new Error('Failed to fetch balance');
    }

    const totalBalance = new BigNumber(balance.withdrawable_balance)
      .plus(balance.holding_balance)
      .toNumber();
    
    if (new BigNumber(totalBalance).lt(bsk_amount)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient BSK balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Deduct BSK from user's balance using atomic transaction
    console.log(`💰 Attempting to deduct ${bsk_amount} BSK for badge purchase...`);
    
    const { data: debitData, error: debitError } = await supabaseClient.rpc('record_bsk_transaction', {
      p_user_id: user_id,
      p_idempotency_key: `badge_purchase_debit_${user_id}_${normalizedBadge}_${Date.now()}`,
      p_tx_type: 'debit',
      p_tx_subtype: is_upgrade ? 'badge_upgrade' : 'badge_purchase',
      p_balance_type: 'withdrawable', // Try withdrawable first, ledger will handle overflow to holding
      p_amount_bsk: bsk_amount,
      p_meta_json: {
        badge_name: normalizedBadge,
        previous_badge: previous_badge,
        is_upgrade: is_upgrade
      }
    });

    if (debitError) {
      console.error('❌ Balance debit error:', debitError);
      throw new Error(`Failed to deduct balance: ${debitError.message}`);
    }

    console.log(`✅ Balance deducted successfully: ${bsk_amount} BSK for badge purchase`);
    
    // Verify the transaction was recorded
    const { data: verifyTx, error: verifyError } = await supabaseClient
      .from('unified_bsk_ledger')
      .select('id, tx_type, amount_bsk, balance_after')
      .eq('user_id', user_id)
      .eq('tx_subtype', is_upgrade ? 'badge_upgrade' : 'badge_purchase')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError || !verifyTx) {
      console.error('❌ CRITICAL: Debit transaction verification failed:', verifyError);
      throw new Error('Badge purchase debit transaction was not recorded - aborting');
    }

    console.log(`✅ Debit transaction verified:`, verifyTx);

    // 3. Create or update badge holding (STORE NORMALIZED NAME)
    const { error: badgeError } = await supabaseClient
      .from('user_badge_holdings')
      .upsert({
        user_id,
        current_badge: normalizedBadge, // ✅ Store normalized name ("VIP" not "i-Smart VIP")
        previous_badge,
        price_bsk: bsk_amount,
        purchased_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });
    
    console.log('✅ Badge holding created/updated:', { 
      stored_badge: normalizedBadge, 
      original_input: badge_name 
    });

    if (badgeError) {
      console.error('❌ CRITICAL: Badge holding error:', badgeError);
      
      // Rollback: Credit back the deducted amount
      console.log('🔄 Rolling back balance deduction...');
      await supabaseClient.rpc('record_bsk_transaction', {
        p_user_id: user_id,
        p_idempotency_key: `badge_purchase_rollback_${user_id}_${normalizedBadge}_${Date.now()}`,
        p_tx_type: 'credit',
        p_tx_subtype: 'rollback',
        p_balance_type: 'withdrawable',
        p_amount_bsk: bsk_amount,
        p_meta_json: {
          reason: 'badge_assignment_failed',
          original_badge: normalizedBadge,
          error: badgeError.message
        }
      });
      
      throw new Error(`Failed to update badge holding: ${badgeError.message}`);
    }

    // 4. Process 10% direct commission (L1 sponsor only)
    try {
      console.log('💰 Processing 10% direct commission...');
      
      const commissionResponse = await supabaseClient.functions.invoke('process-badge-subscription-commission', {
        body: {
          user_id,
          badge_name,
          bsk_amount,
          previous_badge
        }
      });

      if (commissionResponse.error) {
        console.error('❌ Direct commission processing error:', commissionResponse.error);
      } else {
        console.log('✅ Direct commission processed:', commissionResponse.data);
      }
    } catch (commissionError) {
      console.error('❌ Direct commission processor error (non-critical):', commissionError);
    }

    // 4b. Process multi-level commissions (L2-50) - non-blocking
    try {
      console.log('🌳 Processing multi-level commissions (L2-50)...');
      
      const multiLevelResponse = await supabaseClient.functions.invoke('process-multi-level-commissions', {
        body: {
          user_id,
          event_type: is_upgrade ? 'badge_upgrade' : 'badge_purchase',
          base_amount: bsk_amount
        }
      });

      if (multiLevelResponse.error) {
        console.error('❌ Multi-level commission error:', multiLevelResponse.error);
      } else {
        console.log('✅ Multi-level commissions processed:', multiLevelResponse.data);
      }
    } catch (mlCommissionError) {
      console.error('❌ Multi-level commission processor error (non-critical):', mlCommissionError);
    }


    // 5. Credit bonus holding balance for badge purchase
    let bonusCredited = false;
    let bonusAmount = 0;
    try {
      // Get badge threshold - try multiple badge name variations
      let badgeThreshold = null;
      let thresholdError = null;
      
      // Try exact match with original name first
      const exactMatch = await supabaseClient
        .from('badge_thresholds')
        .select('bonus_bsk_holding, badge_name')
        .ilike('badge_name', badge_name)
        .eq('is_active', true)
        .maybeSingle();
      
      if (exactMatch.data) {
        badgeThreshold = exactMatch.data;
      } else {
        // Try with normalized name
        const normalizedMatch = await supabaseClient
          .from('badge_thresholds')
          .select('bonus_bsk_holding, badge_name')
          .ilike('badge_name', `%${normalizedBadge}%`)
          .eq('is_active', true)
          .maybeSingle();
        
        badgeThreshold = normalizedMatch.data;
        thresholdError = normalizedMatch.error;
      }
      
      // VIP fallback: If no threshold found but it's a VIP badge, default to 10,000 bonus
      if (!badgeThreshold && normalizedBadge === 'VIP') {
        console.log('⚠️ No threshold found for VIP badge, using default 10,000 BSK bonus');
        bonusAmount = 10000;
      } else if (badgeThreshold && new BigNumber(badgeThreshold.bonus_bsk_holding || 0).gt(0)) {
        bonusAmount = new BigNumber(badgeThreshold.bonus_bsk_holding).toNumber();
      }

      if (thresholdError) {
        console.error('Error fetching badge threshold:', thresholdError);
      }

      // ALWAYS credit bonus for VIP badge purchases, even if already set
      // This ensures VIP purchases are treated consistently
      if (bonusAmount > 0) {
        console.log(`💰 Crediting ${bonusAmount} BSK bonus for ${badge_name} (normalized: ${normalizedBadge})`);
        
        // Credit bonus to holding balance using atomic transaction
        const { error: bonusUpdateError } = await supabaseClient.rpc('record_bsk_transaction', {
          p_user_id: user_id,
          p_idempotency_key: `badge_bonus_${user_id}_${normalizedBadge}`,
          p_tx_type: 'credit',
          p_tx_subtype: 'badge_bonus',
          p_balance_type: 'holding',
          p_amount_bsk: bonusAmount,
          p_meta_json: {
            badge_name,
            normalized_badge: normalizedBadge,
            bonus_type: 'holding_balance',
            source: 'badge_purchase',
            timestamp: new Date().toISOString()
          }
        });

        if (bonusUpdateError) {
          console.error('❌ Failed to credit bonus:', bonusUpdateError);
          throw bonusUpdateError;
        } else {
          bonusCredited = true;
          console.log(`✅ Successfully credited ${bonusAmount} BSK bonus to holding balance`);
          console.log(`   User: ${user_id}`);
          console.log(`   Badge: ${badge_name} (${normalizedBadge})`);
        }
      } else {
        console.log(`⚠️ No bonus configured for badge: ${badge_name} (${normalizedBadge})`);
      }
    } catch (bonusError) {
      console.error('❌ CRITICAL: Badge bonus crediting failed:', bonusError);
      // Re-throw to make this visible in responses
      throw new Error(`Failed to credit badge bonus: ${bonusError.message}`);
    }

    // 6. If VIP badge, handle milestone tracker and check milestones
    if (normalizedBadge === 'VIP') {
      try {
        // Create or update VIP milestone tracker
        const { error: trackerError } = await supabaseClient
          .from('vip_milestone_tracker')
          .upsert({
            user_id,
            vip_badge_acquired_at: new Date().toISOString(),
            direct_vip_count_after_vip: 0
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: true
          });

        if (trackerError) {
          console.error('VIP tracker creation error:', trackerError);
        }

        // Get user's sponsor to check their milestones
        const { data: sponsor } = await supabaseClient
          .from('referral_tree')
          .select('ancestor_id')
          .eq('user_id', user_id)
          .eq('level', 1)
          .maybeSingle();

        if (sponsor) {
          // Trigger NEW VIP milestone processor
          console.log('💎 Checking VIP milestone rewards for sponsor...');
          
          const milestoneResponse = await supabaseClient.functions.invoke('process-vip-milestone-rewards', {
            body: {
              sponsor_id: sponsor.ancestor_id,
              new_vip_referral_id: user_id
            }
          });

          if (milestoneResponse.error) {
            console.error('❌ Milestone processing error:', milestoneResponse.error);
          } else {
            console.log('✅ VIP milestones processed:', milestoneResponse.data);
          }
        }
      } catch (vipError) {
        console.error('VIP milestone processing error (non-critical):', vipError);
      }
    }

    // 7. Create audit log
    await supabaseClient
      .from('bonus_ledger')
      .insert({
        user_id,
        type: is_upgrade ? 'badge_upgrade' : 'badge_purchase',
        amount_bsk: -bsk_amount,
        meta_json: {
          badge_name,
          previous_badge,
          is_upgrade,
        },
      });

    console.log('✅ Badge purchase completed successfully');
    console.log(`   User: ${user_id}`);
    console.log(`   Badge: ${badge_name} (${normalizedBadge})`);
    console.log(`   Amount: ${bsk_amount} BSK`);
    console.log(`   Bonus: ${bonusCredited ? `${bonusAmount} BSK` : 'None'}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        bonus_credited: bonusCredited,
        bonus_amount: bonusAmount,
        badge_name: normalizedBadge,
        amount_deducted: bsk_amount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Badge purchase error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
