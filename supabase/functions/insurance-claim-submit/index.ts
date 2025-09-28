import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaimRequest {
  policy_id: string;
  claim_type: 'accident_claim' | 'trading_loss' | 'life_maturity';
  description: string;
  evidence_documents: any[];
  incident_at?: string; // For accident claims
  period_start?: string; // For trading claims
  period_end?: string; // For trading claims
  requested_amount_inr?: number;
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

    const { 
      policy_id, 
      claim_type, 
      description, 
      evidence_documents,
      incident_at,
      period_start,
      period_end,
      requested_amount_inr
    }: ClaimRequest = await req.json();

    // Verify policy belongs to user and is active
    const { data: policy, error: policyError } = await supabase
      .from('insurance_bsk_policies')
      .select('*')
      .eq('id', policy_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (policyError || !policy) {
      return new Response(JSON.stringify({ error: 'Policy not found or not active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate claim based on plan type
    const planSettings = policy.coverage_config;
    const now = new Date();
    
    if (policy.plan_type === 'accident') {
      // Check waiting period
      const waitingPeriodDays = planSettings.waiting_period_days || 7;
      const startDate = new Date(policy.start_at);
      const waitingPeriodEnd = new Date(startDate.getTime() + waitingPeriodDays * 24 * 60 * 60 * 1000);
      
      if (now < waitingPeriodEnd) {
        return new Response(JSON.stringify({ error: 'Still in waiting period' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if user has already used their claims for this year
      const { data: existingClaims } = await supabase
        .from('insurance_bsk_claims')
        .select('*')
        .eq('policy_id', policy_id)
        .eq('status', 'approved')
        .gte('created_at', new Date(now.getFullYear(), 0, 1).toISOString());

      const claimsPerYear = planSettings.claims_per_year || 1;
      if (existingClaims && existingClaims.length >= claimsPerYear) {
        return new Response(JSON.stringify({ error: 'Annual claim limit reached' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (policy.plan_type === 'trading') {
      // Validate coverage period
      if (!period_start || !period_end) {
        return new Response(JSON.stringify({ error: 'Coverage period required for trading claims' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if period is within policy coverage
      const policyStart = new Date(policy.start_at);
      const policyEnd = new Date(policy.end_at!);
      const claimPeriodStart = new Date(period_start);
      const claimPeriodEnd = new Date(period_end);

      if (claimPeriodStart < policyStart || claimPeriodEnd > policyEnd) {
        return new Response(JSON.stringify({ error: 'Claim period outside policy coverage' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (policy.plan_type === 'life') {
      // Check if policy has matured
      if (claim_type === 'life_maturity') {
        const maturityDate = new Date(policy.maturity_at!);
        if (now < maturityDate) {
          return new Response(JSON.stringify({ error: 'Policy has not yet matured' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // Generate claim reference
    const claimReference = `CLM-${claim_type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Auto-attach internal data for trading claims
    let internalData = null;
    if (policy.plan_type === 'trading' && period_start && period_end) {
      // Get trading data for the period (placeholder - would integrate with actual trading system)
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('buyer_id', user.id)
        .gte('trade_time', period_start)
        .lte('trade_time', period_end);

      internalData = {
        trades: trades || [],
        period_start,
        period_end,
        generated_at: new Date().toISOString()
      };
    }

    // Create claim
    const { data: claim, error: claimError } = await supabase
      .from('insurance_bsk_claims')
      .insert({
        policy_id,
        user_id: user.id,
        claim_type,
        claim_reference: claimReference,
        incident_at: incident_at ? new Date(incident_at) : null,
        period_start: period_start ? new Date(period_start) : null,
        period_end: period_end ? new Date(period_end) : null,
        description,
        evidence_documents,
        internal_data: internalData,
        status: 'submitted',
        submitted_at: new Date(),
        requested_amount_inr
      })
      .select()
      .single();

    if (claimError) {
      console.error('Claim creation error:', claimError);
      return new Response(JSON.stringify({ error: 'Failed to create claim' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      claim: {
        id: claim.id,
        claim_reference: claimReference,
        status: 'submitted',
        submitted_at: claim.submitted_at
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Insurance claim error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});