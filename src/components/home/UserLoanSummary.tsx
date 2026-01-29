import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useNavigation } from "@/hooks/useNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Landmark, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ChevronRight,
  CreditCard,
  TrendingDown
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface LoanInstallment {
  id: string;
  installment_number: number;
  due_date: string;
  principal_bsk: number;
  interest_bsk: number;
  total_due_bsk: number;
  status: string;
}

interface ActiveLoan {
  id: string;
  loan_number: string;
  principal_bsk: number;
  paid_bsk: number;
  outstanding_bsk: number;
  total_due_bsk: number;
  status: string;
  tenor_weeks: number;
  applied_at: string;
  installments?: LoanInstallment[];
}

export function UserLoanSummary() {
  const { user } = useAuthUser();
  const { navigate } = useNavigation();

  // Fetch active loans for the user
  const { data: loans, isLoading } = useQuery({
    queryKey: ["user-active-loans", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("bsk_loans")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "overdue", "in_arrears"])
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch installments for active loans
  const { data: installments } = useQuery({
    queryKey: ["user-loan-installments", loans?.map(l => l.id)],
    queryFn: async () => {
      if (!loans || loans.length === 0) return [];
      
      const { data, error } = await supabase
        .from("bsk_loan_installments")
        .select("*")
        .in("loan_id", loans.map(l => l.id))
        .in("status", ["due", "overdue"])
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!loans && loans.length > 0,
  });

  // Fetch all loans for history count
  const { data: loanHistory } = useQuery({
    queryKey: ["user-loan-history-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("bsk_loans")
        .select("id, status, principal_bsk, paid_bsk")
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no loans at all, show empty state within the box
  if (!loanHistory || loanHistory.length === 0) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Landmark className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base">My Loans</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="p-3 rounded-full bg-muted/50 mb-3">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No active loans</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Your loan details will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeLoan = loans && loans.length > 0 ? loans[0] : null;
  const nextInstallment = installments && installments.length > 0 ? installments[0] : null;

  // Calculate summary stats
  const totalLoans = loanHistory.length;
  const completedLoans = loanHistory.filter(l => l.status === 'completed').length;
  const totalBorrowed = loanHistory.reduce((sum, l) => sum + (l.principal_bsk || 0), 0);
  const totalPaid = loanHistory.reduce((sum, l) => sum + (l.paid_bsk || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case 'overdue':
      case 'in_arrears':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    return differenceInDays(new Date(dueDate), new Date());
  };

  const getDueStatusColor = (daysTillDue: number) => {
    if (daysTillDue < 0) return "text-destructive";
    if (daysTillDue <= 2) return "text-warning";
    return "text-success";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Landmark className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">My Loans</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/loans")}
            className="text-primary text-xs h-7 px-2"
          >
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Active Loan Details */}
        {activeLoan ? (
          <div 
            className="space-y-3 cursor-pointer"
            onClick={() => navigate("/app/loans")}
          >
            {/* Loan Info Row */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/40">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Loan #{activeLoan.loan_number || activeLoan.id.substring(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{activeLoan.tenor_weeks} weeks term</p>
                </div>
              </div>
              {getStatusBadge(activeLoan.status)}
            </div>

            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Repayment Progress</span>
                <span className="font-medium">
                  {Math.round(((activeLoan.paid_bsk || 0) / (activeLoan.total_due_bsk || 1)) * 100)}%
                </span>
              </div>
              <Progress 
                value={((activeLoan.paid_bsk || 0) / (activeLoan.total_due_bsk || 1)) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Paid: {(activeLoan.paid_bsk || 0).toFixed(2)} BSK</span>
                <span>Total: {(activeLoan.total_due_bsk || 0).toFixed(2)} BSK</span>
              </div>
            </div>

            {/* Outstanding & Next Payment Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-card border border-border/40">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <TrendingDown className="w-3 h-3" />
                  <span>Outstanding</span>
                </div>
                <p className="font-bold text-sm text-warning">{(activeLoan.outstanding_bsk || 0).toFixed(2)} BSK</p>
              </div>

              {nextInstallment ? (
                <div className="p-3 rounded-lg bg-card border border-border/40">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>Next EMI</span>
                  </div>
                  <p className="font-bold text-sm">{(nextInstallment.total_due_bsk || 0).toFixed(2)} BSK</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-card border border-border/40">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Next EMI</span>
                  </div>
                  <p className="font-bold text-sm text-success">Paid</p>
                </div>
              )}
            </div>

            {/* Next Payment Date */}
            {nextInstallment && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs">Next Payment</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium">
                    {format(new Date(nextInstallment.due_date), "dd MMM yyyy")}
                  </span>
                  <p className={cn("text-[10px]", getDueStatusColor(getDaysUntilDue(nextInstallment.due_date)))}>
                    {getDaysUntilDue(nextInstallment.due_date) < 0 
                      ? `${Math.abs(getDaysUntilDue(nextInstallment.due_date))} days overdue`
                      : getDaysUntilDue(nextInstallment.due_date) === 0
                      ? "Due today"
                      : `Due in ${getDaysUntilDue(nextInstallment.due_date)} days`}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No Active Loan - Show History Only */
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <CheckCircle className="h-8 w-8 text-success mb-2" />
            <p className="text-sm font-medium">No Active Loans</p>
            <p className="text-xs text-muted-foreground">All loans completed!</p>
          </div>
        )}

        {/* Loan Stats Summary */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
          <div className="text-center">
            <p className="text-lg font-bold">{totalLoans}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-success">{completedLoans}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{totalBorrowed.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">BSK Borrowed</p>
          </div>
        </div>

        {/* View History Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-lg text-xs h-8"
          onClick={() => navigate("/app/loans/history")}
        >
          <Landmark className="w-3 h-3 mr-1" />
          View Loan History
          <ChevronRight className="w-3 h-3 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
}
