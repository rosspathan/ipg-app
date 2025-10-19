import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate";
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  DollarSign, 
  Info, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useProgramConfig } from "@/hooks/useProgramConfig";

export default function BSKLoansPage() {
  return (
    <ProgramAccessGate programKey="bsk_loans" title="BSK Loans">
      <BSKLoansContent />
    </ProgramAccessGate>
  );
}

function BSKLoansContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: programData } = useProgramConfig("bsk_loans");
  const config = programData?.config;
  
  const [loanAmount, setLoanAmount] = useState<number>(5000);
  const [isApplying, setIsApplying] = useState(false);

  // Fetch user's loans
  const { data: userLoans, isLoading: loansLoading, refetch } = useQuery({
    queryKey: ['user-loans', user?.id],
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
    enabled: !!user
  });

  // Fetch user's BSK balance
  const { data: bskBalance } = useQuery({
    queryKey: ['user-bsk-balance', user?.id],
    queryFn: async () => {
      if (!user) return { withdrawable_balance: 0, holding_balance: 0 };
      const { data, error } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, holding_balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data || { withdrawable_balance: 0, holding_balance: 0 };
    },
    enabled: !!user
  });

  // Parse loan config
  const loanConfig = useMemo(() => {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
    const cfg = config as Record<string, any>;
    return {
      enabled: cfg.enabled || false,
      min_loan_inr: cfg.min_loan_inr || 1000,
      max_loan_inr: cfg.max_loan_inr || 50000,
      min_duration_weeks: cfg.min_duration_weeks || 4,
      max_duration_weeks: cfg.max_duration_weeks || 12,
      interest_rate: cfg.interest_rate || 5,
      processing_fee_percent: cfg.processing_fee_percent || 2,
      late_fee_percent: cfg.late_fee_percent || 10,
      collateral_ratio: cfg.collateral_ratio || 120
    };
  }, [config]);

  // Calculate loan details
  const loanDetails = useMemo(() => {
    if (!loanConfig) return null;

    const duration = loanConfig.max_duration_weeks;
    const principal = loanAmount;
    const processingFee = (principal * loanConfig.processing_fee_percent) / 100;
    const netAmount = principal - processingFee;
    const totalInterest = (principal * loanConfig.interest_rate * duration) / 100;
    const totalRepayment = principal + totalInterest;
    const weeklyPayment = totalRepayment / duration;
    const apr = ((totalInterest / principal) * (52 / duration)) * 100;
    
    return {
      principal,
      processingFee,
      netAmount,
      totalInterest,
      totalRepayment,
      weeklyPayment,
      duration,
      apr
    };
  }, [loanAmount, loanConfig]);

  const handleApplyLoan = async () => {
    if (!user || !loanDetails) return;

    setIsApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-bsk-loan', {
        body: {
          amount_inr: loanDetails.principal,
          tenor_weeks: loanDetails.duration
        }
      });

      if (error) throw error;

      toast({
        title: "Loan Application Submitted! 🎉",
        description: `Your loan of ${loanDetails.principal} INR is pending approval`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Application Failed",
        description: error.message || 'Failed to submit loan application',
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (!loanConfig || !loanConfig.enabled) {
    return (
      <ProgramPageTemplate title="BSK Loans" subtitle="Service unavailable">
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Loans Not Available</h3>
            <p className="text-muted-foreground">
              BSK loan service is currently disabled. Check back later.
            </p>
          </CardContent>
        </Card>
      </ProgramPageTemplate>
    );
  }

  const activeLoans = userLoans?.filter(l => l.status === 'active' || l.status === 'disbursed') || [];
  const hasActiveLoan = activeLoans.length > 0;

  return (
    <ProgramPageTemplate
      title="BSK Loans"
      subtitle="Get instant BSK loans based on your INR deposits"
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <Alert className="border-info bg-info/5">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-info">
            <p className="font-medium mb-2">How BSK Loans Work:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Apply for a loan based on your deposit history</li>
              <li>Processing fee of {loanConfig.processing_fee_percent}% deducted upfront</li>
              <li>Repay weekly over {loanConfig.max_duration_weeks} weeks</li>
              <li>Interest rate: {loanConfig.interest_rate}% per week</li>
              <li>Late payments incur {loanConfig.late_fee_percent}% penalty</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Loan Application Form */}
        {!hasActiveLoan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Apply for BSK Loan
              </CardTitle>
              <CardDescription>
                Choose your loan amount and see instant calculations
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Loan Amount (INR)</Label>
                  <div className="text-2xl font-bold">₹{loanAmount.toLocaleString()}</div>
                </div>

                <Slider
                  value={[loanAmount]}
                  onValueChange={([value]) => setLoanAmount(value)}
                  min={loanConfig.min_loan_inr}
                  max={loanConfig.max_loan_inr}
                  step={500}
                  className="w-full"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹{loanConfig.min_loan_inr.toLocaleString()}</span>
                  <span>₹{loanConfig.max_loan_inr.toLocaleString()}</span>
                </div>
              </div>

              <Separator />

              {/* Loan Calculations */}
              {loanDetails && (
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Loan Breakdown</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Principal Amount</span>
                      <span className="font-medium">₹{loanDetails.principal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-destructive">
                      <span>Processing Fee ({loanConfig.processing_fee_percent}%)</span>
                      <span className="font-medium">-₹{loanDetails.processingFee.toFixed(2)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Net Disbursed</span>
                      <span className="font-bold text-primary">₹{loanDetails.netAmount.toFixed(2)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{loanDetails.duration} weeks</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weekly Interest ({loanConfig.interest_rate}%)</span>
                      <span className="font-medium">₹{loanDetails.totalInterest.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Repayment</span>
                      <span className="font-medium">₹{loanDetails.totalRepayment.toFixed(2)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Weekly Payment</span>
                      <span className="font-bold">₹{loanDetails.weeklyPayment.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effective APR</span>
                      <span className={`font-medium ${loanDetails.apr > 100 ? 'text-destructive' : ''}`}>
                        {loanDetails.apr.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {loanDetails && loanDetails.apr > 100 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: This loan has a high APR of {loanDetails.apr.toFixed(1)}%. Consider carefully before proceeding.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                size="lg" 
                className="w-full"
                onClick={handleApplyLoan}
                disabled={isApplying || hasActiveLoan}
              >
                {isApplying ? "Submitting..." : "Apply for Loan"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Loans */}
        {activeLoans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Active Loans
              </CardTitle>
              <CardDescription>Manage your current loan repayments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeLoans.map((loan) => {
                const paidPercent = (loan.paid_bsk / loan.total_due_bsk) * 100;
                
                return (
                  <div key={loan.id} className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{loan.loan_number}</h4>
                          <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                            {loan.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Applied: {format(new Date(loan.applied_at), 'MMM dd, yyyy')}
                        </p>
                      </div>

                      {loan.days_past_due > 0 && (
                        <Badge variant="destructive">
                          {loan.days_past_due} days overdue
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Principal</p>
                        <p className="font-semibold">₹{loan.amount_inr.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Disbursed</p>
                        <p className="font-semibold text-primary">{loan.net_disbursed_bsk.toFixed(2)} BSK</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-semibold">{loan.paid_bsk.toFixed(2)} BSK</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                        <p className="font-semibold">{loan.outstanding_bsk.toFixed(2)} BSK</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Repayment Progress</span>
                        <span className="font-medium">{paidPercent.toFixed(1)}%</span>
                      </div>
                      <Progress value={paidPercent} className="h-2" />
                    </div>

                    {loan.next_due_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Next payment due:</span>
                        <span className="font-semibold">
                          {format(new Date(loan.next_due_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}

                    <Button className="w-full" variant="outline">
                      View Payment Schedule
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Loan History */}
        {userLoans && userLoans.length > activeLoans.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Loan History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userLoans
                  .filter(l => l.status !== 'active' && l.status !== 'disbursed')
                  .map((loan) => (
                    <div 
                      key={loan.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{loan.loan_number}</span>
                          <Badge variant="secondary">{loan.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(loan.applied_at), 'MMM dd, yyyy')}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">₹{loan.amount_inr.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {loan.net_disbursed_bsk.toFixed(2)} BSK
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProgramPageTemplate>
  );
}
