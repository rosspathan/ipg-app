import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PrepaymentRequest {
  loan_id: string;
  prepayment_amount_bsk: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { loan_id, prepayment_amount_bsk }: PrepaymentRequest = await req.json();

    console.log(`Processing prepayment for loan ${loan_id}: ${prepayment_amount_bsk} BSK`);

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from("bsk_loans")
      .select("*")
      .eq("id", loan_id)
      .eq("user_id", user.id)
      .single();

    if (loanError || !loan) {
      throw new Error("Loan not found");
    }

    if (loan.status !== "active") {
      throw new Error("Loan is not active");
    }

    const outstanding = loan.outstanding_bsk;

    if (prepayment_amount_bsk > outstanding) {
      throw new Error(
        `Prepayment amount (${prepayment_amount_bsk} BSK) exceeds outstanding balance (${outstanding} BSK)`
      );
    }

    // Calculate early repayment discount (2% for full prepayment)
    const discount =
      prepayment_amount_bsk === outstanding ? outstanding * 0.02 : 0;
    const effectivePayment = prepayment_amount_bsk - discount;

    // Get user's BSK balance
    const { data: balance, error: balanceError } = await supabase
      .from("user_bsk_balances")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (balanceError || !balance) {
      throw new Error("User balance not found");
    }

    if (balance.holding_balance < effectivePayment) {
      throw new Error(
        `Insufficient balance. Required: ${effectivePayment} BSK, Available: ${balance.holding_balance} BSK`
      );
    }

    // Get due installments
    const { data: installments, error: installmentsError } = await supabase
      .from("bsk_loan_installments")
      .select("*")
      .eq("loan_id", loan_id)
      .in("status", ["due", "overdue"])
      .order("installment_number");

    if (installmentsError) {
      throw new Error("Failed to fetch installments");
    }

    let remainingPayment = prepayment_amount_bsk;
    let clearedCount = 0;
    const installmentUpdates = [];

    // Clear installments in order
    for (const installment of installments || []) {
      if (remainingPayment <= 0) break;

      const installmentDue = installment.total_due_bsk + (installment.late_fee_bsk || 0);

      if (remainingPayment >= installmentDue) {
        installmentUpdates.push({
          id: installment.id,
          status: "paid",
          paid_amount_bsk: installmentDue,
          paid_at: new Date().toISOString(),
        });
        remainingPayment -= installmentDue;
        clearedCount++;
      } else {
        // Partial payment on this installment
        installmentUpdates.push({
          id: installment.id,
          paid_amount_bsk: (installment.paid_amount_bsk || 0) + remainingPayment,
        });
        remainingPayment = 0;
      }
    }

    // Update installments
    for (const update of installmentUpdates) {
      const { error: updateError } = await supabase
        .from("bsk_loan_installments")
        .update(update)
        .eq("id", update.id);

      if (updateError) {
        console.error("Failed to update installment:", updateError);
      }
    }

    // Update loan
    const newOutstanding = outstanding - prepayment_amount_bsk;
    const loanUpdate: any = {
      outstanding_bsk: newOutstanding,
      repaid_amount_bsk: loan.repaid_amount_bsk + prepayment_amount_bsk,
      updated_at: new Date().toISOString(),
    };

    if (newOutstanding === 0) {
      loanUpdate.status = "repaid";
      loanUpdate.repaid_at = new Date().toISOString();
      loanUpdate.prepaid_at = new Date().toISOString();
      loanUpdate.prepayment_discount_bsk = discount;
    }

    const { error: loanUpdateError } = await supabase
      .from("bsk_loans")
      .update(loanUpdate)
      .eq("id", loan_id);

    if (loanUpdateError) {
      throw new Error("Failed to update loan");
    }

    // Deduct from user balance
    const { error: balanceUpdateError } = await supabase
      .from("user_bsk_balances")
      .update({
        holding_balance: balance.holding_balance - effectivePayment,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (balanceUpdateError) {
      throw new Error("Failed to update balance");
    }

    // Log prepayment
    const { error: prepaymentLogError } = await supabase
      .from("bsk_loan_prepayments")
      .insert({
        loan_id,
        user_id: user.id,
        prepayment_amount_bsk,
        outstanding_before_bsk: outstanding,
        discount_applied_bsk: discount,
        installments_cleared: clearedCount,
      });

    if (prepaymentLogError) {
      console.error("Failed to log prepayment:", prepaymentLogError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        prepayment_amount: prepayment_amount_bsk,
        discount_applied: discount,
        installments_cleared: clearedCount,
        new_outstanding: newOutstanding,
        loan_status: newOutstanding === 0 ? "repaid" : "active",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in bsk-loan-prepay:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
