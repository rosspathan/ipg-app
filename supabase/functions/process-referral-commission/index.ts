import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { referee_id, action, amount } = await req.json();

    console.log('Processing referral commission:', { referee_id, action, amount });

    // Get referral settings
    const { data: settings } = await supabaseClient
      .from('team_referral_settings')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings) {
      throw new Error('Referral system not enabled');
    }

    // Get referee's sponsor
    const { data: referralLink } = await supabaseClient
      .from('referral_links_new')
      .select('sponsor_id')
      .eq('user_id', referee_id)
      .maybeSingle();

    if (!referralLink || !referralLink.sponsor_id) {
      console.log('No sponsor found for user:', referee_id);
      return new Response(
        JSON.stringify({ success: true, message: 'No sponsor to reward' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sponsor_id = referralLink.sponsor_id;

    // Calculate commission
    const commissionPercent = settings.direct_commission_percent || 10;
    const commissionAmount = (amount * commissionPercent) / 100;

    // Check if sponsor meets minimum badge requirement
    if (settings.min_referrer_badge_required && settings.min_referrer_badge_required !== 'ANY_BADGE') {
      const { data: sponsorBadge } = await supabaseClient
        .from('user_badge_status')
        .select('current_badge')
        .eq('user_id', sponsor_id)
        .maybeSingle();

      // Verify badge eligibility (simplified - would need full badge tier checking)
      if (!sponsorBadge || sponsorBadge.current_badge === 'None') {
        console.log('Sponsor does not meet badge requirement');
        return new Response(
          JSON.stringify({ success: false, message: 'Sponsor badge requirement not met' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create referral event
    const { error: eventError } = await supabaseClient
      .from('referral_events')
      .insert({
        user_id: referee_id,
        referrer_id: sponsor_id,
        level: 1, // Direct referral
        amount_bonus: commissionAmount,
        usd_value: commissionAmount * (settings.bsk_inr_rate || 1),
        action: action,
        tx_status: 'completed',
        notes: `Direct commission from ${action}`
      });

    if (eventError) throw eventError;

    // Credit sponsor's BSK balance (withdrawable destination)
    const { error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .upsert({
        user_id: sponsor_id,
        withdrawable_balance: commissionAmount,
        total_earned_withdrawable: commissionAmount
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });

    if (balanceError) throw balanceError;

    // Create bonus ledger entry
    await supabaseClient
      .from('bonus_ledger')
      .insert({
        user_id: sponsor_id,
        type: 'referral_commission',
        amount_bsk: commissionAmount,
        meta_json: {
          referee_id: referee_id,
          action: action,
          level: 1,
          original_amount: amount
        }
      });

    console.log('✅ Referral commission processed:', { sponsor_id, commissionAmount });

    return new Response(
      JSON.stringify({ 
        success: true,
        sponsor_id,
        commission_amount: commissionAmount,
        destination: 'withdrawable'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error processing referral commission:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
