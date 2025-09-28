import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessClaimRequest {
  claim_id: string;
  action: 'approve' | 'reject';
  approved_amount_inr?: number;
  admin_notes?: string;
  rejection_reason?: string;
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

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { 
      claim_id, 
      action, 
      approved_amount_inr, 
      admin_notes, 
      rejection_reason 
    }: ProcessClaimRequest = await req.json();

    // Get claim details
    const { data: claim, error: claimError } = await supabase
      .from('insurance_bsk_claims')
      .select(`
        *,
        insurance_bsk_policies (*)
      `)
      .eq('id', claim_id)
      .single();

    if (claimError || !claim) {
      return new Response(JSON.stringify({ error: 'Claim not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (claim.status !== 'submitted' && claim.status !== 'in_review') {
      return new Response(JSON.stringify({ error: 'Claim cannot be processed in current status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    let updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: now,
      reviewer_id: user.id,
      admin_notes: admin_notes || null,
      rejection_reason: action === 'reject' ? rejection_reason : null
    };

    if (action === 'approve') {
      updateData.approved_at = now;
      updateData.approved_amount_inr = approved_amount_inr;
    }

    // Update claim
    const { error: updateError } = await supabase
      .from('insurance_bsk_claims')
      .update(updateData)
      .eq('id', claim_id);

    if (updateError) {
      console.error('Claim update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update claim' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If approved, process payout
    if (action === 'approve' && approved_amount_inr) {
      // Get current BSK rate
      const { data: bskRate } = await supabase
        .from('bsk_rates')
        .select('rate_inr_per_bsk')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const currentRate = bskRate?.rate_inr_per_bsk || 1.0;
      const payoutBsk = approved_amount_inr / currentRate;

      // Get global settings for payout destination
      const { data: globalSettings } = await supabase
        .from('insurance_bsk_global_settings')
        .select('payout_destination')
        .limit(1)
        .single();

      const destination = globalSettings?.payout_destination || 'withdrawable';

      // Credit BSK to user's balance
      const { data: currentBalance } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, holding_balance')
        .eq('user_id', claim.user_id)
        .single();

      const updateData = destination === 'withdrawable' 
        ? { withdrawable_balance: (currentBalance?.withdrawable_balance || 0) + payoutBsk }
        : { holding_balance: (currentBalance?.holding_balance || 0) + payoutBsk };

      const { error: balanceError } = await supabase
        .from('user_bsk_balances')
        .upsert({
          user_id: claim.user_id,
          ...updateData
        });

      if (balanceError) {
        console.error('Balance update error:', balanceError);
        return new Response(JSON.stringify({ error: 'Failed to process payout' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create ledger entry
      const { error: ledgerError } = await supabase
        .from('insurance_bsk_ledger')
        .insert({
          user_id: claim.user_id,
          policy_id: claim.policy_id,
          claim_id: claim.id,
          type: 'payout_credit',
          plan_type: claim.insurance_bsk_policies.plan_type,
          bsk_amount: payoutBsk,
          inr_amount: approved_amount_inr,
          rate_snapshot: currentRate,
          destination,
          idempotency_key: `payout-${claim.id}`,
          processor_id: user.id,
          metadata: { 
            claim_reference: claim.claim_reference,
            approved_by: user.id
          }
        });

      if (ledgerError) {
        console.error('Ledger error:', ledgerError);
      }

      // Update claim with payout details
      await supabase
        .from('insurance_bsk_claims')
        .update({
          status: 'paid',
          paid_at: now,
          payout_bsk: payoutBsk,
          payout_rate_snapshot: currentRate
        })
        .eq('id', claim_id);
    }

    return new Response(JSON.stringify({
      success: true,
      claim_id,
      action,
      status: action === 'approve' ? (approved_amount_inr ? 'paid' : 'approved') : 'rejected'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Insurance claim processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});