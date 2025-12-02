import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar";
import { Wallet, Calendar, DollarSign, AlertCircle, CheckCircle, Clock, TrendingUp, Loader2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function LoansHistoryPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  const { data: loans, isLoading: loadingLoans } = useQuery({
    queryKey: ['bsk-loans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bsk_loans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: installments, isLoading: loadingInstallments } = useQuery({
    queryKey: ['loan-installments', user?.id],
    queryFn: async () => {
      if (!user || !loans) return [];
      const loanIds = loans.map(l => l.id);
      if (loanIds.length === 0) return [];

      const { data, error } = await supabase
        .from('bsk_loan_installments')
        .select('*')
        .in('loan_id', loanIds)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!loans && loans.length > 0,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, className: 'bg-green-500 text-white', icon: CheckCircle },
      completed: { variant: 'secondary' as const, className: 'bg-blue-500 text-white', icon: CheckCircle },
      pending: { variant: 'outline' as const, className: 'border-yellow-500 text-yellow-600', icon: Clock },
      defaulted: { variant: 'destructive' as const, className: '', icon: AlertCircle },
      due: { variant: 'outline' as const, className: 'border-orange-500 text-orange-600', icon: Clock },
      paid: { variant: 'default' as const, className: 'bg-green-500 text-white', icon: CheckCircle },
      overdue: { variant: 'destructive' as const, className: '', icon: AlertCircle },
      cancelled: { variant: 'destructive' as const, className: 'bg-red-500 text-white', icon: AlertCircle },
      closed: { variant: 'secondary' as const, className: 'bg-blue-500 text-white', icon: CheckCircle },
      written_off: { variant: 'destructive' as const, className: 'bg-red-500 text-white', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={cn('flex items-center gap-1', config.className)}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const calculateProgress = (paid: number, total: number) => {
    return (paid / total) * 100;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please log in to view your loan history.</p>
          <Button onClick={() => navigate('/auth/login')}>Log In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <BacklinkBar 
        programName="Savings History"
        parentRoute="/app/loans"
        parentLabel="Savings Plans"
      />
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        <Tabs defaultValue="loans" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="loans">
              <Wallet className="w-4 h-4 mr-2" />
              My Loans ({loans?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="installments">
              <Calendar className="w-4 h-4 mr-2" />
              Payment Schedule ({installments?.filter(i => i.status !== 'paid').length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Loans Tab */}
          <TabsContent value="loans" className="space-y-4">
            {loadingLoans ? (
              <Card className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading loans...</p>
              </Card>
            ) : loans && loans.length > 0 ? (
              loans.map((loan) => {
                const loanInstallments = installments?.filter(i => i.loan_id === loan.id) || [];
                const paidCount = loanInstallments.filter(i => i.status === 'paid').length;
                const totalCount = loanInstallments.length;
                const progress = calculateProgress(paidCount, totalCount);

                return (
                  <Card key={loan.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="space-y-4">
                      {/* Loan Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(loan.status)}
                          </div>
                          <h3 className="text-xl font-bold">
                            Loan #{loan.id.slice(0, 8)}...
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Applied on {format(new Date(loan.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Loan Amount</p>
                        <p className="text-3xl font-bold text-primary">{loan.principal_bsk} BSK</p>
                      </div>
                      </div>

                      {/* Loan Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Interest Rate</p>
                          <p className="text-lg font-bold text-blue-600">{(loan.interest_rate_weekly * 100).toFixed(2)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="text-lg font-bold">{loan.tenor_weeks} weeks</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Principal</p>
                          <p className="text-lg font-bold">{loan.principal_bsk} BSK</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Total Due</p>
                          <p className="text-lg font-bold">{loan.total_due_bsk} BSK</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {loan.status === 'active' && (
                        <div className="pt-4 border-t space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Repayment Progress</span>
                            <span className="font-semibold">{paidCount} / {totalCount} payments</span>
                          </div>
                          <Progress value={progress} className="h-3" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Paid: {loan.paid_bsk} BSK</span>
                            <span>Outstanding: {loan.outstanding_bsk} BSK</span>
                          </div>
                        </div>
                      )}

                      {/* Next Payment Info */}
                      {loan.status === 'active' && loan.next_due_date && (
                        <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            <div>
                              <p className="font-medium text-sm">Next Payment Due</p>
                              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                {format(new Date(loan.next_due_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="p-12 text-center">
                <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Loans Found</h3>
                <p className="text-muted-foreground mb-4">You haven't applied for any loans yet.</p>
                <Button onClick={() => navigate('/app/loans')}>
                  <Wallet className="w-4 h-4 mr-2" />
                  Apply for Loan
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Installments Tab */}
          <TabsContent value="installments" className="space-y-4">
            {loadingInstallments ? (
              <Card className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading payment schedule...</p>
              </Card>
            ) : installments && installments.length > 0 ? (
              <div className="grid gap-3">
                {installments.map((installment) => {
                  const isOverdue = installment.status === 'overdue';
                  const isPaid = installment.status === 'paid';

                  return (
                    <Card 
                      key={installment.id} 
                      className={cn(
                        "p-4 hover:shadow-md transition-shadow",
                        isOverdue && "border-red-500 bg-red-50/50 dark:bg-red-950/20",
                        isPaid && "bg-green-50/50 dark:bg-green-950/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg",
                            isPaid ? "bg-green-100 dark:bg-green-900/30 text-green-600" :
                            isOverdue ? "bg-red-100 dark:bg-red-900/30 text-red-600" :
                            "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                          )}>
                            #{installment.installment_number}
                          </div>
                          <div>
                            <p className="font-semibold">{installment.emi_bsk} BSK</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>Due: {format(new Date(installment.due_date), 'MMM dd, yyyy')}</span>
                            </div>
                            {installment.paid_at && (
                              <p className="text-xs text-green-600 dark:text-green-400">
                                Paid on {format(new Date(installment.paid_at), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(installment.status)}
                          {installment.late_fee_bsk > 0 && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              +{installment.late_fee_bsk} BSK late fee
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Payment Schedule</h3>
                <p className="text-muted-foreground">No loan payments to display.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
