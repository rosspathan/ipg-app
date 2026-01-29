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

  const activeLoan = loans?.find((l: any) => l.status === "active");
  const totalBorrowed = loans
    ?.filter((l: any) => l.status === "active")
    .reduce((sum: number, l: any) => sum + Number(l.loan_amount_bsk), 0) || 0;

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

        {/* Active Loan */}
        {activeLoan && (
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Active Loan</CardTitle>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Loan Amount</p>
                  <p className="text-lg font-bold text-foreground">
                    {activeLoan.loan_amount_bsk} BSK
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Repaid</p>
                  <p className="text-lg font-bold text-success">
                    {activeLoan.repaid_amount_bsk || 0} BSK
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Repayment Progress</span>
                  <span className="font-medium text-foreground">
                    {Math.round(
                      ((activeLoan.repaid_amount_bsk || 0) / activeLoan.loan_amount_bsk) * 100
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    ((activeLoan.repaid_amount_bsk || 0) / activeLoan.loan_amount_bsk) * 100
                  }
                  className="h-2"
                />
              </div>

              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Next Auto-Debit</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Weekly payments are automatically processed every Monday
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Final Due:{" "}
                  {activeLoan.due_date
                    ? new Date(activeLoan.due_date).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
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

        {/* Action Buttons - Settlement option for active loans */}
        {activeLoan && (
          <Button
            onClick={() => setForeclosureDialog(true)}
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 h-12 text-lg"
          >
            <FileCheck className="w-5 h-5" />
            Settle Loan Early
          </Button>
        )}

        {/* Notification Preferences */}
        <NotificationPreferences />

        {/* Loan History */}
        {loans && loans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loan History</CardTitle>
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
                        loan.status === "repaid"
                          ? "bg-success/20"
                          : "bg-primary/20"
                      )}
                    >
                      {loan.status === "repaid" ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <Coins className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {loan.loan_amount_bsk} BSK
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(loan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      loan.status === "repaid"
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
      {activeLoan && (
        <LoanForeclosureDialog
          open={foreclosureDialog}
          onOpenChange={setForeclosureDialog}
          loan={{
            id: activeLoan.id,
            loan_number: activeLoan.loan_number,
            outstanding_bsk: Number(activeLoan.outstanding_bsk) || 0,
            principal_bsk: Number(activeLoan.principal_bsk) || 0,
            paid_bsk: Number(activeLoan.paid_bsk) || 0,
          }}
          userBalance={Number(balance?.withdrawable_balance) || 0}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bsk-loans"] });
            queryClient.invalidateQueries({ queryKey: ["loan-installments"] });
            queryClient.invalidateQueries({ queryKey: ["bsk-balance"] });
          }}
        />
      )}
    </div>
  );
}
