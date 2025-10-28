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

    // Credit 5 BSK to user's holding balance
    const { error: balanceError } = await supabase
      .from('user_bsk_balances')
      .upsert({
        user_id: user_id,
        holding_balance: supabase.raw(`COALESCE(holding_balance, 0) + ${reward_bsk}`),
        total_earned_holding: supabase.raw(`COALESCE(total_earned_holding, 0) + ${reward_bsk}`),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (balanceError) {
      console.error('[KYC User Reward] Failed to credit holding balance:', balanceError);
      throw new Error(`Failed to credit balance: ${balanceError.message}`);
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

    console.log(`[KYC User Reward] SUCCESS: Credited ${reward_bsk} BSK to user ${user_id}`);

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