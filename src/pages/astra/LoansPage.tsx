import * as React from "react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  Coins,
  Calendar,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Archive,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { LoanForeclosureDialog } from "@/components/loans/LoanForeclosureDialog";
import { NotificationPreferences } from "@/components/loans/NotificationPreferences";
import { cn } from "@/lib/utils";

export default function LoansPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const [foreclosureDialog, setForeclosureDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  // Fetch active loans
  const { data: loans, isLoading } = useQuery({
    queryKey: ["bsk-loans", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from("bsk_loans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch BSK balance
  const { data: balance } = useQuery({
    queryKey: ["bsk-balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Find any active loan (active, in_arrears status)
  const activeLoan = loans?.find((l: any) => ["active", "in_arrears"].includes(l.status));
  const totalBorrowed = loans
    ?.filter((l: any) => ["active", "in_arrears"].includes(l.status))
    .reduce((sum: number, l: any) => sum + Number(l.principal_bsk || l.loan_amount_bsk || 0), 0) || 0;

  // Fetch installments for active loan
  const { data: installments } = useQuery({
    queryKey: ["loan-installments", activeLoan?.id],
    queryFn: async () => {
      if (!activeLoan?.id) return [];

      const { data, error } = await supabase
        .from("bsk_loan_installments")
        .select("*")
        .eq("loan_id", activeLoan.id)
        .order("installment_number");

      if (error) throw error;
      return data;
    },
    enabled: !!activeLoan?.id,
  });

  const handleSettleLoan = (loan: any) => {
    setSelectedLoan(loan);
    setForeclosureDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      {/* Backlink */}
      <BacklinkBar programName="BSK Loans" />
      
      <div className="p-4 space-y-4">
        {/* Archived Notice */}
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-4 flex items-start gap-3">
          <Archive className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Program Archived</p>
            <p className="text-xs text-muted-foreground mt-1">
              The BSK Loan program is no longer accepting new applications. 
              Existing loans will continue to be serviced normally.
            </p>
          </div>
        </div>

        {/* Stats - Only show borrowed for existing loans */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Active Borrowed</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {totalBorrowed.toFixed(2)} BSK
            </p>
          </CardContent>
        </Card>

        {/* Loan Info */}
        <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Loan Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
              <span className="text-sm text-foreground">Interest Rate</span>
              <span className="font-bold text-success text-lg">0%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-foreground">Loan Duration</span>
              <span className="font-medium text-foreground">16 Weeks</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-foreground">Max LTV</span>
              <span className="font-medium text-foreground">50%</span>
            </div>
            <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-xs text-warning">
                Loans are secured by your holding balance. Automatic repayment from vested BSK.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Loan with Settle Button */}
        {activeLoan && (
          <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/30 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Active loan</p>
                  <CardTitle className="text-lg font-bold">#{activeLoan.loan_number}</CardTitle>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Next EMI {Number(activeLoan.outstanding_bsk / (activeLoan.tenor_weeks - (installments?.filter((i: any) => i.status === 'paid').length || 0)) || 0).toFixed(0)} BSK • {activeLoan.next_due_date ? new Date(activeLoan.next_due_date).toLocaleDateString() : 'N/A'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Repayment progress</span>
                  <span className="font-bold text-foreground">
                    {Math.round((Number(activeLoan.paid_bsk) / Number(activeLoan.principal_bsk)) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(Number(activeLoan.paid_bsk) / Number(activeLoan.principal_bsk)) * 100}
                  className="h-2.5 bg-muted/50"
                />
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Next EMI</p>
                  <p className="text-lg font-bold text-foreground">
                    {Number(activeLoan.outstanding_bsk / Math.max(1, (activeLoan.tenor_weeks || 16) - (installments?.filter((i: any) => i.status === 'paid').length || 0))).toFixed(0)} BSK
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Loan history</p>
                  <p className="text-lg font-bold text-foreground">
                    {loans?.length || 0}
                  </p>
                </div>
              </div>

              {/* Outstanding Balance Highlight */}
              <div className="p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl border border-orange-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Outstanding Balance</span>
                  <span className="text-xl font-bold text-orange-500">
                    {Number(activeLoan.outstanding_bsk).toFixed(2)} BSK
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Settle early and save with 2% discount
                </p>
              </div>

              {/* PROMINENT Settle Button */}
              <Button
                onClick={() => handleSettleLoan(activeLoan)}
                className="w-full h-14 gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-lg font-semibold shadow-lg"
              >
                <FileCheck className="w-6 h-6" />
                Settle Loan (Foreclose)
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Pay off your entire loan now and close it immediately
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {installments && installments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {installments.map((inst: any) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        inst.status === "paid"
                          ? "bg-success/20"
                          : inst.status === "overdue"
                          ? "bg-destructive/20"
                          : "bg-primary/20"
                      )}
                    >
                      {inst.status === "paid" ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : inst.status === "overdue" ? (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Week {inst.installment_number} • {inst.total_due_bsk} BSK
                        {inst.late_fee_bsk > 0 && (
                          <span className="text-destructive ml-2">
                            +{inst.late_fee_bsk.toFixed(2)} late fee
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(inst.due_date).toLocaleDateString()}
                        {inst.auto_debit_attempted_at && (
                          <span className="ml-2 text-primary">• Auto-debit attempted</span>
                        )}
                        {inst.days_overdue > 0 && (
                          <span className="ml-2 text-destructive">
                            • {inst.days_overdue} days overdue
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      inst.status === "paid"
                        ? "bg-success/10 text-success border-success/20"
                        : inst.status === "overdue"
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-muted/10 text-muted-foreground"
                    )}
                  >
                    {inst.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notification Preferences */}
        <NotificationPreferences />

        {/* Recent Loans / Loan History */}
        {loans && loans.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent loans</CardTitle>
              <span className="text-xs text-muted-foreground">View all &gt;</span>
            </CardHeader>
            <CardContent className="space-y-2">
              {loans.slice(0, 5).map((loan: any) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        loan.status === "closed"
                          ? "bg-success/20"
                          : loan.status === "active"
                          ? "bg-primary/20"
                          : "bg-muted/20"
                      )}
                    >
                      {loan.status === "closed" ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : loan.status === "active" ? (
                        <CreditCard className="w-5 h-5 text-primary" />
                      ) : (
                        <Coins className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        #{loan.loan_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Number(loan.principal_bsk || 0).toFixed(0)} BSK • {new Date(loan.applied_at || loan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      loan.status === "closed"
                        ? "bg-success/10 text-success border-success/20"
                        : loan.status === "active"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted/10 text-muted-foreground"
                    )}
                  >
                    {loan.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Foreclosure Dialog */}
      {(selectedLoan || activeLoan) && (
        <LoanForeclosureDialog
          open={foreclosureDialog}
          onOpenChange={(open) => {
            setForeclosureDialog(open);
            if (!open) setSelectedLoan(null);
          }}
          loan={{
            id: (selectedLoan || activeLoan).id,
            loan_number: (selectedLoan || activeLoan).loan_number,
            outstanding_bsk: Number((selectedLoan || activeLoan).outstanding_bsk) || 0,
            principal_bsk: Number((selectedLoan || activeLoan).principal_bsk) || 0,
            paid_bsk: Number((selectedLoan || activeLoan).paid_bsk) || 0,
          }}
          userBalance={Number(balance?.withdrawable_balance) || 0}
          onSuccess={() => {
            setSelectedLoan(null);
            queryClient.invalidateQueries({ queryKey: ["bsk-loans"] });
            queryClient.invalidateQueries({ queryKey: ["loan-installments"] });
            queryClient.invalidateQueries({ queryKey: ["bsk-balance"] });
          }}
        />
      )}
    </div>
  );
}
