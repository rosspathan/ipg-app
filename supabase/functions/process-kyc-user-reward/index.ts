import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KYCRewardRequest {
  user_id: string;
  reward_bsk: number;
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

    const { user_id, reward_bsk } = await req.json() as KYCRewardRequest;

    console.log(`[KYC User Reward] Processing reward for user: ${user_id}, amount: ${reward_bsk} BSK`);

    // Lookup sponsor from referral_relationships
    const { data: referralData } = await supabase
      .from('referral_relationships')
      .select('sponsor_id')
      .eq('referee_id', user_id)
      .maybeSingle();

    const sponsor_id = referralData?.sponsor_id;
    console.log(`[KYC User Reward] Sponsor found: ${sponsor_id || 'none'}`);

    // Credit BSK to holding balance for user using atomic transaction
    const { error: balanceError } = await supabase.rpc('record_bsk_transaction', {
      p_user_id: user_id,
      p_idempotency_key: `kyc_reward_${user_id}`,
      p_tx_type: 'credit',
      p_tx_subtype: 'kyc_completion',
      p_balance_type: 'holding',
      p_amount_bsk: reward_bsk,
      p_meta_json: {
        reward_type: 'kyc_approval',
        destination: 'holding'
      }
    });

    if (balanceError) {
      console.error('[KYC User Reward] Failed to credit holding balance:', balanceError);
      throw new Error(`Failed to credit balance: ${balanceError.message}`);
    }

    console.log(`[KYC User Reward] Successfully credited ${reward_bsk} BSK to user holding balance`);

    // Credit sponsor if exists
    if (sponsor_id) {
      const { error: sponsorBalanceError } = await supabase.rpc('record_bsk_transaction', {
        p_user_id: sponsor_id,
        p_idempotency_key: `kyc_sponsor_reward_${user_id}`,
        p_tx_type: 'credit',
        p_tx_subtype: 'kyc_referral_bonus',
        p_balance_type: 'holding',
        p_amount_bsk: reward_bsk,
        p_meta_json: {
          reward_type: 'kyc_referral_bonus',
          referee_id: user_id,
          destination: 'holding'
        }
      });

      if (sponsorBalanceError) {
        console.error('[KYC User Reward] Failed to credit sponsor balance:', sponsorBalanceError);
        // Don't throw - sponsor reward is secondary
      } else {
        console.log(`[KYC User Reward] Successfully credited ${reward_bsk} BSK to sponsor holding balance`);
        
        // Create sponsor ledger entry
        await supabase
          .from('bonus_ledger')
          .insert({
            user_id: sponsor_id,
            type: 'kyc_referral_bonus',
            amount_bsk: reward_bsk,
            meta_json: {
              reward_type: 'kyc_referral_bonus',
              referee_id: user_id,
              destination: 'holding'
            }
          });
      }
    }

    // Create bonus ledger entry for user
    const { error: ledgerError } = await supabase
      .from('bonus_ledger')
      .insert({
        user_id: user_id,
        type: 'kyc_completion',
        amount_bsk: reward_bsk,
        meta_json: {
          reward_type: 'kyc_approval',
          destination: 'holding'
        }
      });

    if (ledgerError) {
      console.error('[KYC User Reward] Failed to create ledger entry:', ledgerError);
      throw new Error(`Failed to create ledger entry: ${ledgerError.message}`);
    }

    // Update profiles.is_kyc_approved = TRUE
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_kyc_approved: true })
      .eq('user_id', user_id);

    if (profileError) {
      console.error('[KYC Reward] Failed to update is_kyc_approved:', profileError);
      throw new Error(`Failed to set KYC approval flag: ${profileError.message}`);
    }

    console.log(`[KYC User Reward] SUCCESS: Credited ${reward_bsk} BSK to user and ${sponsor_id ? reward_bsk + ' BSK to sponsor' : 'no sponsor'} and set is_kyc_approved = TRUE for user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user_id,
        reward_bsk: reward_bsk,
        sponsor_id: sponsor_id || null,
        sponsor_reward_bsk: sponsor_id ? reward_bsk : 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[KYC User Reward] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});