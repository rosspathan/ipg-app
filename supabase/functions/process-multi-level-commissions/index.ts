import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MultiLevelCommissionRequest {
  user_id: string;
  event_type: 'badge_purchase' | 'badge_upgrade';
  base_amount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { user_id, event_type, base_amount }: MultiLevelCommissionRequest = await req.json();

    console.log('🎯 Processing multi-level commissions:', { user_id, event_type, base_amount });

    // Check if referral system is enabled (robust: pick latest row, handle multiples)
    const { data: settings, error: settingsError } = await supabase
      .from('team_referral_settings')
      .select('enabled')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.warn('⚠️ Failed to fetch referral settings, defaulting to enabled=true', settingsError);
    }

    const systemEnabled = settings?.enabled ?? true;

    if (!systemEnabled) {
      console.log('⚠️ Multi-level referral system is disabled');
      return new Response(
        JSON.stringify({ success: false, reason: 'system_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all ancestors from L2 to L50
    const { data: ancestors, error: ancestorsError } = await supabase
      .from('referral_tree')
      .select('ancestor_id, level')
      .eq('user_id', user_id)
      .gte('level', 2)
      .lte('level', 50)
      .order('level', { ascending: true });

    if (ancestorsError) {
      throw ancestorsError;
    }

    if (!ancestors || ancestors.length === 0) {
      console.log('ℹ️ No multi-level sponsors found for user:', user_id);
      return new Response(
        JSON.stringify({ success: true, commissions_paid: 0, message: 'No multi-level sponsors' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${ancestors.length} multi-level sponsors (L2-L50)`);

    // Fetch active reward levels from database
    const { data: rewardLevels, error: rewardLevelsError } = await supabase
      .from('team_income_levels')
      .select('level, bsk_reward, balance_type, is_active')
      .eq('is_active', true)
      .gte('level', 2)
      .lte('level', 50)
      .order('level', { ascending: true });

    if (rewardLevelsError) {
      console.error('❌ Failed to fetch reward levels from database:', rewardLevelsError);
      throw new Error(`Failed to fetch reward levels: ${rewardLevelsError.message}`);
    }

    if (!rewardLevels || rewardLevels.length === 0) {
      console.log('⚠️ No active reward levels configured in team_income_levels table');
      return new Response(
        JSON.stringify({ success: false, reason: 'no_reward_levels_configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create lookup map for fast access: level -> {bsk_reward, balance_type}
    const levelRewardsMap = new Map(
      rewardLevels.map(l => [l.level, { bsk_reward: l.bsk_reward, balance_type: l.balance_type }])
    );

    console.log(`📊 Loaded ${rewardLevels.length} active reward levels from database (L${rewardLevels[0]?.level}-L${rewardLevels[rewardLevels.length - 1]?.level})`);

    let totalCommissionsPaid = 0;
    const commissionRecords = [];
    const skippedRecords = [];

    // Process each level
    for (const ancestor of ancestors) {
      // Get commission config from database
      const levelConfig = levelRewardsMap.get(ancestor.level);
      
      if (!levelConfig) {
        console.log(`⏭️ Skipping L${ancestor.level} - no reward configuration found in database`);
        skippedRecords.push({
          level: ancestor.level,
          sponsor_id: ancestor.ancestor_id,
          reason: 'no_reward_config',
          message: 'Level not configured in team_income_levels table'
        });
        continue;
      }

      const commissionAmount = levelConfig.bsk_reward;
      const balanceType = levelConfig.balance_type || 'withdrawable';
      
      if (commissionAmount === 0) {
        console.log(`⏭️ Skipping L${ancestor.level} - reward amount is 0 BSK`);
        continue;
      }

      // Resolve sponsor badge and unlocked levels with fallbacks and logging
      let sponsorTierName: string | null = null;
      let unlockedLevels = 1;
      let sourceUsed: 'holdings' | 'status' | 'assigned' | 'none' = 'none';
      const tablesChecked: string[] = [];
      let sponsorBadgeError: string | null = null;

      // 1) Try user_badge_holdings (direct fields: current_badge, unlock_levels)
      try {
        tablesChecked.push('user_badge_holdings');
        const { data: sponsorHoldings, error: holdingsError } = await supabase
          .from('user_badge_holdings')
          .select('current_badge, unlock_levels, purchased_at')
          .eq('user_id', ancestor.ancestor_id)
          .order('unlock_levels', { ascending: false })
          .order('purchased_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (holdingsError) {
          sponsorBadgeError = `holdings_error: ${holdingsError.message}`;
        }
        if (sponsorHoldings?.current_badge) {
          sponsorTierName = sponsorHoldings.current_badge;
          unlockedLevels = sponsorHoldings.unlock_levels || 1;
          sourceUsed = 'holdings';
          console.log(`✅ Found badge for ${ancestor.ancestor_id} in user_badge_holdings: ${sponsorTierName}, unlocked L1-L${unlockedLevels}`);
        }
      } catch (e: any) {
        sponsorBadgeError = `holdings_exception: ${e?.message || e}`;
      }

      // 2) Fallback to user_badge_status -> badge_card_config
      if (!sponsorTierName) {
        try {
          tablesChecked.push('user_badge_status');
          const { data: statusRow, error: statusError } = await supabase
            .from('user_badge_status')
            .select('current_badge')
            .eq('user_id', ancestor.ancestor_id)
            .maybeSingle();
          if (statusError) {
            sponsorBadgeError = [sponsorBadgeError, `status_error: ${statusError.message}`].filter(Boolean).join('; ');
          }
          if (statusRow?.current_badge) {
            const { data: cfgRow, error: cfgError } = await supabase
              .from('badge_card_config')
              .select('tier_name, unlocked_levels')
              .eq('tier_name', statusRow.current_badge)
              .maybeSingle();
            if (cfgError) {
              sponsorBadgeError = [sponsorBadgeError, `config_error: ${cfgError.message}`].filter(Boolean).join('; ');
            }
            if (cfgRow) {
              sponsorTierName = cfgRow.tier_name;
              unlockedLevels = cfgRow.unlocked_levels || 1;
              sourceUsed = 'status';
            }
          }
        } catch (e: any) {
          sponsorBadgeError = [sponsorBadgeError, `status_exception: ${e?.message || e}`].filter(Boolean).join('; ');
        }
      }

      // 3) Fallback to badge_cards_new (assigned cards)
      if (!sponsorTierName) {
        try {
          tablesChecked.push('badge_cards_new');
          const { data: assignedRow, error: assignedError } = await supabase
            .from('badge_cards_new')
            .select('badge_card_config!inner(tier_name, unlocked_levels)')
            .eq('user_id', ancestor.ancestor_id)
            .order('badge_card_config.unlocked_levels', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (assignedError) {
            sponsorBadgeError = [sponsorBadgeError, `assigned_error: ${assignedError.message}`].filter(Boolean).join('; ');
          }
          if (assignedRow?.badge_card_config) {
            sponsorTierName = assignedRow.badge_card_config.tier_name;
            unlockedLevels = assignedRow.badge_card_config.unlocked_levels || 1;
            sourceUsed = 'assigned';
          }
        } catch (e: any) {
          sponsorBadgeError = [sponsorBadgeError, `assigned_exception: ${e?.message || e}`].filter(Boolean).join('; ');
        }
      }

      if (!sponsorTierName) {
        console.log(`⏭️ Skipping L${ancestor.level} for ${ancestor.ancestor_id} - no badge detected from any source`);
        skippedRecords.push({
          level: ancestor.level,
          sponsor_id: ancestor.ancestor_id,
          reason: 'no_badge',
          required_badge: 'Any badge to unlock Level 2+',
          debug: { source_used: sourceUsed, sponsorBadgeError, tables_checked: tablesChecked }
        });
        continue;
      }

      if (ancestor.level > unlockedLevels) {
        console.log(`⏭️ Skipping L${ancestor.level} for ${ancestor.ancestor_id} - level locked (has ${sponsorTierName}, unlocked up to L${unlockedLevels})`);
        skippedRecords.push({
          level: ancestor.level,
          sponsor_id: ancestor.ancestor_id,
          reason: 'level_locked',
          current_badge: sponsorTierName,
          unlocked_up_to: unlockedLevels,
          upgrade_needed: ancestor.level <= 10 ? 'Silver' : 
                         ancestor.level <= 20 ? 'Gold' :
                         ancestor.level <= 30 ? 'Platinum' :
                         ancestor.level <= 40 ? 'Diamond' : 'i-Smart VIP',
          debug: { source_used: sourceUsed, sponsorBadgeError, tables_checked: tablesChecked }
        });
        continue;
      }

      // Duplicate protection: skip if a commission was already issued for this level/event
      try {
        const { data: existingCommission } = await supabase
          .from('referral_commissions')
          .select('id')
          .eq('earner_id', ancestor.ancestor_id)
          .eq('payer_id', user_id)
          .eq('level', ancestor.level)
          .eq('commission_type', 'multi_level')
          .eq('event_type', event_type)
          .maybeSingle();
        if (existingCommission) {
          console.log(`⏭️ Skipping L${ancestor.level} for ${ancestor.ancestor_id} - duplicate commission detected`);
          skippedRecords.push({
            level: ancestor.level,
            sponsor_id: ancestor.ancestor_id,
            reason: 'duplicate',
            debug: { source_used: sourceUsed, sponsorBadgeError, tables_checked: tablesChecked }
          });
          continue;
        }
      } catch (_) {
        // if duplicate check fails, continue processing
      }

      console.log(`💰 Processing L${ancestor.level} commission for ${ancestor.ancestor_id}: ${commissionAmount} BSK to ${balanceType} (Badge: ${sponsorTierName}, Unlocked: L1-L${unlockedLevels}, source=${sourceUsed})`);

      try {
        // Credit balance using unified ledger (atomic operation) - balance type from database
        const { error: ledgerError } = await supabase.rpc('record_bsk_transaction', {
          p_user_id: ancestor.ancestor_id,
          p_idempotency_key: `multi_level_commission_${user_id}_${ancestor.level}_${Date.now()}`,
          p_tx_type: 'credit',
          p_tx_subtype: 'referral_commission_multi',
          p_balance_type: balanceType,
          p_amount_bsk: commissionAmount,
          p_amount_inr: commissionAmount,
          p_rate_snapshot: 1.0,
          p_related_user_id: user_id,
          p_meta_json: {
            referral_user_id: user_id,
            level: ancestor.level,
            event_type: event_type,
            base_amount: base_amount,
            sponsor_badge: sponsorTierName,
            unlocked_levels: unlockedLevels,
            balance_type: balanceType
          }
        });

        if (ledgerError) {
          console.error(`❌ Ledger update failed for L${ancestor.level}:`, ledgerError);
          continue;
        }

        // Create commission record for audit trail
        const { data: commissionRecord } = await supabase
          .from('referral_commissions')
          .insert({
            earner_id: ancestor.ancestor_id,
            payer_id: user_id,
            level: ancestor.level,
            event_type: event_type,
            commission_type: 'multi_level',
            bsk_amount: commissionAmount,
            destination: balanceType,
            status: 'settled',
            earner_badge_at_event: sponsorTierName
          })
          .select()
          .single();

        totalCommissionsPaid += commissionAmount;
        commissionRecords.push({
          level: ancestor.level,
          sponsor_id: ancestor.ancestor_id,
          amount: commissionAmount
        });

        console.log(`✅ L${ancestor.level} commission credited successfully`);
      } catch (error) {
        console.error(`❌ Failed to process L${ancestor.level} commission:`, error);
        // Continue with other levels even if one fails
      }
    }

    console.log(`🎉 Multi-level commission processing complete. Total paid: ${totalCommissionsPaid} BSK across ${commissionRecords.length} levels`);
    console.log(`⏭️ Skipped ${skippedRecords.length} levels due to badge restrictions`);

    return new Response(
      JSON.stringify({
        success: true,
        commissions_paid: totalCommissionsPaid,
        levels_processed: commissionRecords.length,
        levels_skipped: skippedRecords.length,
        details: commissionRecords,
        skipped_details: skippedRecords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in multi-level commission processing:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
