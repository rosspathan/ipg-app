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
      <div className="px-4">
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no loans at all, don't show the section
  if (!loanHistory || loanHistory.length === 0) {
    return null;
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
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    return differenceInDays(new Date(dueDate), new Date());
  };

  const getDueStatusColor = (daysTillDue: number) => {
    if (daysTillDue < 0) return "text-danger";
    if (daysTillDue <= 2) return "text-warning";
    return "text-success";
  };

  return (
    <div className="px-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-semibold">My Loans</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app/loans")}
          className="text-primary text-sm"
        >
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Active Loan Card */}
      {activeLoan && (
        <Card 
          className="border-warning/30 bg-gradient-to-br from-warning/5 to-transparent cursor-pointer hover:border-warning/50 transition-colors"
          onClick={() => navigate("/app/loans")}
        >
          <CardContent className="p-4 space-y-4">
            {/* Loan Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                  <CreditCard className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Loan #{activeLoan.loan_number || activeLoan.id.substring(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{activeLoan.tenor_weeks} weeks term</p>
                </div>
              </div>
              {getStatusBadge(activeLoan.status)}
            </div>

            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Repayment Progress</span>
                <span className="font-medium">
                  {Math.round((activeLoan.paid_bsk / activeLoan.total_due_bsk) * 100)}%
                </span>
              </div>
              <Progress 
                value={(activeLoan.paid_bsk / activeLoan.total_due_bsk) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Paid: {activeLoan.paid_bsk.toFixed(2)} BSK</span>
                <span>Total: {activeLoan.total_due_bsk.toFixed(2)} BSK</span>
              </div>
            </div>

            {/* Outstanding & Next Payment */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-card border border-border/40">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <TrendingDown className="w-3 h-3" />
                  <span>Outstanding</span>
                </div>
                <p className="font-bold text-warning">{activeLoan.outstanding_bsk.toFixed(2)} BSK</p>
              </div>

              {nextInstallment && (
                <div className="p-3 rounded-lg bg-card border border-border/40">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>Next EMI</span>
                  </div>
                  <p className="font-bold">{nextInstallment.total_due_bsk.toFixed(2)} BSK</p>
                  <p className={cn("text-xs mt-1", getDueStatusColor(getDaysUntilDue(nextInstallment.due_date)))}>
                    {getDaysUntilDue(nextInstallment.due_date) < 0 
                      ? `${Math.abs(getDaysUntilDue(nextInstallment.due_date))} days overdue`
                      : getDaysUntilDue(nextInstallment.due_date) === 0
                      ? "Due today"
                      : `Due in ${getDaysUntilDue(nextInstallment.due_date)} days`}
                  </p>
                </div>
              )}
            </div>

            {/* Next Payment Date */}
            {nextInstallment && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Next Payment Date</span>
                </div>
                <span className="text-sm font-medium">
                  {format(new Date(nextInstallment.due_date), "dd MMM yyyy")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loan History Summary */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{totalLoans}</p>
              <p className="text-xs text-muted-foreground">Total Loans</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{completedLoans}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalBorrowed.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">BSK Borrowed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View History Button */}
      <Button
        variant="outline"
        className="w-full rounded-xl"
        onClick={() => navigate("/app/loans/history")}
      >
        <Landmark className="w-4 h-4 mr-2" />
        View Loan History
        <ChevronRight className="w-4 h-4 ml-auto" />
      </Button>
    </div>
  );
}
