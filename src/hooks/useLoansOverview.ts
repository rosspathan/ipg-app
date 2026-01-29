import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LoanStatus = "active" | "overdue" | "in_arrears" | "completed" | string;

export interface LoanRow {
  id: string;
  loan_number: string | null;
  status: LoanStatus;
  principal_bsk: number | null;
  paid_bsk: number | null;
  total_due_bsk?: number | null;
  outstanding_bsk?: number | null;
  tenor_weeks?: number | null;
  applied_at: string | null;
}

export interface InstallmentRow {
  id: string;
  loan_id: string;
  installment_number: number | null;
  due_date: string;
  total_due_bsk: number | null;
  status: string;
}

export function useLoansOverview(userId?: string) {
  const { data: activeLoans, isLoading: isActiveLoading } = useQuery({
    queryKey: ["loans-overview", "active", userId],
    queryFn: async () => {
      if (!userId) return [] as LoanRow[];
      const { data, error } = await supabase
        .from("bsk_loans")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "overdue", "in_arrears"])
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return (data || []) as LoanRow[];
    },
    enabled: !!userId,
  });

  const { data: loanHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["loans-overview", "history", userId],
    queryFn: async () => {
      if (!userId) return [] as LoanRow[];
      const { data, error } = await supabase
        .from("bsk_loans")
        .select("id, loan_number, status, principal_bsk, paid_bsk, applied_at")
        .eq("user_id", userId)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return (data || []) as LoanRow[];
    },
    enabled: !!userId,
  });

  const activeLoan = activeLoans?.[0] ?? null;
  const activeLoanIds = useMemo(() => (activeLoans ?? []).map((l) => l.id), [activeLoans]);

  const { data: dueInstallments, isLoading: isInstallmentsLoading } = useQuery({
    queryKey: ["loans-overview", "installments", activeLoanIds],
    queryFn: async () => {
      if (!activeLoanIds.length) return [] as InstallmentRow[];
      const { data, error } = await supabase
        .from("bsk_loan_installments")
        .select("*")
        .in("loan_id", activeLoanIds)
        .in("status", ["due", "overdue"])
        .order("due_date", { ascending: true });

      if (error) throw error;
      return (data || []) as InstallmentRow[];
    },
    enabled: activeLoanIds.length > 0,
  });

  const nextInstallment = dueInstallments?.[0] ?? null;

  return {
    activeLoan,
    activeLoans: activeLoans ?? [],
    loanHistory: loanHistory ?? [],
    dueInstallments: dueInstallments ?? [],
    nextInstallment,
    isActiveLoading,
    isHistoryLoading,
    isInstallmentsLoading,
    isLoading: isActiveLoading || isHistoryLoading,
  };
}
