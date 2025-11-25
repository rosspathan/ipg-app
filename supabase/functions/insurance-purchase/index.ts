import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseRequest {
  plan_type: 'accident' | 'trading' | 'life';
  beneficiaries?: any;
  term_years?: number; // For life plans
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { plan_type, beneficiaries, term_years }: PurchaseRequest = await req.json();

    // Get plan configuration
    const { data: planConfig, error: planError } = await supabase
      .from('insurance_bsk_plan_configs')
      .select('*')
      .eq('plan_type', plan_type)
      .eq('is_enabled', true)
      .single();

    if (planError || !planConfig) {
      return new Response(JSON.stringify({ error: 'Plan not available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get current BSK rate
    const { data: bskRate } = await supabase
      .from('bsk_rates')
      .select('rate_inr_per_bsk')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentRate = bskRate?.rate_inr_per_bsk || 1.0;
    const premiumBsk = planConfig.premium_inr / currentRate;

    // Check user's BSK balance
    const { data: balance } = await supabase
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single();

    if (!balance || balance.withdrawable_balance < premiumBsk) {
      return new Response(JSON.stringify({ error: 'Insufficient BSK balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate policy number
    const policyNumber = `INS-${plan_type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Calculate dates based on plan type
    let endAt = null;
    let maturityAt = null;
    
    if (plan_type === 'accident') {
      endAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    } else if (plan_type === 'trading') {
      endAt = new Date(Date.now() + (planConfig.plan_settings.coverage_period_days || 30) * 24 * 60 * 60 * 1000);
    } else if (plan_type === 'life' && term_years) {
      maturityAt = new Date(Date.now() + term_years * 365 * 24 * 60 * 60 * 1000);
    }

    // Create policy
    const { data: policy, error: policyError } = await supabase
      .from('insurance_bsk_policies')
      .insert({
        user_id: user.id,
        plan_type,
        policy_number: policyNumber,
        premium_inr: planConfig.premium_inr,
        premium_bsk: premiumBsk,
        rate_snapshot: currentRate,
        end_at: endAt,
        maturity_at: maturityAt,
        region: 'global', // TODO: Get from user profile
        beneficiaries: beneficiaries || null,
        coverage_config: planConfig.plan_settings
      })
      .select()
      .single();

    if (policyError) {
      console.error('Policy creation error:', policyError);
      return new Response(JSON.stringify({ error: 'Failed to create policy' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ATOMIC: Debit BSK from user's withdrawable balance using record_bsk_transaction
    const idempotencyKey = `insurance_premium_${policy.id}_${Date.now()}`
    
    const { data: debitResult, error: balanceError } = await supabase.rpc(
      'record_bsk_transaction',
      {
        p_user_id: user.id,
        p_idempotency_key: idempotencyKey,
        p_tx_type: 'debit',
        p_tx_subtype: 'insurance_premium',
        p_balance_type: 'withdrawable',
        p_amount_bsk: premiumBsk,
        p_notes: `Insurance premium: ${plan_type} plan - Policy #${policyNumber}`,
        p_meta_json: {
          policy_id: policy.id,
          policy_number: policyNumber,
          plan_type: plan_type,
          premium_inr: planConfig.premium_inr,
          rate_snapshot: currentRate
        }
      }
    )

    if (balanceError) {
      console.error('Balance update error:', balanceError);
      // Rollback policy creation
      await supabase.from('insurance_bsk_policies').delete().eq('id', policy.id);
      return new Response(JSON.stringify({ error: 'Failed to process payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Atomically debited ${premiumBsk} BSK for insurance premium (tx: ${debitResult})`)

    // Create ledger entry
    const { error: ledgerError } = await supabase
      .from('insurance_bsk_ledger')
      .insert({
        user_id: user.id,
        policy_id: policy.id,
        type: 'premium_debit',
        plan_type,
        bsk_amount: -premiumBsk,
        inr_amount: planConfig.premium_inr,
        rate_snapshot: currentRate,
        destination: 'withdrawable',
        idempotency_key: `premium-${policy.id}`,
        processor_id: user.id,
        metadata: { policy_number: policyNumber }
      });

    if (ledgerError) {
      console.error('Ledger error:', ledgerError);
    }

    return new Response(JSON.stringify({
      success: true,
      policy: {
        id: policy.id,
        policy_number: policyNumber,
        plan_type,
        premium_bsk: premiumBsk,
        premium_inr: planConfig.premium_inr,
        start_at: policy.start_at,
        end_at: endAt,
        maturity_at: maturityAt
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Insurance purchase error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});