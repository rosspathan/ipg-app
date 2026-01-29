import { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Calendar, ChevronRight, Landmark, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AstraCard } from "@/components/astra/AstraCard";
import { LoanStatusPill } from "@/components/loans/LoanStatusPill";
import { LoanForeclosureDialog } from "@/components/loans/LoanForeclosureDialog";
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useLoansOverview } from "@/hooks/useLoansOverview";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function dueLabel(dueDate: string) {
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

export default function LoansOverviewPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const [foreclosureOpen, setForeclosureOpen] = useState(false);
  
  const {
    activeLoan,
    loanHistory,
    dueInstallments,
    nextInstallment,
    isLoading,
    isInstallmentsLoading,
  } = useLoansOverview(user?.id);

  // Fetch user's BSK balance for foreclosure dialog
  const { data: userBalance } = useQuery({
    queryKey: ["bsk-balance-for-foreclosure", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .single();
      return Number(data?.withdrawable_balance) || 0;
    },
    enabled: !!user?.id,
  });

  const progressPct = useMemo(() => {
    const paid = activeLoan?.paid_bsk ?? 0;
    const total = (activeLoan as any)?.total_due_bsk ?? 0;
    if (!activeLoan || !total) return 0;
    return Math.max(0, Math.min(100, (paid / total) * 100));
  }, [activeLoan]);

  // Calculate outstanding for foreclosure
  const outstandingBsk = useMemo(() => {
    if (!activeLoan) return 0;
    return Number((activeLoan as any)?.outstanding_bsk) || 0;
  }, [activeLoan]);

  return (
    <ProgramPageTemplate title="Loans" subtitle="Your EMIs, progress and history">
      <div className="space-y-6 pb-24" data-testid="loans-overview-page">
        <AstraCard variant="elevated" size="md" className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !user?.id ? (
            <p className="text-sm text-muted-foreground">Please sign in to view your loans.</p>
          ) : !activeLoan ? (
            <div className="space-y-4">
              {/* Archived Notice */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
                <div className="flex items-start gap-2">
                  <Landmark className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Program Archived</p>
                    <p className="text-[10px] text-muted-foreground">
                      New loan applications are no longer accepted. Existing loans continue processing normally.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50 border border-border/50">
                  <Landmark className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-[var(--font-heading)] font-bold text-foreground">No active loan</p>
                  <p className="text-xs text-muted-foreground">If you had a loan, it would appear here.</p>
                </div>
              </div>

              <Button asChild variant="outline" className="w-full">
                <Link to="/app/programs">Back to Programs</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Active loan</p>
                  <p className="text-base font-semibold text-foreground truncate">
                    #{activeLoan.loan_number ?? activeLoan.id.slice(0, 8)}
                  </p>
                  {nextInstallment ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Next EMI {(nextInstallment.total_due_bsk ?? 0).toFixed(0)} BSK •{" "}
                      {format(new Date(nextInstallment.due_date), "dd MMM yyyy")} ({dueLabel(nextInstallment.due_date)})
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">No upcoming dues.</p>
                  )}
                </div>
                <LoanStatusPill status={activeLoan.status} />
              </div>

              {/* Progress */}
              <div className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Repayment progress</span>
                  <span className="font-medium text-foreground tabular-nums">{Math.round(progressPct)}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>

              {/* Quick stats */}
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
                  <p className="text-[10px] text-muted-foreground">Loan history</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{loanHistory.length}</p>
                </div>
              </div>

              {/* SETTLE LOAN BUTTON - Prominent CTA */}
              {outstandingBsk > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                      <p className="text-lg font-bold text-foreground">{outstandingBsk.toFixed(2)} BSK</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">2% discount</p>
                      <p className="text-xs text-muted-foreground">on early settlement</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setForeclosureOpen(true)}
                    className="w-full h-12 gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg"
                  >
                    <FileCheck className="w-5 h-5" />
                    Settle Loan (Foreclose)
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Pay off your entire loan now and close it immediately
                  </p>
                </div>
              )}

              {/* Upcoming EMIs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Upcoming EMIs</p>
                  {isInstallmentsLoading ? (
                    <span className="text-[10px] text-muted-foreground">Loading…</span>
                  ) : null}
                </div>

                {dueInstallments.slice(0, 8).map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">EMI {inst.installment_number ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(inst.due_date), "dd MMM yyyy")} • {dueLabel(inst.due_date)}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-foreground tabular-nums">
                      {(inst.total_due_bsk ?? 0).toFixed(0)}
                    </p>
                  </div>
                ))}

                {dueInstallments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No upcoming dues.</p>
                ) : null}
              </div>

              {/* Recent loans */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Recent loans</p>
                  <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                    <Link to="/app/loans/history" className="flex items-center gap-1">
                      View all <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {loanHistory.slice(0, 10).map((loan) => (
                  <Link
                    key={loan.id}
                    to={`/app/loans/details?id=${loan.id}`}
                    className={cn(
                      "block",
                      "rounded-xl bg-card border border-border/50 px-3 py-2",
                      "hover:bg-muted/20 transition-colors"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
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
                  </Link>
                ))}
              </div>
            </div>
          )}
        </AstraCard>
      </div>

      {/* Foreclosure Dialog */}
      {activeLoan && (
        <LoanForeclosureDialog
          open={foreclosureOpen}
          onOpenChange={setForeclosureOpen}
          loan={{
            id: activeLoan.id,
            loan_number: activeLoan.loan_number ?? activeLoan.id.slice(0, 8),
            outstanding_bsk: outstandingBsk,
            principal_bsk: Number(activeLoan.principal_bsk) || 0,
            paid_bsk: Number(activeLoan.paid_bsk) || 0,
          }}
          userBalance={userBalance || 0}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["loans-overview"] });
            queryClient.invalidateQueries({ queryKey: ["bsk-balance-for-foreclosure"] });
          }}
        />
      )}
    </ProgramPageTemplate>
  );
}
