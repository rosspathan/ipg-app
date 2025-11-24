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

    // Credit BSK to holding balance using atomic transaction
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

    console.log(`[KYC User Reward] Successfully credited ${reward_bsk} BSK to holding balance`);

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

    console.log(`[KYC User Reward] SUCCESS: Credited ${reward_bsk} BSK and set is_kyc_approved = TRUE for user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user_id,
        reward_bsk: reward_bsk
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