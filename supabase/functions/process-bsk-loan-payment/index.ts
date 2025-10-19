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
    const { payment_id, amount_bsk } = await req.json();

    console.log('Processing loan payment:', payment_id, 'Amount:', amount_bsk, 'User:', user.id);

    // Validate inputs
    if (!payment_id || !amount_bsk) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: payment_id, amount_bsk' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabaseClient
      .from('bsk_loan_payments')
      .select('*, bsk_loans(*)')
      .eq('id', payment_id)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Payment not found or unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (payment.status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Payment already completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check user's BSK balance
    const { data: bskBalance, error: balanceError } = await supabaseClient
      .from('user_bsk_balances')
      .select('withdrawable_balance')
      .eq('user_id', user.id)
      .single();

    if (balanceError || !bskBalance) {
      console.error('Balance not found:', balanceError);
      return new Response(
        JSON.stringify({ error: 'BSK balance not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Calculate late fees if applicable
    let lateFee = 0;
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    const gracePeriod = payment.bsk_loans.grace_period_days || 3;
    const lateFeePercent = payment.bsk_loans.late_fee_percent || 10;
    
    const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysPastDue > gracePeriod) {
      lateFee = (payment.payment_amount * lateFeePercent) / 100;
      console.log(`Late fee applied: ${lateFee} BSK (${daysPastDue} days past due)`);
    }

    const totalPayment = amount_bsk + lateFee;

    if (bskBalance.withdrawable_balance < totalPayment) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient BSK balance',
          required: totalPayment,
          available: bskBalance.withdrawable_balance,
          late_fee: lateFee
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Deduct BSK from user balance
    const { error: deductError } = await supabaseClient
      .from('user_bsk_balances')
      .update({
        withdrawable_balance: bskBalance.withdrawable_balance - totalPayment
      })
      .eq('user_id', user.id);

    if (deductError) {
      console.error('Error deducting balance:', deductError);
      return new Response(
        JSON.stringify({ error: 'Failed to process payment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Update payment record
    const { error: updatePaymentError } = await supabaseClient
      .from('bsk_loan_payments')
      .update({
        status: 'paid',
        paid_date: today.toISOString().split('T')[0],
        late_fee: lateFee
      })
      .eq('id', payment_id);

    if (updatePaymentError) {
      console.error('Error updating payment:', updatePaymentError);
      // Try to refund the balance
      await supabaseClient
        .from('user_bsk_balances')
        .update({
          withdrawable_balance: bskBalance.withdrawable_balance
        })
        .eq('user_id', user.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to update payment record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Update loan record
    const newPaidAmount = (payment.bsk_loans.paid_bsk || 0) + totalPayment;
    const newOutstanding = payment.bsk_loans.total_due_bsk - newPaidAmount;
    const isFullyPaid = newOutstanding <= 0;

    const { error: updateLoanError } = await supabaseClient
      .from('bsk_loans')
      .update({
        paid_bsk: newPaidAmount,
        outstanding_bsk: Math.max(0, newOutstanding),
        status: isFullyPaid ? 'closed' : 'active',
        closed_at: isFullyPaid ? new Date().toISOString() : null,
        days_past_due: 0
      })
      .eq('id', payment.loan_id);

    if (updateLoanError) {
      console.error('Error updating loan:', updateLoanError);
    }

    // Update next due date
    const { data: nextPayment } = await supabaseClient
      .from('bsk_loan_payments')
      .select('due_date')
      .eq('loan_id', payment.loan_id)
      .eq('status', 'pending')
      .order('week_number', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextPayment) {
      await supabaseClient
        .from('bsk_loans')
        .update({ next_due_date: nextPayment.due_date })
        .eq('id', payment.loan_id);
    }

    console.log('Payment processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment_id,
        amount_paid: totalPayment,
        late_fee: lateFee,
        remaining_balance: Math.max(0, newOutstanding),
        loan_status: isFullyPaid ? 'closed' : 'active',
        message: isFullyPaid 
          ? 'Congratulations! Your loan is fully paid.' 
          : 'Payment processed successfully.'
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
