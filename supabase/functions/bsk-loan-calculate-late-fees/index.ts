import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { scheduled_run = true } = await req.json();

    console.log("Starting late fee calculation...");

    // Get active late fee config
    const { data: config, error: configError } = await supabase
      .from("bsk_loan_late_fee_config")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (configError || !config) {
      throw new Error("Late fee configuration not found");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get overdue installments
    const { data: installments, error: installmentsError } = await supabase
      .from("bsk_loan_installments")
      .select(`
        *,
        bsk_loans!inner(user_id, status)
      `)
      .eq("status", "overdue")
      .eq("bsk_loans.status", "active");

    if (installmentsError) {
      console.error("Error fetching installments:", installmentsError);
      throw new Error("Failed to fetch overdue installments");
    }

    let processedCount = 0;
    let totalFees = 0;

    for (const installment of installments || []) {
      const dueDate = new Date(installment.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check grace period
      if (daysOverdue <= config.grace_period_days) {
        continue;
      }

      // Skip if late fee already applied today
      if (
        installment.late_fee_applied_at &&
        new Date(installment.late_fee_applied_at).toDateString() === today.toDateString()
      ) {
        continue;
      }

      // Calculate late fee
      const baseFee = installment.total_due_bsk * (config.late_fee_percent / 100);
      let lateFee = Math.min(baseFee, config.max_late_fee_bsk);

      if (config.compound_daily && installment.late_fee_bsk > 0) {
        // Compound daily
        const additionalFee = (installment.total_due_bsk + installment.late_fee_bsk) *
          (config.late_fee_percent / 100);
        lateFee = Math.min(
          installment.late_fee_bsk + additionalFee,
          config.max_late_fee_bsk
        );
      }

      // Update installment
      const { error: updateError } = await supabase
        .from("bsk_loan_installments")
        .update({
          late_fee_bsk: lateFee,
          late_fee_applied_at: today.toISOString(),
          days_overdue: daysOverdue,
        })
        .eq("id", installment.id);

      if (updateError) {
        console.error(`Failed to update installment ${installment.id}:`, updateError);
        continue;
      }

      // Log late fee
      const { error: logError } = await supabase
        .from("bsk_loan_late_fee_log")
        .insert({
          installment_id: installment.id,
          loan_id: installment.loan_id,
          user_id: installment.bsk_loans.user_id,
          late_fee_bsk: lateFee,
          days_overdue: daysOverdue,
          calculation_date: today.toISOString().split("T")[0],
          notes: `Late fee applied after ${daysOverdue} days overdue`,
        });

      if (logError) {
        console.error(`Failed to log late fee for installment ${installment.id}:`, logError);
      }

      processedCount++;
      totalFees += lateFee;
    }

    console.log(
      `Late fee calculation complete: ${processedCount} installments processed, ${totalFees.toFixed(2)} BSK in fees`
    );

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedCount,
        total_fees: totalFees,
        calculation_date: today.toISOString().split("T")[0],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in bsk-loan-calculate-late-fees:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
