import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse request body
    const { amount_inr, tenor_weeks } = await req.json();

    console.log('Creating BSK loan for user:', user.id, 'Amount:', amount_inr, 'Tenor:', tenor_weeks);

    // Validate inputs
    if (!amount_inr || !tenor_weeks) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount_inr, tenor_weeks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (amount_inr < 1000 || amount_inr > 50000) {
      return new Response(
        JSON.stringify({ error: 'Loan amount must be between 1000 and 50000 INR' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (tenor_weeks < 4 || tenor_weeks > 12) {
      return new Response(
        JSON.stringify({ error: 'Loan duration must be between 4 and 12 weeks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get loan configuration
    const { data: loanConfig, error: configError } = await supabaseClient
      .from('program_modules')
      .select('id')
      .eq('key', 'bsk_loans')
      .single();

    if (configError || !loanConfig) {
      console.error('Error fetching loan config:', configError);
      return new Response(
        JSON.stringify({ error: 'Loan program not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const { data: config, error: configFetchError } = await supabaseClient
      .from('program_configs')
      .select('config_json')
      .eq('module_id', loanConfig.id)
      .eq('is_current', true)
      .eq('status', 'published')
      .maybeSingle();

    if (configFetchError || !config) {
      console.error('Error fetching published config:', configFetchError);
      return new Response(
        JSON.stringify({ error: 'Loan configuration not available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const loanSettings = config.config_json;

    // Check if user has an active loan
    const { data: existingLoans, error: existingError } = await supabaseClient
      .from('bsk_loans')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'active', 'disbursed']);

    if (existingError) {
      console.error('Error checking existing loans:', existingError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing loans' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (existingLoans && existingLoans.length > 0) {
      return new Response(
        JSON.stringify({ error: 'You already have an active or pending loan' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Calculate loan parameters
    const interestRate = loanSettings.interest_rate || 5;
    const processingFeePercent = loanSettings.processing_fee_percent || 2;
    const lateFeePercent = loanSettings.late_fee_percent || 10;
    const gracePeriodDays = loanSettings.grace_period_days || 3;
    const bskRate = 1.0; // BSK to INR rate (1:1 for now)

    const principalBsk = amount_inr / bskRate;
    const originationFeeBsk = (principalBsk * processingFeePercent) / 100;
    const netDisbursedBsk = principalBsk - originationFeeBsk;
    
    const totalInterest = (principalBsk * interestRate * tenor_weeks) / 100;
    const totalDueBsk = principalBsk + totalInterest;
    const weeklyPayment = totalDueBsk / tenor_weeks;

    // Generate unique loan number
    const loanNumber = `BSK-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create loan record
    const { data: loan, error: loanError } = await supabaseClient
      .from('bsk_loans')
      .insert({
        user_id: user.id,
        loan_number: loanNumber,
        amount_inr: amount_inr,
        disbursal_rate_snapshot: bskRate,
        principal_bsk: principalBsk,
        tenor_weeks: tenor_weeks,
        interest_type: 'simple_weekly',
        interest_rate_weekly: interestRate,
        origination_fee_percent: processingFeePercent,
        origination_fee_bsk: originationFeeBsk,
        late_fee_percent: lateFeePercent,
        grace_period_days: gracePeriodDays,
        schedule_denomination: 'BSK',
        net_disbursed_bsk: netDisbursedBsk,
        total_due_bsk: totalDueBsk,
        paid_bsk: 0,
        outstanding_bsk: totalDueBsk,
        status: 'pending',
        applied_at: new Date().toISOString(),
        policy_snapshot: loanSettings,
        region: 'global',
        user_badge: 'none'
      })
      .select()
      .single();

    if (loanError) {
      console.error('Error creating loan:', loanError);
      return new Response(
        JSON.stringify({ error: 'Failed to create loan application' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create payment schedule
    const paymentSchedule = [];
    const startDate = new Date();
    
    for (let week = 1; week <= tenor_weeks; week++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + (week * 7));

      paymentSchedule.push({
        loan_id: loan.id,
        user_id: user.id,
        week_number: week,
        payment_amount: weeklyPayment,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending'
      });
    }

    const { error: scheduleError } = await supabaseClient
      .from('bsk_loan_payments')
      .insert(paymentSchedule);

    if (scheduleError) {
      console.error('Error creating payment schedule:', scheduleError);
      // Continue anyway, schedule can be regenerated
    }

    console.log('Loan created successfully:', loan.id);

    return new Response(
      JSON.stringify({
        success: true,
        loan_id: loan.id,
        loan_number: loanNumber,
        principal_bsk: principalBsk,
        net_disbursed_bsk: netDisbursedBsk,
        total_due_bsk: totalDueBsk,
        weekly_payment: weeklyPayment,
        status: 'pending',
        message: 'Loan application submitted successfully. Awaiting admin approval.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
