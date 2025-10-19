import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  Coins,
  Calendar,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LoansPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const [applyDialog, setApplyDialog] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");

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

  const maxLoanAmount = balance?.holding_balance
    ? Number(balance.holding_balance) * 0.5
    : 0;

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


  const handleApplyLoan = async () => {
    if (!user || !loanAmount) return;

    const amount = Number(loanAmount);
    if (amount > maxLoanAmount) {
      toast.error(`Maximum loan amount is ${maxLoanAmount.toFixed(2)} BSK`);
      return;
    }

    try {
      toast.success("Loan application submitted!");
      setApplyDialog(false);
      setLoanAmount("");
      queryClient.invalidateQueries({ queryKey: ["bsk-loans"] });
    } catch (error) {
      toast.error("Failed to apply for loan");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      {/* Backlink */}
      <BacklinkBar programName="BSK Loans" />
      
      <div className="p-4 space-y-4">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-4">
          Borrow against your holdings at 0% interest
        </p>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {maxLoanAmount.toFixed(2)} BSK
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Borrowed</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {totalBorrowed.toFixed(2)} BSK
              </p>
            </CardContent>
          </Card>
        </div>

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
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(inst.due_date).toLocaleDateString()}
                        {inst.auto_debit_attempted_at && (
                          <span className="ml-2 text-primary">• Auto-debit attempted</span>
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

        {/* Apply Button */}
        {!activeLoan && (
          <Button
            onClick={() => setApplyDialog(true)}
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 h-12 text-lg"
            disabled={maxLoanAmount === 0}
          >
            <Coins className="w-5 h-5" />
            Apply for Loan
          </Button>
        )}

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

      {/* Apply Dialog */}
      <Dialog open={applyDialog} onOpenChange={setApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for BSK Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Loan Amount (BSK)
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                max={maxLoanAmount}
              />
              <p className="text-xs text-muted-foreground">
                Maximum: {maxLoanAmount.toFixed(2)} BSK (50% of holding balance)
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Interest Rate</span>
                <span className="font-medium text-success">0%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">16 Weeks</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Weekly Repayment</span>
                <span className="font-medium">
                  {loanAmount ? (Number(loanAmount) / 16).toFixed(2) : "0.00"} BSK
                </span>
              </div>
            </div>

            <Button onClick={handleApplyLoan} className="w-full bg-primary">
              Confirm Application
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
