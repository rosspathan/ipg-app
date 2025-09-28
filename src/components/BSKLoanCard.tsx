import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { DollarSign, Calendar, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useToast } from "@/hooks/use-toast";

interface BSKLoanCardProps {
  className?: string;
  variant?: "compact" | "full";
  style?: React.CSSProperties;
}

interface ActiveLoan {
  id: string;
  loan_number: string;
  amount_inr: number;
  principal_bsk: number;
  paid_bsk: number;
  outstanding_bsk: number;
  next_due_date: string;
  status: string;
  tenor_weeks: number;
  current_installment?: number;
}

const BSKLoanCard = ({ className, variant = "compact", style }: BSKLoanCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [activeLoan, setActiveLoan] = useState<ActiveLoan | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextEmi, setNextEmi] = useState<{ amount_bsk: number; due_date: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadUserLoan();
    }
  }, [user]);

  const loadUserLoan = async () => {
    try {
      setLoading(true);
      
      // Get user's active loan
      const { data: loans, error } = await supabase
        .from('bsk_loans')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['active', 'in_arrears'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading loan:', error);
        return;
      }

      if (loans && loans.length > 0) {
        const loan = loans[0];
        setActiveLoan(loan);

        // Get next due installment
        const { data: nextInstallment } = await supabase
          .from('bsk_loan_installments')
          .select('*')
          .eq('loan_id', loan.id)
          .eq('status', 'due')
          .order('installment_number')
          .limit(1)
          .single();

        if (nextInstallment) {
          setNextEmi({
            amount_bsk: nextInstallment.total_due_bsk,
            due_date: nextInstallment.due_date
          });
        }
      }

    } catch (error) {
      console.error('Error in loadUserLoan:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressPercentage = () => {
    if (!activeLoan) return 0;
    return Math.round((activeLoan.paid_bsk / activeLoan.principal_bsk) * 100);
  };

  const getStatusColor = (status: string, daysTillDue: number) => {
    if (status === 'in_arrears' || daysTillDue < 0) return 'text-destructive';
    if (daysTillDue <= 1) return 'text-warning';
    return 'text-success';
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)} style={style}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return null;
  }

  if (!activeLoan) {
    return (
      <Card 
        className={cn(
          "group cursor-pointer relative overflow-hidden",
          "bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20",
          "hover:border-primary/40 hover:shadow-glow-primary transition-all duration-normal",
          className
        )}
        style={style}
        onClick={() => navigate("/app/loans")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">BSK Loans</CardTitle>
                <p className="text-sm text-muted-foreground">Borrow ₹100 - ₹50,000</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              0% Interest
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">16-week repayment</span>
              <span className="font-bold text-primary">Available</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Settled in BSK</span>
              <span className="font-bold text-success">No fees</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysTillDue = nextEmi ? getDaysUntilDue(nextEmi.due_date) : 0;
  const progressPercent = getProgressPercentage();

  if (variant === "compact") {
    return (
      <Card 
        className={cn(
          "group cursor-pointer relative overflow-hidden",
          "bg-gradient-to-br from-orange/10 to-warning/5 border-orange/30",
          "hover:border-orange/50 hover:shadow-glow-warning transition-all duration-normal",
          className
        )}
        style={style}
        onClick={() => navigate("/app/loans")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange/20 border border-orange/40">
                <CreditCard className="h-5 w-5 text-orange" />
              </div>
              <div>
                <CardTitle className="text-base">Active Loan</CardTitle>
                <p className="text-sm text-muted-foreground">#{activeLoan.loan_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", getStatusColor(activeLoan.status, daysTillDue))}>
                {activeLoan.status === 'in_arrears' ? 'OVERDUE' : 
                 daysTillDue < 0 ? 'OVERDUE' :
                 daysTillDue <= 1 ? 'DUE SOON' : 'ACTIVE'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="font-bold">{activeLoan.outstanding_bsk.toFixed(2)} BSK</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{progressPercent}% repaid</span>
              <span>₹{activeLoan.amount_inr.toLocaleString()}</span>
            </div>
          </div>
          
          {nextEmi && (
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Next EMI</p>
                  <p className="font-bold text-sm">{nextEmi.amount_bsk.toFixed(2)} BSK</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Due in</p>
                  <p className={cn("font-bold text-sm", getStatusColor(activeLoan.status, daysTillDue))}>
                    {daysTillDue < 0 ? `${Math.abs(daysTillDue)}d overdue` : 
                     daysTillDue === 0 ? 'Today' : 
                     `${daysTillDue}d`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-orange/30", className)} style={style}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-orange" />
          Active BSK Loan
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Loan #{activeLoan.loan_number} • {activeLoan.tenor_weeks} weeks
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Principal</p>
            <p className="font-bold">₹{activeLoan.amount_inr.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{activeLoan.principal_bsk.toFixed(2)} BSK</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="font-bold text-orange">{activeLoan.outstanding_bsk.toFixed(2)} BSK</p>
            <p className="text-xs text-success">0% Interest</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Repayment Progress</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {nextEmi && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-orange/10 border border-orange/20">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Next EMI Due</p>
                  <p className="text-lg font-bold">{nextEmi.amount_bsk.toFixed(2)} BSK</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className={cn("font-bold", getStatusColor(activeLoan.status, daysTillDue))}>
                    {daysTillDue < 0 ? `${Math.abs(daysTillDue)} days overdue` : 
                     daysTillDue === 0 ? 'Due Today' : 
                     `In ${daysTillDue} days`}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => navigate(`/app/loans/repay/${activeLoan.id}`)}
                className="bg-orange hover:bg-orange/80"
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Pay EMI
              </Button>
              <Button 
                onClick={() => navigate(`/app/loans/prepay/${activeLoan.id}`)}
                variant="outline"
                size="sm"
              >
                Pay Full
              </Button>
            </div>
          </div>
        )}

        <Button 
          onClick={() => navigate("/app/loans")}
          variant="ghost"
          size="sm"
          className="w-full mt-3"
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default BSKLoanCard;