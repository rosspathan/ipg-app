import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LoanEventType =
  | "application_submitted"
  | "loan_approved"
  | "loan_disbursed"
  | "emi_paid"
  | "emi_overdue"
  | "emi_auto_deducted"
  | "settlement_paid"
  | "settlement_disbursal"
  | "loan_completed"
  | "loan_foreclosed"
  | "loan_forfeited"
  | "late_fee_applied"
  | "processing_fee";

export interface LoanHistoryEvent {
  id: string;
  loan_id: string;
  user_id: string;
  created_at: string;
  event_type: LoanEventType;
  title: string;
  description: string;
  amount_bsk?: number;
  balance_after?: number;
  metadata?: {
    installment_number?: number;
    weeks_overdue?: number;
    reason?: string;
    admin_notes?: string;
    forfeited_amount?: number;
    payout_amount?: number;
    direction?: "debit" | "credit";
    [key: string]: any;
  };
  variant: "default" | "success" | "warning" | "destructive" | "info";
}

interface UseLoanHistoryOptions {
  userId?: string;
  loanId?: string;
  includeAllUsers?: boolean;
  limit?: number;
}

export function useLoanHistory(options: UseLoanHistoryOptions = {}) {
  const { userId, loanId, includeAllUsers = false, limit = 100 } = options;

  return useQuery({
    queryKey: ["loan-history", userId, loanId, includeAllUsers, limit],
    queryFn: async () => {
      const events: LoanHistoryEvent[] = [];

      // 1. Fetch loan records
      let loansQuery = supabase
        .from("bsk_loans")
        .select("*")
        .order("created_at", { ascending: false });

      if (userId && !includeAllUsers) {
        loansQuery = loansQuery.eq("user_id", userId);
      }
      if (loanId) {
        loansQuery = loansQuery.eq("id", loanId);
      }

      const { data: loans, error: loansError } = await loansQuery;
      if (loansError) throw loansError;

      const loanIds = (loans || []).map((l) => l.id);
      const userIds = [...new Set((loans || []).map((l) => l.user_id))];
      const loanUserIdByLoanId = new Map<string, string>();
      for (const loan of loans || []) {
        loanUserIdByLoanId.set(loan.id, loan.user_id);
      }

      // 2. Fetch installments for all loans
      let installmentsData: any[] = [];
      if (loanIds.length > 0) {
        const { data, error } = await supabase
          .from("bsk_loan_installments")
          .select("*")
          .in("loan_id", loanIds)
          .order("due_date", { ascending: true });
        if (error) throw error;
        installmentsData = data || [];
      }

      // Detect batch-paid installments (typically early settlement) so we don't show a misleading
      // single "EMI #3 Paid" entry after a settlement.
      const paidBatchCountByLoanAndPaidAt = new Map<string, number>();
      for (const inst of installmentsData) {
        if (inst?.status === "paid" && inst?.paid_at) {
          const key = `${inst.loan_id}__${inst.paid_at}`;
          paidBatchCountByLoanAndPaidAt.set(key, (paidBatchCountByLoanAndPaidAt.get(key) || 0) + 1);
        }
      }
      const isBatchPaid = (inst: any) => {
        if (!inst?.loan_id || !inst?.paid_at) return false;
        const key = `${inst.loan_id}__${inst.paid_at}`;
        return (paidBatchCountByLoanAndPaidAt.get(key) || 0) >= 3;
      };

      // 3. Fetch ledger entries for loan-related transactions
      let ledgerData: any[] = [];
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from("unified_bsk_ledger")
          .select("*")
          .in("user_id", userIds)
          .or(
            "tx_subtype.ilike.%loan%,tx_subtype.ilike.%forfe%,tx_subtype.ilike.%settle%"
          )
          .order("created_at", { ascending: false })
          .limit(limit * 2);
        if (error) throw error;
        ledgerData = data || [];
      }

      // Build events from loans
      for (const loan of loans || []) {
        // Application submitted
        events.push({
          id: `app-${loan.id}`,
          loan_id: loan.id,
          user_id: loan.user_id,
          created_at: loan.created_at || loan.applied_at,
          event_type: "application_submitted",
          title: "Savings Plan Started",
          description: `Applied for ${Number(loan.principal_bsk).toFixed(2)} BSK plan (${loan.tenor_weeks} weeks)`,
          amount_bsk: Number(loan.principal_bsk),
          metadata: { loan_number: loan.loan_number },
          variant: "default",
        });

        // Approved
        if (loan.approved_at) {
          events.push({
            id: `approved-${loan.id}`,
            loan_id: loan.id,
            user_id: loan.user_id,
            created_at: loan.approved_at,
            event_type: "loan_approved",
            title: "Plan Approved",
            description: "Your savings plan has been approved and is now active",
            variant: "success",
          });
        }

        // Cancelled/Foreclosed
        if (loan.status === "cancelled") {
          events.push({
            id: `cancelled-${loan.id}`,
            loan_id: loan.id,
            user_id: loan.user_id,
            created_at: loan.updated_at || loan.created_at,
            event_type: "loan_foreclosed",
            title: "Plan Auto-Foreclosed",
            description: loan.admin_notes || "Plan cancelled due to 4+ consecutive missed weeks",
            metadata: {
              reason: loan.admin_notes || "Missed 4 consecutive EMI payments",
            },
            variant: "destructive",
          });
        }

        // Completed
        if (loan.status === "closed" && loan.closed_at) {
          events.push({
            id: `closed-${loan.id}`,
            loan_id: loan.id,
            user_id: loan.user_id,
            created_at: loan.closed_at,
            event_type: "loan_completed",
            title: "Plan Completed Successfully",
            description: "All payments completed. Your payout has been credited to your wallet.",
            metadata: { payout_amount: Number(loan.principal_bsk), direction: "credit" },
            variant: "success",
          });
        }
      }

      // Build events from installments
      for (const inst of installmentsData) {
        if (inst.status === "paid" && inst.paid_at) {
          // If many installments are marked paid at the exact same timestamp, it's almost always
          // an early settlement batch update. We show the actual settlement debit from the ledger,
          // so we skip generating per-installment events here.
          if (isBatchPaid(inst)) continue;

          events.push({
            id: `emi-paid-${inst.id}`,
            loan_id: inst.loan_id,
            user_id: loanUserIdByLoanId.get(inst.loan_id) || "",
            created_at: inst.paid_at,
            event_type: "emi_paid",
            title: `EMI #${inst.installment_number} Paid`,
            description: `Weekly payment of ${Number(inst.emi_bsk || inst.total_due_bsk).toFixed(2)} BSK`,
            amount_bsk: Number(inst.emi_bsk || inst.total_due_bsk),
            metadata: { installment_number: inst.installment_number, direction: "debit" },
            variant: "success",
          });
        }

        if (inst.status === "overdue") {
          events.push({
            id: `emi-overdue-${inst.id}`,
            loan_id: inst.loan_id,
            user_id: loanUserIdByLoanId.get(inst.loan_id) || "",
            created_at: inst.due_date,
            event_type: "emi_overdue",
            title: `EMI #${inst.installment_number} Overdue`,
            description: `Payment of ${Number(inst.emi_bsk || inst.total_due_bsk).toFixed(2)} BSK was not made by due date`,
            amount_bsk: Number(inst.emi_bsk || inst.total_due_bsk),
            metadata: { installment_number: inst.installment_number },
            variant: "warning",
          });
        }

        if (inst.status === "cancelled") {
          events.push({
            id: `emi-cancelled-${inst.id}`,
            loan_id: inst.loan_id,
            user_id: loanUserIdByLoanId.get(inst.loan_id) || "",
            created_at: inst.updated_at || inst.due_date,
            event_type: "loan_forfeited",
            title: `EMI #${inst.installment_number} Forfeited`,
            description: `This installment was cancelled due to plan foreclosure`,
            metadata: { installment_number: inst.installment_number },
            variant: "destructive",
          });
        }
      }

      // Build events from ledger
      for (const entry of ledgerData) {
        const subtype = entry.tx_subtype || "";
        const loanIdFromLedger = entry.meta_json?.loan_id || entry.metadata?.loan_id || "";

        if (subtype === "loan_forfeited" || subtype === "loan_forfeiture") {
          events.push({
            id: entry.id,
            loan_id: loanIdFromLedger,
            user_id: entry.user_id,
            created_at: entry.created_at,
            event_type: "loan_forfeited",
            title: "Paid EMIs Forfeited",
            description: `${Math.abs(Number(entry.amount_bsk)).toFixed(2)} BSK was forfeited due to plan cancellation`,
            amount_bsk: Math.abs(Number(entry.amount_bsk)),
            metadata: {
              forfeited_amount: Math.abs(Number(entry.amount_bsk)),
              direction: "debit",
            },
            variant: "destructive",
          });
        }

        if (subtype === "loan_settlement_disbursal" || subtype === "loan_completion_disbursal") {
          events.push({
            id: entry.id,
            loan_id: loanIdFromLedger,
            user_id: entry.user_id,
            created_at: entry.created_at,
            event_type: "settlement_disbursal",
            title: "Final Payout Received",
            description: `${Number(entry.amount_bsk).toFixed(2)} BSK credited to your wallet`,
            amount_bsk: Number(entry.amount_bsk),
            metadata: { payout_amount: Number(entry.amount_bsk), direction: "credit" },
            variant: "success",
          });
        }

        if (subtype === "loan_settlement") {
          events.push({
            id: entry.id,
            loan_id: loanIdFromLedger,
            user_id: entry.user_id,
            created_at: entry.created_at,
            event_type: "settlement_paid",
            title: "Settlement Payment",
            description: `${Math.abs(Number(entry.amount_bsk)).toFixed(2)} BSK paid to settle remaining EMIs`,
            amount_bsk: Math.abs(Number(entry.amount_bsk)),
            metadata: { direction: "debit" },
            variant: "info",
          });
        }

        if (subtype === "loan_processing_fee") {
          events.push({
            id: entry.id,
            loan_id: loanIdFromLedger,
            user_id: entry.user_id,
            created_at: entry.created_at,
            event_type: "processing_fee",
            title: "Processing Fee Deducted",
            description: `${Math.abs(Number(entry.amount_bsk)).toFixed(2)} BSK processing fee`,
            amount_bsk: Math.abs(Number(entry.amount_bsk)),
            metadata: { direction: "debit" },
            variant: "warning",
          });
        }

        if (subtype === "late_fee") {
          events.push({
            id: entry.id,
            loan_id: loanIdFromLedger,
            user_id: entry.user_id,
            created_at: entry.created_at,
            event_type: "late_fee_applied",
            title: "Late Fee Applied",
            description: `${Math.abs(Number(entry.amount_bsk)).toFixed(2)} BSK late payment fee`,
            amount_bsk: Math.abs(Number(entry.amount_bsk)),
            metadata: { direction: "debit" },
            variant: "warning",
          });
        }
      }

      // Sort by date (newest first) and deduplicate
      const seen = new Set<string>();
      const uniqueEvents = events
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .filter((e) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        })
        .slice(0, limit);

      return uniqueEvents;
    },
    enabled: !!(userId || includeAllUsers),
  });
}

