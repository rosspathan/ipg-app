import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, CreditCard, Calculator, Clock, AlertCircle, CheckCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useToast } from "@/hooks/use-toast";

interface LoanSettings {
  min_amount_inr: number;
  max_amount_inr: number;
  default_tenor_weeks: number;
  interest_type: string;
  default_interest_rate_weekly: number;
  origination_fee_percent: number;
  kyc_required: boolean;
  schedule_denomination: string;
  system_enabled: boolean;
}

interface Loan {
  id: string;
  loan_number: string;
  amount_inr: number;
  principal_bsk: number;
  outstanding_bsk: number;
  paid_bsk: number;
  status: string;
  next_due_date: string;
  tenor_weeks: number;
  applied_at: string;
  disbursed_at?: string;
  closed_at?: string;
  admin_notes?: string;
}

interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  total_due_bsk: number;
  paid_bsk: number;
  status: string;
  emi_bsk?: number;
  emi_inr?: number;
}

const BSKLoansScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loanSettings, setLoanSettings] = useState<LoanSettings | null>(null);
  const [userLoans, setUserLoans] = useState<Loan[]>([]);
  const [loanAmount, setLoanAmount] = useState(1000);
  const [bskRate, setBskRate] = useState(1.0);
  const [userBalance, setUserBalance] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [activeTab, setActiveTab] = useState("apply");

  useEffect(() => {
    if (user) {
      loadLoanData();
    }
  }, [user]);

  const loadLoanData = async () => {
    try {
      setLoading(true);

      // Load loan settings
      const { data: settings, error: settingsError } = await supabase
        .from('bsk_loan_settings')
        .select('*')
        .single();

      if (settingsError) {
        console.error('Settings error:', settingsError);
        return;
      }

      setLoanSettings(settings);
      setLoanAmount(Math.max(settings.min_amount_inr, Math.min(1000, settings.max_amount_inr)));

      // Load BSK rate
      const { data: rate } = await supabase
        .from('bsk_rates')
        .select('rate_inr_per_bsk')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setBskRate(rate?.rate_inr_per_bsk || 1.0);

      if (user) {
        // Load user's loans
        const { data: loans } = await supabase
          .from('bsk_loans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setUserLoans(loans || []);

        // Load user BSK balance
        const { data: balance } = await supabase
          .from('user_bsk_balance_summary')
          .select('withdrawable_balance')
          .eq('user_id', user.id)
          .single();

        setUserBalance(balance?.withdrawable_balance || 0);

        // Set default tab based on existing loans
        if (loans && loans.some(l => ['active', 'in_arrears'].includes(l.status))) {
          setActiveTab("active");
        }
      }
    } catch (error) {
      console.error('Error loading loan data:', error);
      toast({
        title: "Error",
        description: "Failed to load loan information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/20 text-success border-success/20';
      case 'pending': return 'bg-warning/20 text-warning border-warning/20';
      case 'in_arrears': return 'bg-destructive/20 text-destructive border-destructive/20';
      case 'closed': return 'bg-muted/20 text-muted-foreground border-muted/20';
      case 'approved': return 'bg-primary/20 text-primary border-primary/20';
      case 'cancelled': return 'bg-red-500/20 text-red-600 border-red-500/20';
      case 'written_off': return 'bg-red-500/20 text-red-600 border-red-500/20';
      default: return 'bg-muted/20 text-muted-foreground border-muted/20';
    }
  };

  const handleApplyLoan = async () => {
    if (!user || !loanSettings) return;

    try {
      setAccepting(true);
      console.log(`Applying for BSK loan: ₹${loanAmount}`);

      const { data, error } = await supabase.functions.invoke('bsk-loan-apply', {
        body: { amount_inr: loanAmount, region: 'IN' }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        if (data.kyc_required) {
          toast({
            title: "KYC Required",
            description: data.error,
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error);
      }

      toast({
        title: "Application Submitted!",
        description: `Loan application for ₹${loanAmount} (${data.loan.principal_bsk} BSK) submitted successfully`,
      });

      // Refresh data and switch tabs
      loadLoanData();
      setActiveTab("active");

    } catch (error: any) {
      toast({
        title: "Application Failed", 
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  const calculatePreview = () => {
    if (!loanSettings) return null;

    const principalBsk = loanAmount / bskRate;
    const originationFeeBsk = (principalBsk * loanSettings.origination_fee_percent) / 100;
    const netDisbursedBsk = principalBsk - originationFeeBsk;
    
    // 0% interest by default
    const totalDueBsk = principalBsk;
    const weeklyEmi = totalDueBsk / loanSettings.default_tenor_weeks;

    return {
      principalBsk: principalBsk.toFixed(4),
      originationFeeBsk: originationFeeBsk.toFixed(4),
      netDisbursedBsk: netDisbursedBsk.toFixed(4),
      totalDueBsk: totalDueBsk.toFixed(4),
      weeklyEmiBsk: weeklyEmi.toFixed(4),
      weeklyEmiInr: (weeklyEmi * bskRate).toFixed(2)
    };
  };

  const preview = calculatePreview();

  if (loading || !loanSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!loanSettings.system_enabled) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">BSK Loans</h1>
        </div>
        
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Loans Currently Unavailable</h3>
            <p className="text-muted-foreground">BSK loan services are temporarily disabled</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          BSK Loans
        </h1>
      </div>

      {/* BSK Rate Display */}
      <Card className="mb-6 border-primary/20">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Current BSK Rate</p>
              <p className="text-xl font-bold">₹{bskRate.toFixed(2)} / BSK</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Your BSK Balance</p>
              <p className="text-lg font-semibold">{userBalance.toFixed(2)} BSK</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="apply">Apply Loan</TabsTrigger>
          <TabsTrigger value="active">
            Active Loans ({userLoans.filter(l => ['active', 'pending', 'in_arrears', 'approved'].includes(l.status)).length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({userLoans.filter(l => ['closed', 'written_off'].includes(l.status)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apply" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Apply for BSK Loan</CardTitle>
              <p className="text-sm text-muted-foreground">
                Borrow ₹{loanSettings.min_amount_inr.toLocaleString()} - ₹{loanSettings.max_amount_inr.toLocaleString()} • 
                16 weeks • 0% interest • No fees
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Selector */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="loan-amount">Loan Amount (INR)</Label>
                  <Input
                    id="loan-amount"
                    type="number"
                    min={loanSettings.min_amount_inr}
                    max={loanSettings.max_amount_inr}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-32 text-right"
                  />
                </div>
                
                <Slider
                  value={[loanAmount]}
                  onValueChange={([value]) => setLoanAmount(value)}
                  min={loanSettings.min_amount_inr}
                  max={loanSettings.max_amount_inr}
                  step={100}
                  className="w-full"
                />
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>₹{loanSettings.min_amount_inr.toLocaleString()}</span>
                  <span>₹{loanSettings.max_amount_inr.toLocaleString()}</span>
                </div>
              </div>

              {/* Loan Preview */}
              {preview && (
                <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Loan Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Principal Amount</p>
                        <p className="font-bold">₹{loanAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{preview.principalBsk} BSK</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">You'll Receive</p>
                        <p className="font-bold text-success">{preview.netDisbursedBsk} BSK</p>
                        <p className="text-xs text-muted-foreground">To Withdrawable Balance</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Weekly EMI</p>
                        <p className="font-bold">{preview.weeklyEmiBsk} BSK</p>
                        <p className="text-xs text-muted-foreground">≈ ₹{preview.weeklyEmiInr}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Repayment</p>
                        <p className="font-bold">{preview.totalDueBsk} BSK</p>
                        <p className="text-xs text-success">0% Interest</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-primary/10">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Fixed BSK schedule - EMI amounts won't change</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>16 weekly payments starting 1 week after approval</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Terms and Apply */}
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">BSK Loan Terms</p>
                      <ul className="text-muted-foreground mt-1 space-y-1">
                        <li>• Loan settled in BSK using admin-set rates</li>
                        <li>• BSK is an in-app token valued by administrators</li>
                        <li>• KYC verification required before disbursal</li>
                        <li>• One active loan per user maximum</li>
                        <li>• Manual admin approval required</li>
                        <li>• 3-day grace period for late payments</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleApplyLoan}
                  disabled={accepting || !user || loanAmount < loanSettings.min_amount_inr}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  {accepting ? "Submitting..." : `Apply for ₹${loanAmount.toLocaleString()} Loan`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {userLoans.filter(l => ['pending', 'active', 'in_arrears', 'approved'].includes(l.status)).map((loan) => (
            <LoanCard key={loan.id} loan={loan} onUpdate={loadLoanData} getStatusColor={getStatusColor} />
          ))}
          
          {userLoans.filter(l => ['pending', 'active', 'in_arrears', 'approved'].includes(l.status)).length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Loans</h3>
                <p className="text-muted-foreground mb-4">Apply for a BSK loan to get started</p>
                <Button onClick={() => setActiveTab("apply")}>
                  Apply for Loan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {userLoans.filter(l => ['closed', 'written_off', 'cancelled'].includes(l.status)).map((loan) => (
            <LoanCard key={loan.id} loan={loan} onUpdate={loadLoanData} getStatusColor={getStatusColor} showHistory />
          ))}
          
          {userLoans.filter(l => ['closed', 'written_off', 'cancelled'].includes(l.status)).length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Loan History</h3>
                <p className="text-muted-foreground">Completed loans will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Loan Card Component
const LoanCard = ({ 
  loan, 
  onUpdate, 
  showHistory = false, 
  getStatusColor 
}: { 
  loan: Loan; 
  onUpdate: () => void; 
  showHistory?: boolean;
  getStatusColor: (status: string) => string;
}) => {
  const navigate = useNavigate();
  const [installments, setInstallments] = useState<Installment[]>([]);

  useEffect(() => {
    loadInstallments();
  }, [loan.id]);

  const loadInstallments = async () => {
    const { data } = await supabase
      .from('bsk_loan_installments')
      .select('*')
      .eq('loan_id', loan.id)
      .order('installment_number');
    
    setInstallments(data || []);
  };

  const getProgressPercent = () => {
    return Math.round((loan.paid_bsk / loan.principal_bsk) * 100);
  };

  const nextDueInstallment = installments.find(i => i.status === 'due');
  const paidInstallments = installments.filter(i => i.status === 'paid').length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Loan #{loan.loan_number}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {loan.tenor_weeks} weeks • Applied {new Date(loan.applied_at).toLocaleDateString()}
            </p>
          </div>
          <Badge className={getStatusColor(loan.status)}>
            {loan.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Principal</p>
            <p className="font-bold">₹{loan.amount_inr.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{loan.principal_bsk.toFixed(2)} BSK</p>
          </div>
          <div>
            <p className="text-muted-foreground">Paid</p>
            <p className="font-bold text-success">{loan.paid_bsk.toFixed(2)} BSK</p>
            <p className="text-xs text-muted-foreground">{getProgressPercent()}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Outstanding</p>
            <p className="font-bold text-orange">{loan.outstanding_bsk.toFixed(2)} BSK</p>
          </div>
        </div>

        {/* Progress Bar */}
        {loan.status !== 'pending' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Repayment Progress</span>
              <span className="font-medium">{paidInstallments} of {loan.tenor_weeks} EMIs</span>
            </div>
            <Progress value={getProgressPercent()} className="h-2" />
          </div>
        )}

        {nextDueInstallment && !showHistory && loan.status === 'active' && (
          <div className="p-3 bg-orange/10 rounded-lg border border-orange/20">
            <div className="flex justify-between items-center mb-2">
              <p className="font-medium">Next EMI Due</p>
              <p className="text-sm text-muted-foreground">
                {new Date(nextDueInstallment.due_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xl font-bold">{nextDueInstallment.total_due_bsk.toFixed(2)} BSK</p>
              <p className="text-sm">EMI #{nextDueInstallment.installment_number} of {loan.tenor_weeks}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => navigate(`/app/loans/pay?installment=${nextDueInstallment.id}`)}
                className="bg-orange hover:bg-orange/80"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Pay EMI
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/app/loans/prepay?loan=${loan.id}`)}
              >
                Pay Full
              </Button>
            </div>
          </div>
        )}

        {loan.status === 'pending' && (
          <div className="p-3 bg-warning/10 rounded-lg border border-warning/20 text-center">
            <Clock className="h-5 w-5 text-warning mx-auto mb-2" />
            <p className="font-medium text-warning">Pending Admin Approval</p>
            <p className="text-xs text-muted-foreground">
              Your application is being reviewed. You'll be notified once approved.
            </p>
          </div>
        )}

        {loan.status === 'cancelled' && loan.admin_notes && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100 mb-1">Loan Cancelled</p>
                <p className="text-sm text-red-700 dark:text-red-300">{loan.admin_notes}</p>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="ghost" 
          onClick={() => navigate(`/app/loans/details?id=${loan.id}`)}
          className="w-full"
        >
          View Details & Schedule
        </Button>
      </CardContent>
    </Card>
  );
};

export default BSKLoansScreen;