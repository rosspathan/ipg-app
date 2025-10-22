import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixRequest {
  user_id: string;
  badge_name: string;
  bonus_amount: number;
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

    const { user_id, badge_name, bonus_amount }: FixRequest = await req.json();

    console.log('Fixing badge bonus for:', { user_id, badge_name, bonus_amount });

    // 1. Get current balance
    const { data: currentBalance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('holding_balance, total_earned_holding')
      .eq('user_id', user_id)
      .single();

    if (balanceError) {
      throw new Error(`Failed to fetch balance: ${balanceError.message}`);
    }

    // 2. Credit bonus to holding balance
    const { error: updateError } = await supabaseClient
      .from('user_bsk_balances')
      .update({
        holding_balance: Number(currentBalance.holding_balance) + bonus_amount,
        total_earned_holding: Number(currentBalance.total_earned_holding) + bonus_amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);

    if (updateError) {
      throw new Error(`Failed to update balance: ${updateError.message}`);
    }

    // 3. Create badge_bonus ledger entry (backdated to purchase time)
    const { error: ledgerError } = await supabaseClient
      .from('bonus_ledger')
      .insert({
        user_id,
        type: 'badge_bonus',
        amount_bsk: bonus_amount,
        asset: 'BSK',
        meta_json: {
          badge_name,
          bonus_type: 'holding_balance',
          source: 'badge_purchase',
          note: 'Retroactive bonus credit - system correction'
        },
        usd_value: 0,
      });

    if (ledgerError) {
      throw new Error(`Failed to create ledger entry: ${ledgerError.message}`);
    }

    console.log(`✅ Successfully credited ${bonus_amount} BSK bonus for ${badge_name}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Credited ${bonus_amount} BSK bonus to user ${user_id}`,
        new_holding_balance: Number(currentBalance.holding_balance) + bonus_amount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fix badge bonus error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
