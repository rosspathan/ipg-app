import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import Decimal from "https://esm.sh/decimal.js@10.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * BSK Loan Settlement Recovery
 * 
 * This function detects and recovers incomplete settlements where:
 * 1. Settlement debit exists (user paid)
 * 2. But disbursal credit is missing (payout not received)
 * 
 * It can be run manually by admin or via cron to auto-recover failed payouts.
 * 
 * CRITICAL: Uses idempotent operations to ensure exactly-once payout.
 */

interface RecoveryRequest {
  loan_id?: string; // Optional: recover specific loan, or all if not provided
  dry_run?: boolean; // If true, just report issues without fixing
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const body = await req.json().catch(() => ({}));
    const { loan_id, dry_run = false }: RecoveryRequest = body;

    console.log(`[RECOVERY] Starting settlement recovery. loan_id: ${loan_id || 'ALL'}, dry_run: ${dry_run}`);

    // Find all settlement/foreclosure debits (handle both old and new naming)
    const { data: allSettlements, error: settlementsError } = await supabase
      .from("unified_bsk_ledger")
      .select("*")
      .in("tx_subtype", ["loan_settlement", "loan_foreclosure"])
      .eq("tx_type", "debit")
      .order("created_at", { ascending: false });

    // Filter by loan_id if provided (need to extract from idempotency_key for old format)
    let settlements = allSettlements || [];
    if (loan_id) {
      settlements = settlements.filter(s => 
        s.meta_json?.loan_id === loan_id || 
        s.idempotency_key?.includes(loan_id)
      );
    }

    if (settlementsError) {
      throw new Error("Failed to fetch settlements: " + settlementsError.message);
    }

    const recoveryResults: any[] = [];

  // Track which loans we've already processed (dedupe multiple settlement attempts)
    const processedLoans = new Set<string>();

