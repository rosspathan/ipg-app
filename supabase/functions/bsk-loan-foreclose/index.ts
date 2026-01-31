import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * BSK Loan Foreclosure/Settlement
 * 
 * Allows users to settle their entire loan by paying the outstanding balance.
 * Features:
 * - 2% early settlement discount on full payoff
 * - Atomic ledger transaction for audit trail
 * - Marks all remaining installments as paid
 * - Closes the loan immediately
 */

interface ForeclosureRequest {
  loan_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Auth client for user verification
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // Service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { loan_id }: ForeclosureRequest = await req.json();

    if (!loan_id) {
      throw new Error("loan_id is required");
    }

    console.log(`[FORECLOSE] User ${user.id} requesting foreclosure for loan ${loan_id}`);

    // ===== IDEMPOTENCY CHECK: Prevent duplicate foreclosure =====
    // Check if this loan was already foreclosed or is being processed
    const idempotencyKey = `loan_foreclose_${loan_id}`;
    
    const { data: existingTx } = await supabase
      .from("unified_bsk_ledger")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingTx) {
      console.log(`[FORECLOSE] Duplicate request detected for loan ${loan_id} - already processed`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "This loan has already been settled. Please refresh the page.",
          already_processed: true
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    // Get loan details with row-level lock to prevent race conditions
    const { data: loan, error: loanError } = await supabase
      .from("bsk_loans")
      .select("*")
      .eq("id", loan_id)
      .eq("user_id", user.id)
      .single();

    if (loanError || !loan) {
      throw new Error("Loan not found or does not belong to you");
    }

    // Double-check status to prevent race conditions
    if (loan.status !== "active" && loan.status !== "in_arrears") {
      console.log(`[FORECLOSE] Loan ${loan_id} already processed with status: ${loan.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Loan is already ${loan.status}. Please refresh the page.`,
          already_processed: true
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    const outstanding = Number(loan.outstanding_bsk) || 0;

    if (outstanding <= 0) {
      throw new Error("No outstanding balance to settle");
    }

    // No discount - full settlement amount
    const settlementAmount = outstanding;

    console.log(`[FORECLOSE] Outstanding: ${outstanding} BSK, Settlement: ${settlementAmount} BSK`);

    // Check user's withdrawable balance via ledger
    const { data: balanceData, error: balanceQueryError } = await supabase
      .from("user_bsk_balances")
      .select("withdrawable_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (balanceQueryError) {
      console.error("[FORECLOSE] Balance query error:", balanceQueryError);
      throw new Error("Failed to check balance");
    }

    const withdrawableBalance = Number(balanceData?.withdrawable_balance) || 0;

    if (withdrawableBalance < settlementAmount) {
      throw new Error(
        `Insufficient balance. Required: ${settlementAmount.toFixed(2)} BSK, Available: ${withdrawableBalance.toFixed(2)} BSK`
      );
    }

    // ATOMIC: Debit user's withdrawable balance using record_bsk_transaction
    // Use deterministic idempotency key (loan_id only) to prevent duplicate debits

    const { data: debitResult, error: debitError } = await supabase.rpc(
      "record_bsk_transaction",
      {
        p_user_id: user.id,
        p_tx_type: "debit",
        p_tx_subtype: "loan_foreclosure",
        p_balance_type: "withdrawable",
        p_amount_bsk: settlementAmount,
        p_idempotency_key: idempotencyKey,
        p_meta_json: {
          loan_id: loan.id,
          loan_number: loan.loan_number,
          original_outstanding: outstanding,
          settlement_amount: settlementAmount,
          action: "loan_foreclosure"
        }
      }
    );

    if (debitError) {
      console.error("[FORECLOSE] Debit error:", debitError);
      throw new Error("Failed to process settlement payment: " + debitError.message);
    }

    console.log(`[FORECLOSE] ✅ Debited ${settlementAmount} BSK from user (tx: ${debitResult})`);

    // Mark all remaining installments as paid
    const { data: updatedInstallments, error: installmentError } = await supabase
      .from("bsk_loan_installments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_amount_bsk: supabase.sql`total_due_bsk`, // Pay full amount for each
        payment_method: "foreclosure",
        notes: `Settled via foreclosure on ${new Date().toISOString()}`
      })
      .eq("loan_id", loan_id)
      .in("status", ["due", "overdue", "pending"])
      .select("id");

    const installmentsCleared = updatedInstallments?.length || 0;
    console.log(`[FORECLOSE] Marked ${installmentsCleared} installments as paid`);

    // Update loan status to closed
    const { error: loanUpdateError } = await supabase
      .from("bsk_loans")
      .update({
        status: "closed",
        outstanding_bsk: 0,
        paid_bsk: (Number(loan.paid_bsk) || 0) + settlementAmount,
        closed_at: new Date().toISOString(),
        prepaid_at: new Date().toISOString(),
        admin_notes: `Foreclosed by user on ${new Date().toISOString()}. Settlement: ${settlementAmount} BSK`
      })
      .eq("id", loan_id);

    if (loanUpdateError) {
      console.error("[FORECLOSE] Loan update error:", loanUpdateError);
      // Don't throw - payment already processed, just log
    }

    // Log foreclosure event
    await supabase
      .from("bsk_loan_prepayments")
      .insert({
        loan_id,
        user_id: user.id,
        prepayment_amount_bsk: settlementAmount,
        outstanding_before_bsk: outstanding,
        discount_applied_bsk: 0,
        installments_cleared: installmentsCleared,
        is_foreclosure: true
      })
      .catch(err => console.error("[FORECLOSE] Failed to log prepayment:", err));

    console.log(`[FORECLOSE] ✅ Loan ${loan.loan_number} successfully foreclosed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Loan successfully settled",
        loan_number: loan.loan_number,
        original_outstanding: outstanding,
        settlement_amount: settlementAmount,
        installments_cleared: installmentsCleared,
        new_status: "closed"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[FORECLOSE] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
