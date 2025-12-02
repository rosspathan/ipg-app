import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { LoanTimeline } from "@/components/loans/LoanTimeline";
import { 
  ChevronLeft, 
  Wallet, 
  Calendar, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function LoanDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const loanId = searchParams.get('id');

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan-detail', loanId],
    queryFn: async () => {
      if (!loanId) throw new Error('No loan ID provided');
      const { data, error } = await supabase
        .from('bsk_loans')
        .select('*')
        .eq('id', loanId)
        .eq('user_id', user?.id || '')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!loanId && !!user
  });

  const { data: installments } = useQuery({
    queryKey: ['loan-installments', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('bsk_loan_installments')
        .select('*')
        .eq('loan_id', loanId)
        .order('installment_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!loanId
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please log in to view loan details.</p>
          <Button onClick={() => navigate('/auth/login')}>Log In</Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading loan details...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Loan Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested loan could not be found.</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { className: 'bg-green-500 text-white', icon: CheckCircle },
      pending: { className: 'bg-yellow-500 text-white', icon: Calendar },
      approved: { className: 'bg-blue-500 text-white', icon: CheckCircle },
      closed: { className: 'bg-gray-500 text-white', icon: CheckCircle },
      cancelled: { className: 'bg-red-500 text-white', icon: AlertCircle },
      in_arrears: { className: 'bg-orange-500 text-white', icon: AlertCircle },
      written_off: { className: 'bg-red-700 text-white', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={cn('flex items-center gap-1', config.className)}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const paidInstallments = installments?.filter(i => i.status === 'paid').length || 0;
  const totalInstallments = installments?.length || 0;
  const progress = loan.principal_bsk > 0 ? (loan.paid_bsk / loan.principal_bsk) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary" />
              Loan Details
            </h1>
            <p className="text-muted-foreground">
              Loan #{loan.loan_number}
            </p>
          </div>
          {getStatusBadge(loan.status)}
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Principal Amount</p>
                <p className="text-2xl font-bold">{loan.principal_bsk} BSK</p>
                <p className="text-xs text-muted-foreground">₹{loan.amount_inr.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">{loan.paid_bsk.toFixed(2)} BSK</p>
                <p className="text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">{loan.outstanding_bsk.toFixed(2)} BSK</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{loan.tenor_weeks}</p>
                <p className="text-xs text-muted-foreground">weeks</p>
              </div>
            </div>

            {/* Progress Bar */}
            {loan.status === 'active' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Repayment Progress</span>
                  <span className="font-medium">{paidInstallments} of {totalInstallments} payments</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            )}

            <Separator />

            {/* Fee Breakdown */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Loan Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Principal Amount</span>
                  <span className="font-bold">{loan.principal_bsk} BSK</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Processing Fee (3%)</span>
                  <span className="font-bold">-{loan.origination_fee_bsk.toFixed(2)} BSK</span>
                </div>
                <Separator />
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span className="font-medium">Net Disbursed</span>
                  <span className="font-bold">{(loan.principal_bsk - loan.origination_fee_bsk).toFixed(2)} BSK</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Weekly EMI</span>
                  <span className="font-bold">{(loan.total_due_bsk / loan.tenor_weeks).toFixed(2)} BSK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Repayment ({loan.tenor_weeks} weeks)</span>
                  <span className="font-bold">{loan.total_due_bsk.toFixed(2)} BSK</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Loan Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applied</span>
                <span className="font-medium">{format(new Date(loan.applied_at), 'PPP')}</span>
              </div>
              {loan.approved_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="font-medium">{format(new Date(loan.approved_at), 'PPP')}</span>
                </div>
              )}
              {loan.disbursed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disbursed</span>
                  <span className="font-medium">{format(new Date(loan.disbursed_at), 'PPP')}</span>
                </div>
              )}
              {loan.next_due_date && loan.status === 'active' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Due</span>
                  <span className="font-medium text-orange-600">{format(new Date(loan.next_due_date), 'PPP')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interest Rate</span>
                <span className="font-medium">{(loan.interest_rate_weekly * 100).toFixed(2)}%/week</span>
              </div>
            </div>

            {/* Cancellation Notice */}
            {loan.status === 'cancelled' && loan.admin_notes && (
              <>
                <Separator />
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-100 mb-1">Loan Cancelled</p>
                      <p className="text-sm text-red-700 dark:text-red-300">{loan.admin_notes}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Schedule */}
        {installments && installments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Payment Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {installments.map((inst) => {
                  const isPaid = inst.status === 'paid';
                  const isOverdue = inst.status === 'overdue';
                  const isDue = inst.status === 'due';

                  return (
                    <div
                      key={inst.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-colors",
                        isPaid && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                        isOverdue && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                        isDue && "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
                        !isPaid && !isOverdue && !isDue && "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center font-bold",
                          isPaid && "bg-green-100 dark:bg-green-900/30 text-green-600",
                          isOverdue && "bg-red-100 dark:bg-red-900/30 text-red-600",
                          isDue && "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
                          !isPaid && !isOverdue && !isDue && "bg-muted text-muted-foreground"
                        )}>
                          #{inst.installment_number}
                        </div>
                        <div>
                          <p className="font-semibold">{inst.total_due_bsk.toFixed(2)} BSK</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Due: {format(new Date(inst.due_date), 'MMM dd, yyyy')}</span>
                          </div>
                          {inst.paid_at && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Paid on {format(new Date(inst.paid_at), 'MMM dd, yyyy')}
                            </p>
                          )}
                          {inst.late_fee_bsk > 0 && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Late fee: +{inst.late_fee_bsk.toFixed(2)} BSK
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={
                        isPaid ? 'default' :
                        isOverdue ? 'destructive' :
                        isDue ? 'outline' :
                        'secondary'
                      }>
                        {inst.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {loanId && <LoanTimeline loanId={loanId} />}
      </div>
    </div>
  );
}
