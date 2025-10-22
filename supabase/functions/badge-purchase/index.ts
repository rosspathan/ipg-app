import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const totalBalance = Number(balance.withdrawable_balance) + Number(balance.holding_balance);
    
    if (totalBalance < bsk_amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient BSK balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Deduct BSK from user's balance (prioritize withdrawable first)
    let remainingDeduction = bsk_amount;
    let withdrawableDeduction = 0;
    let holdingDeduction = 0;

    if (Number(balance.withdrawable_balance) >= remainingDeduction) {
      withdrawableDeduction = remainingDeduction;
    } else {
      withdrawableDeduction = Number(balance.withdrawable_balance);
      holdingDeduction = remainingDeduction - withdrawableDeduction;
    }

    const { error: updateBalanceError } = await supabaseClient
      .from('user_bsk_balances')
      .update({
        withdrawable_balance: Number(balance.withdrawable_balance) - withdrawableDeduction,
        holding_balance: Number(balance.holding_balance) - holdingDeduction,
      })
      .eq('user_id', user_id);

    if (updateBalanceError) {
      console.error('Balance update error:', updateBalanceError);
      throw new Error('Failed to update balance');
    }

    // 3. Create or update badge holding
    const { error: badgeError } = await supabaseClient
      .from('user_badge_holdings')
      .upsert({
        user_id,
        current_badge: badge_name,
        previous_badge,
        price_bsk: bsk_amount,
        purchased_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (badgeError) {
      console.error('Badge holding error:', badgeError);
      // Rollback balance
      await supabaseClient
        .from('user_bsk_balances')
        .update({
          withdrawable_balance: Number(balance.withdrawable_balance),
          holding_balance: Number(balance.holding_balance),
        })
        .eq('user_id', user_id);
      throw new Error('Failed to update badge holding');
    }

    // 4. Process NEW 50-level referral commissions
    try {
      // Call the new badge sale commission processor
      const commissionResponse = await supabaseClient.functions.invoke('process-badge-sale-commissions', {
        body: {
          payer_id: user_id,
          badge_name,
          delta_amount: bsk_amount,
          is_upgrade,
          previous_badge
        }
      });

      if (commissionResponse.error) {
        console.error('Commission processing error:', commissionResponse.error);
      } else {
        console.log('Badge sale commission processed:', commissionResponse.data);
      }
    } catch (commissionError) {
      console.error('Commission processor error (non-critical):', commissionError);
      // Don't fail the purchase if commission fails
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
      } else if (badgeThreshold && Number(badgeThreshold.bonus_bsk_holding || 0) > 0) {
        bonusAmount = Number(badgeThreshold.bonus_bsk_holding);
      }

      if (thresholdError) {
        console.error('Error fetching badge threshold:', thresholdError);
      }

      // ALWAYS credit bonus for VIP badge purchases, even if already set
      // This ensures VIP purchases are treated consistently
      if (bonusAmount > 0) {
        console.log(`💰 Crediting ${bonusAmount} BSK bonus for ${badge_name} (normalized: ${normalizedBadge})`);
        
        // Get current balance - create if doesn't exist
        const { data: currentBalance, error: balanceQueryError } = await supabaseClient
          .from('user_bsk_balances')
          .select('holding_balance, total_earned_holding')
          .eq('user_id', user_id)
          .maybeSingle();

        if (balanceQueryError) {
          console.error('Error fetching balance for bonus:', balanceQueryError);
          throw balanceQueryError;
        }
        
        // Credit bonus to holding balance - upsert to handle new users
        const { error: bonusUpdateError } = await supabaseClient
          .from('user_bsk_balances')
          .upsert({
            user_id,
            holding_balance: Number(currentBalance?.holding_balance || 0) + bonusAmount,
            total_earned_holding: Number(currentBalance?.total_earned_holding || 0) + bonusAmount,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (bonusUpdateError) {
          console.error('❌ Failed to update balance with bonus:', bonusUpdateError);
          throw bonusUpdateError;
        } else {
          // Create ledger entry
          const { error: ledgerError } = await supabaseClient
            .from('bonus_ledger')
            .insert({
              user_id,
              type: 'badge_bonus',
              amount_bsk: bonusAmount,
              asset: 'BSK',
              meta_json: {
                badge_name,
                normalized_badge: normalizedBadge,
                bonus_type: 'holding_balance',
                source: 'badge_purchase',
                timestamp: new Date().toISOString()
              },
              usd_value: 0,
            });

          if (ledgerError) {
            console.error('❌ Failed to create bonus ledger entry:', ledgerError);
            // Don't throw - balance was already credited
          } else {
            bonusCredited = true;
            console.log(`✅ Successfully credited ${bonusAmount} BSK bonus to holding balance`);
            console.log(`   User: ${user_id}`);
            console.log(`   Badge: ${badge_name} (${normalizedBadge})`);
          }
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
          // Trigger milestone check for sponsor
          await supabaseClient.functions.invoke('check-vip-milestones', {
            body: {
              referrer_id: sponsor.ancestor_id,
              new_vip_referee_id: user_id
            }
          });
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

    console.log('Badge purchase completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        bonus_credited: bonusCredited,
        bonus_amount: bonusAmount
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