// Hook for admin to get aggregated statistics
export function useLoanAuditStats() {
  return useQuery({
    queryKey: ["loan-audit-stats"],
    queryFn: async () => {
      // Get loan status counts
      const { data: loans, error } = await supabase
        .from("bsk_loans")
        .select("status, principal_bsk, paid_bsk, outstanding_bsk");

      if (error) throw error;

      const stats = {
        total_loans: loans?.length || 0,
        active: 0,
        completed: 0,
        foreclosed: 0,
        pending: 0,
        total_principal_bsk: 0,
        total_paid_bsk: 0,
        total_outstanding_bsk: 0,
        total_forfeited_bsk: 0,
      };

      for (const loan of loans || []) {
        stats.total_principal_bsk += Number(loan.principal_bsk) || 0;
        stats.total_paid_bsk += Number(loan.paid_bsk) || 0;
        stats.total_outstanding_bsk += Number(loan.outstanding_bsk) || 0;

        switch (loan.status) {
          case "active":
          case "in_arrears":
            stats.active++;
            break;
          case "closed":
            stats.completed++;
            break;
          case "cancelled":
            stats.foreclosed++;
            stats.total_forfeited_bsk += Number(loan.paid_bsk) || 0;
            break;
          case "pending":
            stats.pending++;
            break;
        }
      }

      return stats;
    },
  });
}
