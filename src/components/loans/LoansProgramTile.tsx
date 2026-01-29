import { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  Landmark,
} from "lucide-react";

import { AstraCard } from "@/components/astra/AstraCard";
import { LoanStatusPill } from "@/components/loans/LoanStatusPill";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useLoansOverview } from "@/hooks/useLoansOverview";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

function dueLabel(dueDate: string) {
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

export function LoansProgramTile() {
  const { user } = useAuthUser();
  const [expanded, setExpanded] = useState(false);

  const {
    activeLoan,
    loanHistory,
    dueInstallments,
    nextInstallment,
    isLoading,
    isInstallmentsLoading,
  } = useLoansOverview(user?.id);

  const recentHistory = loanHistory.slice(0, 3);

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
            {activeLoan ? <LoanStatusPill status={activeLoan.status} /> : null}
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
                    <LoanStatusPill status={activeLoan.status} />
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
                      <LoanStatusPill status={loan.status} />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to="/app/loans">Open</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="w-full">
                    <Link to="/app/loans/history">History</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </AstraCard>
    </div>
  );
}
