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

  // ============================================
  // LOAN PROGRAM ARCHIVED - NO NEW APPLICATIONS
  // ============================================
  // The BSK loan program has been archived. New applications are permanently blocked.
  // Existing loans continue to be serviced (EMI payments, auto-debit, completion).
  // This block is a hard stop - do not remove without explicit business approval.
  console.log('[create-bsk-loan] BLOCKED: Loan program is archived. No new applications accepted.');
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Loan program archived',
      message: 'The BSK Loan program is no longer accepting new applications. Existing loans will continue to be serviced normally.'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 }
  );

  // Original code below is preserved but unreachable for reference
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { amount_bsk } = await req.json();
    console.log('[create-bsk-loan] User:', user.id, 'Amount:', amount_bsk);

    if (!amount_bsk || amount_bsk <= 0) throw new Error('Invalid loan amount');

    const MAX_LOAN_AMOUNT = 50000;
    if (amount_bsk > MAX_LOAN_AMOUNT) {
      throw new Error(`Maximum loan amount is ${MAX_LOAN_AMOUNT} BSK`);
    }

    const { data: existingLoan } = await supabaseClient
      .from('bsk_loans')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved', 'disbursed'])
      .maybeSingle();

    if (existingLoan) throw new Error('You already have an active loan');

    const { data: balance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('holding_balance')
      .eq('user_id', user.id)
      .single();

    if (balanceError) throw new Error('Failed to fetch balance');

    const requiredCollateral = amount_bsk * 2;
    if (!balance || balance.holding_balance < requiredCollateral) {
      throw new Error(`Insufficient collateral. You need ${requiredCollateral} BSK in holding balance (50% LTV)`);
    }

    const TENOR_WEEKS = 16;
    const loanNumber = `LOAN-${Date.now()}-${user.id.substring(0, 8).toUpperCase()}`;

    const { data: loan, error: loanError } = await supabaseClient
      .from('bsk_loans')
      .insert({
        user_id: user.id,
        loan_number: loanNumber,
        amount_inr: amount_bsk,
        disbursal_rate_snapshot: 1,
        principal_bsk: amount_bsk,
        tenor_weeks: TENOR_WEEKS,
        interest_rate_weekly: 0.0,
        interest_type: 'flat',
        origination_fee_percent: 0.0,
        origination_fee_bsk: 0,
        late_fee_percent: 2.0,
        grace_period_days: 3,
        net_disbursed_bsk: amount_bsk,
        total_due_bsk: amount_bsk,
        outstanding_bsk: amount_bsk,
        status: 'pending',
        schedule_denomination: 'fixed_bsk',
        policy_snapshot: {
          ltv_ratio: 0.5,
          required_collateral: requiredCollateral,
          interest_rate: 0.0,
          tenor_weeks: TENOR_WEEKS
        },
        region: 'IN',
        admin_notes: 'Auto-approved based on collateral'
      })
      .select()
      .single();

    if (loanError) throw loanError;

    console.log('✅ Loan application created:', loan.id);

    return new Response(
      JSON.stringify({
        success: true,
        loan: {
          id: loan.id,
          loan_number: loan.loan_number,
          amount_bsk: amount_bsk,
          net_disbursed_bsk: amount_bsk,
          total_due_bsk: amount_bsk,
          tenor_weeks: TENOR_WEEKS,
          weekly_payment: amount_bsk / TENOR_WEEKS,
          status: loan.status
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
