import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DisburseRequest {
  loan_id: string;
  action: 'approve' | 'reject';
  admin_notes?: string;
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
    const { loan_id, action, admin_notes }: DisburseRequest = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: hasAdminRole } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    if (!hasAdminRole) {
      throw new Error('Admin access required');
    }

    console.log(`BSK Loan ${action}: Admin ${user.id} processing loan ${loan_id}`);

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from('bsk_loans')
      .select('*')
      .eq('id', loan_id)
      .eq('status', 'pending')
      .single();

    if (loanError || !loan) {
      throw new Error('Loan not found or not in pending status');
    }

    if (action === 'reject') {
      // Reject loan
      await supabase
        .from('bsk_loans')
        .update({ 
          status: 'written_off',
          admin_notes,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', loan_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Loan rejected successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
      );
    }

    // APPROVE LOAN - Pay-First Model
    const approvalTime = new Date();
    
    // Update loan status to approved (no immediate disbursal)
    const { error: updateError } = await supabase
      .from('bsk_loans')
      .update({
        status: 'approved',
        approved_at: approvalTime.toISOString(),
        approved_by: user.id,
        admin_notes,
        next_due_date: new Date(approvalTime.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 week from now
      })
      .eq('id', loan_id);

    if (updateError) {
      throw new Error('Failed to update loan status');
    }

    // Create installment schedule
    const installments = [];
    const emiAmount = loan.schedule_denomination === 'fixed_bsk' 
      ? loan.total_due_bsk / loan.tenor_weeks
      : loan.amount_inr / loan.tenor_weeks;

    for (let i = 1; i <= loan.tenor_weeks; i++) {
      const dueDate = new Date(approvalTime.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const isLastInstallment = i === loan.tenor_weeks;
      
      // Adjust last installment for any rounding differences
      const finalEmiAmount = isLastInstallment && loan.schedule_denomination === 'fixed_bsk'
        ? loan.total_due_bsk - (emiAmount * (loan.tenor_weeks - 1))
        : emiAmount;

      installments.push({
        loan_id: loan.id,
        installment_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        emi_bsk: loan.schedule_denomination === 'fixed_bsk' ? finalEmiAmount : null,
        emi_inr: loan.schedule_denomination === 'inr_pegged' ? finalEmiAmount : null,
        principal_bsk: loan.schedule_denomination === 'fixed_bsk' ? finalEmiAmount : finalEmiAmount / loan.disbursal_rate_snapshot,
        interest_bsk: 0, // 0% interest by default
        total_due_bsk: loan.schedule_denomination === 'fixed_bsk' ? finalEmiAmount : finalEmiAmount / loan.disbursal_rate_snapshot,
        status: 'due'
      });
    }

    // Insert installments
    const { error: installmentsError } = await supabase
      .from('bsk_loan_installments')
      .insert(installments);

    if (installmentsError) {
      console.error('Installments creation error:', installmentsError);
      throw new Error('Failed to create installment schedule');
    }

    // Update loan to active status (no disbursal yet)
    await supabase
      .from('bsk_loans')
      .update({ status: 'active' })
      .eq('id', loan_id);

    console.log(`BSK Loan Approved: ${loan.loan_number} - User will receive ${loan.principal_bsk} BSK after completing all ${loan.tenor_weeks} payments`);

    return new Response(
      JSON.stringify({
        success: true,
        loan: {
          id: loan.id,
          loan_number: loan.loan_number,
          amount_inr: loan.amount_inr,
          principal_bsk: loan.principal_bsk,
          maturity_amount_bsk: loan.principal_bsk,
          installments_created: installments.length,
          next_due_date: installments[0]?.due_date,
          weekly_emi_bsk: loan.schedule_denomination === 'fixed_bsk' ? emiAmount : null,
          weekly_emi_inr: loan.schedule_denomination === 'inr_pegged' ? emiAmount : null
        },
        message: 'Loan approved successfully. User will receive funds after completing all payments.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('BSK Loan Disbursal Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
    );
  }
});