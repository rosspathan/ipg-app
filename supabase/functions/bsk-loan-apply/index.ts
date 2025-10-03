import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoanApplicationRequest {
  amount_inr: number;
  region?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { amount_inr, region = 'IN' }: LoanApplicationRequest = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`BSK Loan Application: User ${user.id} applying for ₹${amount_inr}`);

    // Load loan settings
    const { data: settings, error: settingsError } = await supabase
      .from('bsk_loan_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      throw new Error('Loan settings not found');
    }

    if (!settings.system_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Loan system is currently disabled' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Validate amount range
    if (amount_inr < settings.min_amount_inr || amount_inr > settings.max_amount_inr) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Loan amount must be between ₹${settings.min_amount_inr} and ₹${settings.max_amount_inr}` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Check region restrictions
    const allowedRegions = settings.region_restrictions as string[];
    if (!allowedRegions.includes(region)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Loans not available in your region' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Check existing active loans
    const { data: existingLoans, error: existingError } = await supabase
      .from('bsk_loans')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved', 'active', 'in_arrears']);

    if (existingError) {
      throw new Error('Failed to check existing loans');
    }

    if (existingLoans && existingLoans.length >= settings.max_concurrent_loans_per_user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Maximum ${settings.max_concurrent_loans_per_user} active loan(s) allowed per user` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Get user profile for KYC and badge check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('kyc_status')
      .eq('user_id', user.id)
      .single();

    if (settings.kyc_required && (!profile || profile.kyc_status !== 'verified')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'KYC verification required before loan application',
          kyc_required: true
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // Get current BSK rate
    const { data: bskRate, error: rateError } = await supabase
      .from('bsk_rates')
      .select('rate_inr_per_bsk')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (rateError || !bskRate) {
      throw new Error('BSK rate not available');
    }

    const rateSnapshot = bskRate.rate_inr_per_bsk;
    const principalBsk = amount_inr / rateSnapshot;

    // Calculate fees (either percentage or fixed)
    const processingFeeBsk = settings.processing_fee_fixed_bsk > 0
      ? settings.processing_fee_fixed_bsk
      : (principalBsk * settings.processing_fee_percent) / 100;
    const netDisbursedBsk = principalBsk - processingFeeBsk;

    // Calculate total due (0% interest by default)
    let totalDueBsk = principalBsk;
    if (settings.default_interest_rate_weekly > 0) {
      if (settings.interest_type === 'flat') {
        const totalInterest = principalBsk * settings.default_interest_rate_weekly * settings.default_tenor_weeks;
        totalDueBsk = principalBsk + totalInterest;
      }
      // Reducing balance calculation would go here
    }

    // Generate loan number
    const loanNumber = `BSK${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create loan application
    const { data: loan, error: loanError } = await supabase
      .from('bsk_loans')
      .insert({
        user_id: user.id,
        loan_number: loanNumber,
        amount_inr,
        disbursal_rate_snapshot: rateSnapshot,
        principal_bsk: principalBsk,
        tenor_weeks: settings.default_tenor_weeks,
        interest_type: settings.interest_type,
        interest_rate_weekly: settings.default_interest_rate_weekly,
        origination_fee_percent: settings.processing_fee_percent || settings.origination_fee_percent || 0,
        origination_fee_bsk: processingFeeBsk,
        late_fee_percent: settings.late_fee_percent,
        grace_period_days: settings.grace_period_days,
        schedule_denomination: settings.schedule_denomination,
        net_disbursed_bsk: netDisbursedBsk,
        total_due_bsk: totalDueBsk,
        outstanding_bsk: totalDueBsk,
        region,
        policy_snapshot: settings,
        status: 'pending'
      })
      .select()
      .single();

    if (loanError) {
      console.error('Loan creation error:', loanError);
      throw new Error('Failed to create loan application');
    }

    console.log(`BSK Loan Created: ${loan.loan_number} for ₹${amount_inr} (${principalBsk.toFixed(2)} BSK)`);

    // Generate installment schedule (will be created after approval)
    const weeklyEmiCalculation = settings.schedule_denomination === 'fixed_bsk' 
      ? { emi_bsk: totalDueBsk / settings.default_tenor_weeks, emi_inr: null }
      : { emi_bsk: null, emi_inr: amount_inr / settings.default_tenor_weeks };

    return new Response(
      JSON.stringify({
        success: true,
        loan: {
          id: loan.id,
          loan_number: loan.loan_number,
          amount_inr,
          principal_bsk: principalBsk.toFixed(4),
          net_disbursed_bsk: netDisbursedBsk.toFixed(4),
          total_due_bsk: totalDueBsk.toFixed(4),
          rate_snapshot: rateSnapshot,
          weekly_emi: weeklyEmiCalculation,
          tenor_weeks: settings.default_tenor_weeks,
          status: 'pending'
        },
        message: 'Loan application submitted successfully. Pending review.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('BSK Loan Application Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});