import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgeCommissionRequest {
  user_id: string;
  badge_name: string;
  bsk_amount: number;
  previous_badge?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('💎 [Badge Commission] Function invoked at', new Date().toISOString());

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();
    const { user_id, badge_name, bsk_amount, previous_badge }: BadgeCommissionRequest = requestBody;
    
    console.log('💎 Processing badge subscription commission:', { 
      user_id, 
      badge_name, 
      bsk_amount, 
      previous_badge,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!user_id || !badge_name || !bsk_amount) {
      console.error('❌ Missing required fields:', { user_id, badge_name, bsk_amount });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields',
          received: requestBody
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get team referral settings for commission rate
    const { data: settings } = await supabaseClient
      .from('team_referral_settings')
      .select('direct_commission_percent, enabled, bsk_inr_rate')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings?.enabled) {
      console.log('⚠️ Team referral system is not active');
      return new Response(
        JSON.stringify({ success: false, message: 'Referral system inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const commissionRate = Number(settings.direct_commission_percent) / 100;
    const commissionAmount = bsk_amount * commissionRate;
    const bskInrRate = Number(settings.bsk_inr_rate || 1.0);

    console.log(`📊 Commission rate: ${settings.direct_commission_percent}%, Amount: ${commissionAmount} BSK`);

    // Get direct referrer (Level 1 sponsor)
    const { data: referralTree } = await supabaseClient
      .from('referral_tree')
      .select('ancestor_id')
      .eq('user_id', user_id)
      .eq('level', 1)
      .maybeSingle();

    if (!referralTree?.ancestor_id) {
      console.log('⚠️ No direct referrer found for user:', user_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No direct referrer',
          commission_paid: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sponsorId = referralTree.ancestor_id;
    console.log(`💰 Paying ${commissionAmount} BSK to sponsor:`, sponsorId);

    // Get sponsor's current badge for record
    const { data: sponsorBadge } = await supabaseClient
      .from('user_badge_holdings')
      .select('current_badge')
      .eq('user_id', sponsorId)
      .maybeSingle();

    // Credit withdrawable balance using unified ledger (atomic operation)
    const { error: ledgerError } = await supabaseClient.rpc('record_bsk_transaction', {
      p_user_id: sponsorId,
      p_idempotency_key: `badge_commission_${user_id}_${badge_name}_1`,
      p_tx_type: 'credit',
      p_tx_subtype: 'referral_commission_l1',
      p_balance_type: 'withdrawable',
      p_amount_bsk: commissionAmount,
      p_related_user_id: user_id,
      p_meta_json: {
        badge_purchased: badge_name,
        previous_badge: previous_badge,
        purchase_amount: bsk_amount,
        commission_rate: settings.direct_commission_percent,
        event_type: previous_badge ? 'badge_upgrade' : 'badge_purchase',
        amount_inr: commissionAmount * bskInrRate,
        rate_snapshot: bskInrRate
      }
    });

    if (ledgerError) {
      console.error('Error updating balance via ledger:', ledgerError);
      throw ledgerError;
    }

    // Insert commission record for audit trail
    // NOTE: event_id is required but we use a placeholder UUID since this is called
    // from badge-purchase which doesn't have a badge_purchase_events entry yet
    const { error: commissionError } = await supabaseClient
      .from('referral_commissions')
      .insert({
        earner_id: sponsorId,
        payer_id: user_id,
        related_user_id: user_id,
        level: 1,
        event_type: previous_badge ? 'badge_upgrade' : 'badge_purchase',
        event_id: '00000000-0000-0000-0000-000000000000', // Placeholder since badge_purchase_events isn't used
        commission_type: 'badge_subscription',
        bsk_amount: commissionAmount,
        destination: 'withdrawable',
        status: 'settled',
        earner_badge_at_event: sponsorBadge?.current_badge || 'None',
        amount_inr: commissionAmount * bskInrRate,
        idempotency_key: `badge_commission_${user_id}_${badge_name}_1`,
        created_at: new Date().toISOString()
      });

    if (commissionError) {
      console.error('❌ Error inserting commission audit record:', commissionError);
      // Don't throw - audit trail failure shouldn't block the transaction
      console.log('⚠️ Commission was credited successfully but audit trail insert failed');
    } else {
      console.log('✅ Commission audit record created');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Successfully paid ${commissionAmount} BSK commission to sponsor ${sponsorId} (${processingTime}ms)`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sponsor_id: sponsorId,
        commission_paid: commissionAmount,
        commission_rate: settings.direct_commission_percent,
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Badge commission processing error:', {
      error: error,
      message: error?.message,
      stack: error?.stack,
      processing_time_ms: processingTime
    });
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || 'Internal server error',
        processing_time_ms: processingTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
