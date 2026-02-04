import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import Decimal from "https://esm.sh/decimal.js@10.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * BSK Loan Settlement (Settle Plan / Foreclose)
 * 
 * Business Rules:
 * 1. User pays all remaining unpaid EMIs at once (calculated from installments table)
 * 2. All installments marked as paid
 * 3. Loan status changed to COMPLETED (closed)
 * 4. Full payout (principal_bsk) released exactly once
 * 5. Uses decimal-safe math (no JS floats)
 * 6. Idempotency: deterministic keys prevent double debit/payout
 * 
 * NOT ALLOWED:
 * - Cannot settle a cancelled/foreclosed loan (user lost their EMIs)
 * - Cannot settle if already closed
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

    console.log(`[SETTLE] User ${user.id} requesting settlement for loan ${loan_id}`);

    // DETERMINISTIC IDEMPOTENCY KEYS (no timestamps!)
    const settlementIdempotencyKey = `loan_settle_${loan_id}`;
    const disbursalIdempotencyKey = `loan_settle_disbursal_${loan_id}`;

    // ===== IDEMPOTENCY CHECK: Prevent duplicate settlement =====
    const { data: existingTx } = await supabase
      .from("unified_bsk_ledger")
      .select("id")
      .eq("idempotency_key", settlementIdempotencyKey)
      .maybeSingle();

    if (existingTx) {
      console.log(`[SETTLE] Duplicate request detected for loan ${loan_id} - already processed`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "This loan has already been settled. Please refresh the page.",
          already_processed: true
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from("bsk_loans")
      .select("*")
      .eq("id", loan_id)
      .eq("user_id", user.id)
      .single();

    if (loanError || !loan) {
      throw new Error("Loan not found or does not belong to you");
    }

    // STRICT STATUS CHECK: Only active or in_arrears can be settled
    if (loan.status === 'cancelled') {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This loan was cancelled due to missed payments. Paid EMIs have been forfeited.",
          forfeited: true
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    if (loan.status === 'closed') {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This loan is already closed. Please refresh the page.",
          already_processed: true
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    if (loan.status !== "active" && loan.status !== "in_arrears") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Loan is in ${loan.status} status and cannot be settled.`,
          already_processed: true
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    // CALCULATE SETTLEMENT FROM INSTALLMENTS (not outstanding_bsk field)
    // This ensures accuracy even if outstanding_bsk is out of sync
    const { data: unpaidInstallments, error: installmentsError } = await supabase
      .from("bsk_loan_installments")
      .select("id, installment_number, emi_bsk, status")
      .eq("loan_id", loan_id)
      .in("status", ["due", "overdue"]);

    if (installmentsError) {
      throw new Error("Failed to fetch installments");
    }

    if (!unpaidInstallments || unpaidInstallments.length === 0) {
      // All installments already paid - trigger completion instead
      console.log(`[SETTLE] All installments already paid for loan ${loan_id}. Triggering completion...`);
      
      // Call the completion function
      const { data: completeResult, error: completeError } = await supabase.functions.invoke(
        'bsk-loan-complete',
        { body: { loan_id, triggered_by: 'settlement_all_paid' } }
      );

      if (completeError) {
        throw new Error("Failed to complete loan: " + completeError.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "All installments were already paid. Loan completed.",
          ...completeResult
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    // DECIMAL-SAFE CALCULATION: Sum unpaid EMIs
    const settlementAmount = unpaidInstallments.reduce(
      (sum, inst) => sum.plus(new Decimal(inst.emi_bsk || 0)),
      new Decimal(0)
    );

    console.log(`[SETTLE] Settlement amount: ${settlementAmount.toFixed(4)} BSK (${unpaidInstallments.length} unpaid installments)`);

    // Check user's withdrawable balance
    const { data: balanceData, error: balanceQueryError } = await supabase
      .from("user_bsk_balances")
      .select("withdrawable_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (balanceQueryError) {
      console.error("[SETTLE] Balance query error:", balanceQueryError);
      throw new Error("Failed to check balance");
    }

    const withdrawableBalance = new Decimal(balanceData?.withdrawable_balance || 0);

    if (withdrawableBalance.lessThan(settlementAmount)) {
      throw new Error(
        `Insufficient balance. Required: ${settlementAmount.toFixed(2)} BSK, Available: ${withdrawableBalance.toFixed(2)} BSK`
      );
    }

    // ATOMIC: Debit user's withdrawable balance (settlement payment)
    const { data: debitResult, error: debitError } = await supabase.rpc(
      "record_bsk_transaction",
      {
        p_user_id: user.id,
        p_tx_type: "debit",
        p_tx_subtype: "loan_settlement",
        p_balance_type: "withdrawable",
        p_amount_bsk: settlementAmount.toNumber(),
        p_idempotency_key: settlementIdempotencyKey,
        p_meta_json: {
          loan_id: loan.id,
          loan_number: loan.loan_number,
          settlement_amount: settlementAmount.toString(),
          installments_settled: unpaidInstallments.length,
          action: "loan_settlement"
        }
      }
    );

    if (debitError) {
      console.error("[SETTLE] Debit error:", debitError);
      throw new Error("Failed to process settlement payment: " + debitError.message);
    }

    console.log(`[SETTLE] ✅ Debited ${settlementAmount.toFixed(4)} BSK from user (tx: ${debitResult})`);

    // Mark all unpaid installments as paid
    const { data: updatedInstallments, error: installmentError } = await supabase
      .from("bsk_loan_installments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_amount_bsk: supabase.sql`emi_bsk`,
        payment_method: "settlement",
        notes: `Settled via early settlement on ${new Date().toISOString()}`
      })
      .eq("loan_id", loan_id)
      .in("status", ["due", "overdue"])
      .select("id");

    const installmentsCleared = updatedInstallments?.length || 0;
    console.log(`[SETTLE] Marked ${installmentsCleared} installments as paid`);

    // Calculate new paid total using Decimal
    const previouslyPaid = new Decimal(loan.paid_bsk || 0);
    const totalPaidNow = previouslyPaid.plus(settlementAmount);

    // Update loan status to closed (COMPLETED)
    const { error: loanUpdateError } = await supabase
      .from("bsk_loans")
      .update({
        status: "closed",
        outstanding_bsk: 0,
        paid_bsk: totalPaidNow.toNumber(),
        closed_at: new Date().toISOString(),
        prepaid_at: new Date().toISOString(),
        admin_notes: `Settled by user on ${new Date().toISOString()}. Settlement: ${settlementAmount.toFixed(4)} BSK`
      })
      .eq("id", loan_id);

    if (loanUpdateError) {
      console.error("[SETTLE] Loan update error:", loanUpdateError);
      // Don't throw - payment already processed, continue to payout
    }

    // CRITICAL: Disburse the full principal (payout) amount exactly ONCE
    const principalBsk = new Decimal(loan.principal_bsk || 0);
    
    const { data: disbursalResult, error: disbursalError } = await supabase.rpc(
      "record_bsk_transaction",
      {
        p_user_id: user.id,
        p_tx_type: "credit",
        p_tx_subtype: "loan_settlement_disbursal",
        p_balance_type: "withdrawable",
        p_amount_bsk: principalBsk.toNumber(),
        p_idempotency_key: disbursalIdempotencyKey,
        p_meta_json: {
          loan_id: loan.id,
          loan_number: loan.loan_number,
          principal_bsk: principalBsk.toString(),
          settlement_amount: settlementAmount.toString(),
          action: "loan_settlement_disbursal",
          notes: `Full payout after loan settlement: ${loan.loan_number}`
        }
      }
    );

    if (disbursalError) {
      console.error("[SETTLE] Disbursal error:", disbursalError);
      // CRITICAL: Log this for manual follow-up but don't fail the response
      // The settlement was successful, user paid - they MUST get their payout
      await supabase.from("admin_notifications").insert({
        type: "loan_disbursal_failed",
        title: "Loan Disbursal Failed - Manual Action Required",
        message: `User ${user.id} settled loan ${loan.loan_number} but disbursal failed. Manual credit of ${principalBsk.toFixed(4)} BSK required.`,
        priority: "high",
        metadata: {
          loan_id: loan.id,
          user_id: user.id,
          principal_bsk: principalBsk.toString(),
          error: disbursalError.message
        }
      });
    } else {
      console.log(`[SETTLE] ✅ Disbursed ${principalBsk.toFixed(4)} BSK principal to user (tx: ${disbursalResult})`);
    }

    // Log settlement event
    await supabase
      .from("bsk_loan_prepayments")
      .insert({
        loan_id,
        user_id: user.id,
        prepayment_amount_bsk: settlementAmount.toNumber(),
        outstanding_before_bsk: settlementAmount.toNumber(), // Was the outstanding
        discount_applied_bsk: 0,
        installments_cleared: installmentsCleared,
        is_foreclosure: false // This is a settlement, not auto-foreclosure
      })
      .catch(err => console.error("[SETTLE] Failed to log prepayment:", err));

    // Calculate net received (payout minus settlement payment)
    const netReceived = principalBsk.minus(settlementAmount);

    console.log(`[SETTLE] ✅ Loan ${loan.loan_number} successfully settled. Net received: ${netReceived.toFixed(4)} BSK`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Loan successfully settled and payout released",
        loan_number: loan.loan_number,
        settlement_payment: settlementAmount.toFixed(4),
        payout_received: principalBsk.toFixed(4),
        net_received: netReceived.toFixed(4),
        installments_cleared: installmentsCleared,
        new_status: "closed"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[SETTLE] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
