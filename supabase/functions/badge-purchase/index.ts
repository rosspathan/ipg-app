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

    console.log('🎖️ [Badge Purchase] Starting transaction:', { 
      user_id, 
      original_badge: badge_name, 
      normalized_badge: normalizedBadge,
      previous_badge, 
      bsk_amount, 
      is_upgrade,
      timestamp: new Date().toISOString()
    });

    // 1. Verify WITHDRAWABLE balance only
    const { data: balance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('withdrawable_balance, holding_balance')
      .eq('user_id', user_id)
      .single();

    if (balanceError) {
      console.error('❌ Balance fetch error:', balanceError);
      throw new Error('Failed to fetch balance');
    }

    console.log('💰 Starting balance:', {
      withdrawable: balance.withdrawable_balance,
      holding: balance.holding_balance,
      required: bsk_amount
    });

    // CRITICAL: Only withdrawable can be used for purchases
    const withdrawableBalance = new BigNumber(balance.withdrawable_balance || 0);
    
    if (withdrawableBalance.lt(bsk_amount)) {
      console.error('❌ Insufficient withdrawable balance:', {
        available: withdrawableBalance.toString(),
        required: bsk_amount
      });
      return new Response(
        JSON.stringify({ error: `Insufficient withdrawable balance. Need ${bsk_amount} BSK, have ${withdrawableBalance.toString()} BSK` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Deduct BSK from WITHDRAWABLE balance using atomic transaction
    console.log(`💳 [Debit] Attempting to deduct ${bsk_amount} BSK from withdrawable balance...`);
    
    const { data: debitData, error: debitError } = await supabaseClient.rpc('record_bsk_transaction', {
      p_user_id: user_id,
      p_idempotency_key: `badge_purchase_debit_${user_id}_${normalizedBadge}_${Date.now()}`,
      p_tx_type: 'debit',
      p_tx_subtype: is_upgrade ? 'badge_upgrade' : 'badge_purchase',
      p_balance_type: 'withdrawable', // ONLY withdrawable can be used for purchases
      p_amount_bsk: bsk_amount,
      p_notes: null,
      p_meta_json: {
        badge_name: normalizedBadge,
        previous_badge: previous_badge,
        is_upgrade: is_upgrade
      },
      p_related_user_id: null,
      p_related_transaction_id: null
    });

    if (debitError) {
      console.error('❌ [Debit] Balance debit error:', debitError);
      throw new Error(`Failed to deduct balance: ${debitError.message}`);
    }

    console.log(`✅ [Debit] Balance deducted successfully:`, debitData);
    
    // Verify the transaction was recorded in ledger
    const { data: verifyTx, error: verifyError } = await supabaseClient
      .from('unified_bsk_ledger')
      .select('id, tx_type, tx_subtype, amount_bsk, balance_after, balance_type')
      .eq('user_id', user_id)
      .eq('tx_subtype', is_upgrade ? 'badge_upgrade' : 'badge_purchase')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError || !verifyTx) {
      console.error('❌ [Debit] CRITICAL: Transaction verification failed:', verifyError);
      throw new Error('Badge purchase debit transaction was not recorded in ledger - aborting');
    }

    if (verifyTx.tx_type !== 'debit') {
      console.error('❌ [Debit] CRITICAL: Wrong transaction type in ledger:', verifyTx);
      throw new Error('Ledger verification failed: expected debit transaction');
    }

    console.log(`✅ [Debit] Transaction verified in ledger:`, {
      id: verifyTx.id,
      type: verifyTx.tx_type,
      subtype: verifyTx.tx_subtype,
      amount: verifyTx.amount_bsk,
      balance_after: verifyTx.balance_after,
      balance_type: verifyTx.balance_type
    });

    // 3. Assign badge to user (ONLY after successful debit verification)
    console.log(`🎖️ [Badge] Assigning badge to user...`);
    
    const { error: badgeError } = await supabaseClient
      .from('user_badge_holdings')
      .upsert({
        user_id,
        current_badge: normalizedBadge,
        previous_badge,
        price_bsk: bsk_amount,
        purchased_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });
    
    if (badgeError) {
      console.error('❌ [Badge] CRITICAL: Badge assignment failed:', badgeError);
      
      // ROLLBACK: Credit back the deducted amount
      console.log('🔄 [Rollback] Crediting back deducted amount...');
      try {
        await supabaseClient.rpc('record_bsk_transaction', {
          p_user_id: user_id,
          p_idempotency_key: `badge_purchase_rollback_${user_id}_${normalizedBadge}_${Date.now()}`,
          p_tx_type: 'credit',
          p_tx_subtype: 'rollback',
          p_balance_type: 'withdrawable',
          p_amount_bsk: bsk_amount,
          p_notes: null,
          p_meta_json: {
            reason: 'badge_assignment_failed',
            original_badge: normalizedBadge,
            error: badgeError.message
          },
          p_related_user_id: null,
          p_related_transaction_id: null
        });
        console.log('✅ [Rollback] Successfully credited back', bsk_amount, 'BSK');
      } catch (rollbackError) {
        console.error('❌ [Rollback] CRITICAL: Rollback failed:', rollbackError);
      }
      
      throw new Error(`Failed to assign badge: ${badgeError.message}`);
    }

    console.log(`✅ [Badge] Badge assigned successfully:`, { 
      badge: normalizedBadge, 
      previous: previous_badge 
    });

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


    // 5. Credit bonus holding balance - DETERMINISTIC from badge_thresholds
    let bonusCredited = false;
    let bonusAmount = 0;
    
    try {
      console.log(`🎁 Fetching bonus configuration for badge: ${normalizedBadge}`);
      
      // Fetch bonus from badge_thresholds (SERVER AUTHORITATIVE)
      // Search by both normalized name (e.g., "VIP") and original name (e.g., "I-Smart VIP")
      const { data: badgeThreshold, error: thresholdError } = await supabaseClient
        .from('badge_thresholds')
        .select('bonus_bsk_holding, badge_name, bsk_threshold')
        .in('badge_name', [normalizedBadge, badge_name])
        .eq('is_active', true)
        .order('bsk_threshold', { ascending: true })
        .maybeSingle();

      if (thresholdError) {
        console.error('❌ Error fetching badge threshold:', thresholdError);
        throw new Error(`Failed to fetch bonus configuration: ${thresholdError.message}`);
      }

      if (!badgeThreshold) {
        console.error('❌ CRITICAL: No badge_thresholds entry found for:', normalizedBadge);
        throw new Error(`Badge configuration not found for ${normalizedBadge}`);
      }

      // DETERMINISTIC: Use bonus_bsk_holding from DB
      bonusAmount = new BigNumber(badgeThreshold.bonus_bsk_holding || 0).toNumber();
      
      console.log(`📊 Badge threshold config:`, {
        badge: badgeThreshold.badge_name,
        threshold: badgeThreshold.bsk_threshold,
        bonus: bonusAmount
      });

      if (bonusAmount > 0) {
        console.log(`💰 Crediting ${bonusAmount} BSK bonus to holding balance`);
        
        // Credit bonus to holding balance using atomic transaction
        const { error: bonusUpdateError } = await supabaseClient.rpc('record_bsk_transaction', {
          p_user_id: user_id,
          p_idempotency_key: `badge_bonus_${user_id}_${normalizedBadge}_${Date.now()}`,
          p_tx_type: 'credit',
          p_tx_subtype: 'badge_bonus',
          p_balance_type: 'holding',
          p_amount_bsk: bonusAmount,
          p_notes: null,
          p_meta_json: {
            badge_name: normalizedBadge,
            bonus_type: 'holding_balance',
            source: 'badge_purchase',
            timestamp: new Date().toISOString()
          },
          p_related_user_id: null,
          p_related_transaction_id: null
        });

        if (bonusUpdateError) {
          console.error('❌ Failed to credit bonus:', bonusUpdateError);
          throw new Error(`Bonus credit failed: ${bonusUpdateError.message}`);
        }
        
        bonusCredited = true;
        console.log(`✅ Bonus credited: ${bonusAmount} BSK to holding balance`);
      } else {
        console.log(`ℹ️ No bonus configured for ${normalizedBadge} (bonus_bsk_holding = 0)`);
      }
    } catch (bonusError: any) {
      console.error('❌ CRITICAL: Badge bonus processing failed:', bonusError);
      throw new Error(`Failed to process badge bonus: ${bonusError.message}`);
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