    for (const settlement of settlements || []) {
      // Extract loan_id from meta_json OR from idempotency_key
      let settlementLoanId = settlement.meta_json?.loan_id;
      
      // For old format: loan_foreclose_{loan_id}_{timestamp}
      if (!settlementLoanId && settlement.idempotency_key) {
        const match = settlement.idempotency_key.match(/loan_(?:foreclose|settle)_([a-f0-9-]{36})/);
        if (match) {
          settlementLoanId = match[1];
        }
      }
      
      if (!settlementLoanId) continue;
      
      // Skip if already processed this loan
      if (processedLoans.has(settlementLoanId)) continue;
      processedLoans.add(settlementLoanId);

      // Check both old and new disbursal key formats
      const disbursalKeyNew = `loan_settle_disbursal_${settlementLoanId}`;
      const disbursalKeyOld = `loan_foreclosure_disbursal_${settlementLoanId}`;

      // Check if disbursal exists with either key
      const { data: existingDisbursalNew } = await supabase
        .from("unified_bsk_ledger")
        .select("id")
        .eq("idempotency_key", disbursalKeyNew)
        .maybeSingle();

      const { data: existingDisbursalOld } = await supabase
        .from("unified_bsk_ledger")
        .select("id")
        .eq("idempotency_key", disbursalKeyOld)
        .maybeSingle();

      if (existingDisbursalNew || existingDisbursalOld) {
        // Already recovered/complete - but still check if loan needs status update
        const { data: loanCheck } = await supabase
          .from("bsk_loans")
          .select("id, status")
          .eq("id", settlementLoanId)
          .single();
        
        if (loanCheck && loanCheck.status !== 'closed') {
          // Loan status is out of sync - fix it
          console.log(`[RECOVERY] Loan ${settlementLoanId} has disbursal but status is ${loanCheck.status}. Fixing...`);
          await supabase
            .from("bsk_loans")
            .update({
              status: "closed",
              outstanding_bsk: 0,
              closed_at: new Date().toISOString()
            })
            .eq("id", settlementLoanId);
        }
        continue;
      }

      // Get loan details to get principal amount
      const { data: loan, error: loanError } = await supabase
        .from("bsk_loans")
        .select("id, loan_number, user_id, principal_bsk, status")
        .eq("id", settlementLoanId)
        .single();

      if (loanError || !loan) {
        console.error(`[RECOVERY] Loan ${settlementLoanId} not found`);
        recoveryResults.push({
          loan_id: settlementLoanId,
          status: "error",
          error: "Loan not found"
        });
        continue;
      }

      const principalBsk = new Decimal(loan.principal_bsk || 0);

      console.log(`[RECOVERY] Found incomplete settlement for loan ${loan.loan_number}. User: ${loan.user_id}, Principal: ${principalBsk.toFixed(4)} BSK`);

      recoveryResults.push({
        loan_id: settlementLoanId,
        loan_number: loan.loan_number,
        user_id: loan.user_id,
        principal_bsk: principalBsk.toString(),
        settlement_amount: Math.abs(Number(settlement.amount_bsk)),
        settlement_date: settlement.created_at,
        status: dry_run ? "needs_recovery" : "recovering"
      });

      if (dry_run) {
        continue;
      }

      // RECOVER: Credit the disbursal (use new key format)
      const { data: disbursalResult, error: disbursalError } = await supabase.rpc(
        "record_bsk_transaction",
        {
          p_user_id: loan.user_id,
          p_tx_type: "credit",
          p_tx_subtype: "loan_settlement_disbursal",
          p_balance_type: "withdrawable",
          p_amount_bsk: principalBsk.toNumber(),
          p_idempotency_key: disbursalKeyNew,
          p_meta_json: {
            loan_id: loan.id,
            loan_number: loan.loan_number,
            principal_bsk: principalBsk.toString(),
            action: "loan_settlement_disbursal_recovery",
            original_settlement_id: settlement.id,
            recovered_at: new Date().toISOString()
          }
        }
      );

      if (disbursalError) {
        console.error(`[RECOVERY] Disbursal failed for ${loan.loan_number}:`, disbursalError);
        recoveryResults[recoveryResults.length - 1].status = "failed";
        recoveryResults[recoveryResults.length - 1].error = disbursalError.message;
      } else {
        console.log(`[RECOVERY] ✅ Recovered disbursal for ${loan.loan_number}: ${principalBsk.toFixed(4)} BSK`);
        recoveryResults[recoveryResults.length - 1].status = "recovered";
        recoveryResults[recoveryResults.length - 1].disbursal_tx_id = disbursalResult;
      }

      // Also ensure loan is marked closed and installments paid
      const { error: loanUpdateError } = await supabase
        .from("bsk_loans")
        .update({
          status: "closed",
          outstanding_bsk: 0,
          paid_bsk: principalBsk.toNumber(),
          closed_at: new Date().toISOString(),
          admin_notes: `Recovered via settlement recovery on ${new Date().toISOString()}`
        })
        .eq("id", settlementLoanId);

      if (loanUpdateError) {
        console.error(`[RECOVERY] Loan status update failed:`, loanUpdateError);
      }

      // Update installments
      const { data: unpaidInstallments } = await supabase
        .from("bsk_loan_installments")
        .select("id, emi_bsk")
        .eq("loan_id", settlementLoanId)
        .in("status", ["due", "overdue"]);

      if (unpaidInstallments && unpaidInstallments.length > 0) {
        const now = new Date().toISOString();
        for (const inst of unpaidInstallments) {
          await supabase
            .from("bsk_loan_installments")
            .update({
              status: "paid",
              paid_at: now,
              paid_amount_bsk: inst.emi_bsk,
            })
            .eq("id", inst.id);
        }
        console.log(`[RECOVERY] ✅ Marked ${unpaidInstallments.length} installments as paid`);
      }

      // Mark any related admin notifications as resolved
      await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("type", "loan_disbursal_failed")
        .eq("metadata->>loan_id", settlementLoanId);
    }

    const needsRecovery = recoveryResults.filter(r => r.status === "needs_recovery" || r.status === "recovering");
    const recovered = recoveryResults.filter(r => r.status === "recovered");
    const failed = recoveryResults.filter(r => r.status === "failed");

    console.log(`[RECOVERY] Complete. Found: ${recoveryResults.length}, Recovered: ${recovered.length}, Failed: ${failed.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        total_checked: settlements?.length || 0,
        needs_recovery: needsRecovery.length,
        recovered: recovered.length,
        failed: failed.length,
        results: recoveryResults
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[RECOVERY] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
