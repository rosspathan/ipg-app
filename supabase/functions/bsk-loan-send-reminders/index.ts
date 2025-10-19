import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReminderInstallment {
  id: string;
  installment_number: number;
  due_date: string;
  total_due_bsk: number;
  late_fee_bsk: number;
  loan_id: string;
  bsk_loans: {
    loan_number: string;
    user_id: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

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

    console.log("Starting loan reminder notifications...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    const oneDayLater = new Date(today);
    oneDayLater.setDate(today.getDate() + 1);

    let sentCount = 0;
    const results: any[] = [];

    // 3-day reminder
    const { data: threeDayInstallments, error: threeDayError } = await supabase
      .from("bsk_loan_installments")
      .select(`
        *,
        bsk_loans!inner(loan_number, user_id),
        profiles!inner(full_name, email)
      `)
      .eq("status", "due")
      .gte("due_date", threeDaysLater.toISOString().split("T")[0])
      .lt("due_date", new Date(threeDaysLater.getTime() + 86400000).toISOString().split("T")[0]);

    if (!threeDayError && threeDayInstallments) {
      for (const inst of threeDayInstallments as unknown as ReminderInstallment[]) {
        const sent = await sendReminder(supabase, inst, "3_days_before");
        if (sent) {
          sentCount++;
          results.push({
            type: "3_days_before",
            user_id: inst.bsk_loans.user_id,
            installment_id: inst.id,
          });
        }
      }
    }

    // 1-day reminder
    const { data: oneDayInstallments, error: oneDayError } = await supabase
      .from("bsk_loan_installments")
      .select(`
        *,
        bsk_loans!inner(loan_number, user_id),
        profiles!inner(full_name, email)
      `)
      .eq("status", "due")
      .gte("due_date", oneDayLater.toISOString().split("T")[0])
      .lt("due_date", new Date(oneDayLater.getTime() + 86400000).toISOString().split("T")[0]);

    if (!oneDayError && oneDayInstallments) {
      for (const inst of oneDayInstallments as unknown as ReminderInstallment[]) {
        const sent = await sendReminder(supabase, inst, "1_day_before");
        if (sent) {
          sentCount++;
          results.push({
            type: "1_day_before",
            user_id: inst.bsk_loans.user_id,
            installment_id: inst.id,
          });
        }
      }
    }

    // Due today reminder
    const { data: todayInstallments, error: todayError } = await supabase
      .from("bsk_loan_installments")
      .select(`
        *,
        bsk_loans!inner(loan_number, user_id),
        profiles!inner(full_name, email)
      `)
      .eq("status", "due")
      .eq("due_date", today.toISOString().split("T")[0]);

    if (!todayError && todayInstallments) {
      for (const inst of todayInstallments as unknown as ReminderInstallment[]) {
        const sent = await sendReminder(supabase, inst, "due_today");
        if (sent) {
          sentCount++;
          results.push({
            type: "due_today",
            user_id: inst.bsk_loans.user_id,
            installment_id: inst.id,
          });
        }
      }
    }

    // Overdue reminder
    const { data: overdueInstallments, error: overdueError } = await supabase
      .from("bsk_loan_installments")
      .select(`
        *,
        bsk_loans!inner(loan_number, user_id),
        profiles!inner(full_name, email)
      `)
      .eq("status", "overdue");

    if (!overdueError && overdueInstallments) {
      for (const inst of overdueInstallments as unknown as ReminderInstallment[]) {
        const sent = await sendReminder(supabase, inst, "overdue");
        if (sent) {
          sentCount++;
          results.push({
            type: "overdue",
            user_id: inst.bsk_loans.user_id,
            installment_id: inst.id,
          });
        }
      }
    }

    console.log(`Sent ${sentCount} loan reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in bsk-loan-send-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendReminder(
  supabase: any,
  installment: ReminderInstallment,
  notificationType: string
): Promise<boolean> {
  try {
    // Check user preferences
    const { data: prefs } = await supabase
      .from("bsk_loan_notification_preferences")
      .select("*")
      .eq("user_id", installment.bsk_loans.user_id)
      .single();

    // Default to sending if no preferences set
    const shouldSend = !prefs || prefs.email_enabled;

    if (!shouldSend) {
      console.log(`User ${installment.bsk_loans.user_id} has notifications disabled`);
      return false;
    }

    // Log notification (in production, you would send actual email here)
    const { error: logError } = await supabase
      .from("bsk_loan_notification_log")
      .insert({
        user_id: installment.bsk_loans.user_id,
        loan_id: installment.loan_id,
        installment_id: installment.id,
        notification_type: notificationType,
        channel: "email",
        status: "sent",
        metadata: {
          installment_number: installment.installment_number,
          due_date: installment.due_date,
          amount_bsk: installment.total_due_bsk,
          late_fee_bsk: installment.late_fee_bsk,
        },
      });

    if (logError) {
      console.error("Failed to log notification:", logError);
      return false;
    }

    console.log(
      `Sent ${notificationType} reminder for installment ${installment.id} to user ${installment.bsk_loans.user_id}`
    );
    return true;
  } catch (error) {
    console.error("Error sending reminder:", error);
    return false;
  }
}
