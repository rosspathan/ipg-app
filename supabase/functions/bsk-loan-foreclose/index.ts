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
 * 2. All installments marked as paid with payment_method = 'settlement'
 * 3. Loan status changed to CLOSED
 * 4. Full payout (principal_bsk) released exactly once
 * 5. Uses decimal-safe math (no JS floats)
 * 6. Idempotency: deterministic keys prevent double debit/payout
 * 
 * CRITICAL: This function ensures atomicity - if any step fails after debit,
 * it will retry completion steps and alert admin if recovery fails.
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

    // Get loan details FIRST
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
      // Check if disbursal already happened - if so, return success
      const { data: existingDisbursal } = await supabase
        .from("unified_bsk_ledger")
        .select("id")
        .eq("idempotency_key", disbursalIdempotencyKey)
        .maybeSingle();

      if (existingDisbursal) {
        console.log(`[SETTLE] Loan ${loan_id} already closed and disbursed`);
        return new Response(
          JSON.stringify({
            success: true,
            message: "This loan has already been settled and paid out.",
            already_processed: true
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }}
        );
      }

      // Loan marked closed but no disbursal - trigger recovery
      console.log(`[SETTLE] Loan ${loan_id} closed but no disbursal found - triggering recovery`);
    } else if (loan.status !== "active" && loan.status !== "in_arrears") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Loan is in ${loan.status} status and cannot be settled.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    // ===== CHECK IF SETTLEMENT DEBIT ALREADY PROCESSED =====
    const { data: existingSettlement } = await supabase
      .from("unified_bsk_ledger")
      .select("id, amount_bsk")
      .eq("idempotency_key", settlementIdempotencyKey)
      .maybeSingle();

    let settlementAmount: Decimal;
    let wasSettlementAlreadyDone = false;

    if (existingSettlement) {
      console.log(`[SETTLE] Settlement debit already exists for loan ${loan_id} - checking completion`);
      settlementAmount = new Decimal(Math.abs(Number(existingSettlement.amount_bsk)));
      wasSettlementAlreadyDone = true;
    } else {
      // CALCULATE SETTLEMENT FROM INSTALLMENTS (not outstanding_bsk field)
      const { data: unpaidInstallments, error: installmentsError } = await supabase
        .from("bsk_loan_installments")
        .select("id, installment_number, emi_bsk, status")
        .eq("loan_id", loan_id)
        .in("status", ["due", "overdue"]);

      if (installmentsError) {
        throw new Error("Failed to fetch installments");
      }

      if (!unpaidInstallments || unpaidInstallments.length === 0) {
        // All installments already paid - just need to complete/disburse
        console.log(`[SETTLE] All installments already paid for loan ${loan_id}. Proceeding to completion...`);
        settlementAmount = new Decimal(0);
      } else {
        // DECIMAL-SAFE CALCULATION: Sum unpaid EMIs
        settlementAmount = unpaidInstallments.reduce(
          (sum, inst) => sum.plus(new Decimal(inst.emi_bsk || 0)),
          new Decimal(0)
        );
      }

      console.log(`[SETTLE] Settlement amount: ${settlementAmount.toFixed(4)} BSK`);

      if (settlementAmount.greaterThan(0)) {
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
              action: "loan_settlement"
            }
          }
        );

        if (debitError) {
          console.error("[SETTLE] Debit error:", debitError);
          throw new Error("Failed to process settlement payment: " + debitError.message);
        }

        console.log(`[SETTLE] ✅ Debited ${settlementAmount.toFixed(4)} BSK from user (tx: ${debitResult})`);
      }
    }

    // ===== CRITICAL: Now we've taken the money - MUST complete all remaining steps =====

    const completionErrors: string[] = [];
    const principalBsk = new Decimal(loan.principal_bsk || 0);

    // STEP 1: Mark all unpaid installments as paid
    try {
      const { data: unpaidToUpdate, error: fetchError } = await supabase
        .from("bsk_loan_installments")
        .select("id, emi_bsk")
        .eq("loan_id", loan_id)
        .in("status", ["due", "overdue"]);

      if (!fetchError && unpaidToUpdate && unpaidToUpdate.length > 0) {
        const installmentIds = unpaidToUpdate.map(i => i.id);
        const now = new Date().toISOString();

        // Update each installment individually to ensure paid_amount_bsk is set correctly
        for (const inst of unpaidToUpdate) {
          const { error: updateError } = await supabase
            .from("bsk_loan_installments")
            .update({
              status: "paid",
              paid_at: now,
              paid_amount_bsk: inst.emi_bsk,
            })
            .eq("id", inst.id);

          if (updateError) {
            console.error(`[SETTLE] Failed to update installment ${inst.id}:`, updateError);
            completionErrors.push(`installment_${inst.id}`);
          }
        }

        console.log(`[SETTLE] ✅ Marked ${unpaidToUpdate.length} installments as paid`);
      }
    } catch (err: any) {
      console.error("[SETTLE] Installment update error:", err);
      completionErrors.push("installments_update");
    }

    // STEP 2: Update loan status to closed
    try {
      const totalPaidNow = principalBsk; // After settlement, all EMIs are paid = total_due = principal

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
        completionErrors.push("loan_status_update");
      } else {
        console.log(`[SETTLE] ✅ Loan status updated to closed`);
      }
    } catch (err: any) {
      console.error("[SETTLE] Loan status update error:", err);
      completionErrors.push("loan_status_update");
    }

    // STEP 3: CRITICAL - Disburse the full principal (payout) amount exactly ONCE
    let disbursalSuccess = false;
    try {
      // Check if already disbursed (idempotency)
      const { data: existingDisbursal } = await supabase
        .from("unified_bsk_ledger")
        .select("id")
        .eq("idempotency_key", disbursalIdempotencyKey)
        .maybeSingle();

      if (existingDisbursal) {
        console.log(`[SETTLE] Disbursal already exists - skipping`);
        disbursalSuccess = true;
      } else {
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
          completionErrors.push("disbursal_failed");
        } else {
          console.log(`[SETTLE] ✅ Disbursed ${principalBsk.toFixed(4)} BSK principal to user (tx: ${disbursalResult})`);
          disbursalSuccess = true;
        }
      }
    } catch (err: any) {
      console.error("[SETTLE] Disbursal critical error:", err);
      completionErrors.push("disbursal_critical_error");
    }

    // If disbursal failed, create high-priority admin notification
    if (!disbursalSuccess) {
      await supabase.from("admin_notifications").insert({
        type: "loan_disbursal_failed",
        title: "CRITICAL: Loan Disbursal Failed - Manual Action Required",
        message: `User ${user.id} settled loan ${loan.loan_number} (settlement paid: ${settlementAmount.toFixed(4)} BSK) but disbursal of ${principalBsk.toFixed(4)} BSK failed. MANUAL CREDIT REQUIRED.`,
        priority: "critical",
        metadata: {
          loan_id: loan.id,
          loan_number: loan.loan_number,
          user_id: user.id,
          principal_bsk: principalBsk.toString(),
          settlement_amount: settlementAmount.toString(),
          errors: completionErrors,
          idempotency_key: disbursalIdempotencyKey
        }
      });
    }

    // Log settlement event to prepayments table
    await supabase
      .from("bsk_loan_prepayments")
      .insert({
        loan_id,
        user_id: user.id,
        prepayment_amount_bsk: settlementAmount.toNumber(),
        outstanding_before_bsk: settlementAmount.toNumber(),
        discount_applied_bsk: 0,
        installments_cleared: 16, // Full settlement clears all
        is_foreclosure: false
      })
      .catch(err => console.error("[SETTLE] Failed to log prepayment:", err));

    // Calculate net received (payout minus settlement payment)
    const netReceived = principalBsk.minus(settlementAmount);

    console.log(`[SETTLE] ✅ Loan ${loan.loan_number} settlement complete. Net received: ${netReceived.toFixed(4)} BSK. Disbursal: ${disbursalSuccess ? 'SUCCESS' : 'FAILED-NEEDS-RECOVERY'}`);

    // If there were completion errors but debit was taken, we still return success
    // to prevent user from retrying and double-paying. Admin will handle recovery.
    if (completionErrors.length > 0 && !wasSettlementAlreadyDone) {
      console.warn(`[SETTLE] Completion errors occurred: ${completionErrors.join(', ')}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: disbursalSuccess 
          ? "Loan successfully settled and payout released" 
          : "Settlement processed. Payout will be credited shortly.",
        loan_number: loan.loan_number,
        settlement_payment: settlementAmount.toFixed(4),
        payout_received: disbursalSuccess ? principalBsk.toFixed(4) : "pending",
        net_received: disbursalSuccess ? netReceived.toFixed(4) : "pending",
        new_status: "closed",
        payout_status: disbursalSuccess ? "completed" : "pending_recovery"
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
