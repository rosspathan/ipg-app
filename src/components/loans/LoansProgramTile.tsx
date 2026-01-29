import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Landmark,
} from "lucide-react";

import { AstraCard } from "@/components/astra/AstraCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type LoanStatus = "active" | "overdue" | "in_arrears" | "completed" | string;

interface LoanRow {
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

interface InstallmentRow {
  id: string;
  loan_id: string;
  installment_number: number | null;
  due_date: string;
  total_due_bsk: number | null;
  status: string;
}

function StatusPill({ status }: { status: LoanStatus }) {
  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className="bg-primary/10 text-primary border-primary/30 text-[10px] px-2 py-0.5"
      >
        <Clock className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  }

  if (status === "overdue" || status === "in_arrears") {
    return (
      <Badge
        variant="outline"
        className="bg-warning/10 text-warning border-warning/30 text-[10px] px-2 py-0.5"
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Overdue
      </Badge>
    );
  }

  if (status === "completed") {
    return (
      <Badge
        variant="outline"
        className="bg-success/10 text-success border-success/30 text-[10px] px-2 py-0.5"
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Completed
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
      {String(status)}
    </Badge>
  );
}

function dueLabel(dueDate: string) {
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

export function LoansProgramTile() {
  const { user } = useAuthUser();
  const [expanded, setExpanded] = useState(false);

  const { data: activeLoans, isLoading: isActiveLoading } = useQuery({
    queryKey: ["loans-program-tile", "active", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as LoanRow[];
      const { data, error } = await supabase
        .from("bsk_loans")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "overdue", "in_arrears"])
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return (data || []) as LoanRow[];
    },
    enabled: !!user?.id,
  });

  const { data: loanHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["loans-program-tile", "history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as LoanRow[];
      const { data, error } = await supabase
        .from("bsk_loans")
        .select("id, loan_number, status, principal_bsk, paid_bsk, applied_at")
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return (data || []) as LoanRow[];
    },
    enabled: !!user?.id,
  });

  const activeLoan = activeLoans?.[0] ?? null;
  const activeLoanIds = useMemo(() => (activeLoans ?? []).map((l) => l.id), [activeLoans]);

  const { data: dueInstallments, isLoading: isInstallmentsLoading } = useQuery({
    queryKey: ["loans-program-tile", "installments", activeLoanIds],
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
  const recentHistory = (loanHistory ?? []).slice(0, 3);
  const isLoading = isActiveLoading || isHistoryLoading;

  const progressPct = useMemo(() => {
    const paid = activeLoan?.paid_bsk ?? 0;
    const total = (activeLoan as any)?.total_due_bsk ?? 0;
    if (!activeLoan || !total) return 0;
    return Math.max(0, Math.min(100, (paid / total) * 100));
  }, [activeLoan]);

  const collapsedSubline = useMemo(() => {
    if (!user?.id) return "Sign in to view";
    if (!activeLoan) return "No active loan";
    if (nextInstallment) {
      return `Next EMI: ${(nextInstallment.total_due_bsk ?? 0).toFixed(0)} BSK`;
    }

    const outstanding = (activeLoan as any)?.outstanding_bsk;
    if (typeof outstanding === "number") return `Outstanding: ${outstanding.toFixed(0)} BSK`;
    return "Active loan";
  }, [activeLoan, nextInstallment, user?.id]);

  return (
    <div
      className={cn(
        "col-span-1",
        expanded && "col-span-full",
        "transition-[grid-column]"
      )}
      data-testid="loans-program-tile"
    >
      <AstraCard
        variant="elevated"
        size="md"
        className={cn(
          "h-full",
          "p-3",
          "select-none",
          "transition-all",
          expanded ? "shadow-elevated" : "shadow-card"
        )}
      >
        {/* Compact header */}
        <button
          type="button"
          className="w-full flex items-start justify-between gap-3 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20">
                <Landmark className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-[var(--font-heading)] font-bold text-foreground leading-tight">
                  Loans
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{collapsedSubline}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeLoan ? <StatusPill status={activeLoan.status} /> : null}
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
            />
          </div>
        </button>

        {/* Expanded content */}
        <div
          className={cn(
            "overflow-hidden",
            "transition-[max-height,opacity] duration-200",
            expanded ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="pt-3 mt-3 border-t border-border/40 space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !user?.id ? (
              <p className="text-xs text-muted-foreground">Please sign in to view your loans.</p>
            ) : !activeLoan ? (
              <p className="text-xs text-muted-foreground">No active loans right now.</p>
            ) : (
              <>
                {/* Active loan block */}
                <div className="rounded-xl bg-card border border-border/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Active loan</p>
                      <p className="text-sm font-semibold text-foreground truncate">
                        #{activeLoan.loan_number ?? activeLoan.id.slice(0, 8)}
                      </p>
                    </div>
                    <StatusPill status={activeLoan.status} />
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Repayment</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {Math.round(progressPct)}%
                      </span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                  </div>
                </div>

                {/* Next EMI */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-card border border-border/50 p-3">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Next EMI
                    </p>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {(nextInstallment?.total_due_bsk ?? 0).toFixed(0)} BSK
                    </p>
                  </div>
                  <div className="rounded-xl bg-card border border-border/50 p-3">
                    <p className="text-[10px] text-muted-foreground">History</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {(loanHistory ?? []).length}
                    </p>
                  </div>
                </div>

                {/* Due installments */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Upcoming EMIs</p>
                    {isInstallmentsLoading ? (
                      <span className="text-[10px] text-muted-foreground">Loading…</span>
                    ) : null}
                  </div>

                  {(dueInstallments ?? []).slice(0, 3).map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          EMI {inst.installment_number ?? "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(inst.due_date), "dd MMM yyyy")} • {dueLabel(inst.due_date)}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-foreground tabular-nums">
                        {(inst.total_due_bsk ?? 0).toFixed(0)}
                      </p>
                    </div>
                  ))}

                  {(dueInstallments ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No upcoming dues.</p>
                  ) : null}
                </div>

                {/* Recent history */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Recent loans</p>
                  {recentHistory.map((loan) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between rounded-xl bg-card border border-border/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          #{loan.loan_number ?? loan.id.slice(0, 8)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(loan.principal_bsk ?? 0).toFixed(0)} BSK
                          {loan.applied_at ? ` • ${format(new Date(loan.applied_at), "dd MMM yyyy")}` : ""}
                        </p>
                      </div>
                      <StatusPill status={loan.status} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </AstraCard>
    </div>
  );
}
