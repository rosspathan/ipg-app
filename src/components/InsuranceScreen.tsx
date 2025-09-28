import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, TrendingDown, Heart, FileText, Plus, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

interface PlanConfig {
  id: string;
  plan_type: string;
  premium_inr: number;
  plan_settings: any;
  is_enabled: boolean;
}

interface Policy {
  id: string;
  plan_type: string;
  policy_number: string;
  premium_inr: number;
  premium_bsk: number;
  status: string;
  start_at: string;
  end_at?: string;
  maturity_at?: string;
  coverage_config: any;
}

interface Claim {
  id: string;
  claim_reference: string;
  claim_type: string;
  status: string;
  submitted_at: string;
  approved_amount_inr?: number;
  payout_bsk?: number;
}

const InsuranceScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
  const [userPolicies, setUserPolicies] = useState<Policy[]>([]);
  const [userClaims, setUserClaims] = useState<Claim[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [bskRate, setBskRate] = useState(1.0);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    loadInsuranceData();
  }, [user]);

  const loadInsuranceData = async () => {
    try {
      setLoading(true);

      // Load plan configurations
      const { data: plans, error: plansError } = await supabase
        .from('insurance_bsk_plan_configs')
        .select('*')
        .eq('is_enabled', true)
        .order('plan_type');

      if (plansError) throw plansError;
      setPlanConfigs(plans || []);

      // Load global settings
      const { data: settings, error: settingsError } = await supabase
        .from('insurance_bsk_global_settings')
        .select('*')
        .limit(1)
        .single();

      if (!settingsError && settings) {
        setGlobalSettings(settings);
      }

      // Load current BSK rate
      const { data: rate } = await supabase
        .from('bsk_rates')
        .select('rate_inr_per_bsk')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setBskRate(rate?.rate_inr_per_bsk || 1.0);

      if (user) {
        // Load user's policies
        const { data: policies, error: policiesError } = await supabase
          .from('insurance_bsk_policies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!policiesError) {
          setUserPolicies(policies || []);
        }

        // Load user's claims
        const { data: claims, error: claimsError } = await supabase
          .from('insurance_bsk_claims')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!claimsError) {
          setUserClaims(claims || []);
        }

        // Load user's BSK balance
        const { data: balance } = await supabase
          .from('user_bsk_balances')
          .select('withdrawable_balance')
          .eq('user_id', user.id)
          .single();

        setUserBalance(balance?.withdrawable_balance || 0);
      }

    } catch (error: any) {
      console.error('Error loading insurance data:', error);
      toast({
        title: "Error",
        description: "Failed to load insurance information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'accident': return Shield;
      case 'trading': return TrendingDown;
      case 'life': return Heart;
      default: return FileText;
    }
  };

  const getPlanTitle = (planType: string) => {
    switch (planType) {
      case 'accident': return 'Accident Plan';
      case 'trading': return 'Trading Loss Plan';
      case 'life': return 'Life Plan';
      default: return planType;
    }
  };

  const getPlanDescription = (planType: string, settings: any) => {
    switch (planType) {
      case 'accident':
        return `₹${(settings.coverage_amount_inr || 0).toLocaleString()} coverage per approved claim. Waiting period: ${settings.waiting_period_days || 7} days.`;
      case 'trading':
        return `${settings.compensation_percent || 50}% of realized trading losses up to ₹${(settings.max_payout_per_period_inr || 0).toLocaleString()} per ${settings.coverage_period_days || 30}-day period.`;
      case 'life':
        return `₹${(settings.maturity_benefit_inr || 0).toLocaleString()} maturity benefit. Term: ${settings.min_term_years}-${settings.max_term_years} years.`;
      default:
        return 'Coverage details available after selection.';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'matured': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'in_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePurchasePlan = (planType: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase insurance plans",
        variant: "destructive",
      });
      return;
    }
    navigate(`/app/insurance/purchase/${planType}`);
  };

  const handleCreateClaim = (policyId: string) => {
    navigate(`/app/insurance/claim/${policyId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!globalSettings?.system_enabled) {
    return (
      <div className="min-h-screen flex flex-col bg-background px-6 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Insurance</h1>
        </div>
        
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Insurance Not Available</h3>
            <p className="text-sm text-muted-foreground">
              Insurance services are currently not available in your region.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Insurance</h1>
      </div>

      {/* Disclaimer */}
      <Card className="bg-yellow-50 border-yellow-200 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-medium">Important Disclaimer</p>
              <p className="text-xs text-yellow-700 mt-1">
                {globalSettings?.disclaimer_text || 'This is a promotional, in-app coverage-like program, NOT regulated insurance.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="plans" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="policies">My Policies ({userPolicies.length})</TabsTrigger>
          <TabsTrigger value="claims">Claims ({userClaims.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {/* Balance Display */}
          {user && (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Your BSK Balance</p>
                    <p className="text-2xl font-bold">{userBalance.toFixed(2)} BSK</p>
                    <p className="text-xs text-muted-foreground">≈ ₹{(userBalance * bskRate).toFixed(0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Rate</p>
                    <p className="text-lg font-semibold">₹{bskRate.toFixed(2)}/BSK</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Cards */}
          {planConfigs.map((plan) => {
            const Icon = getPlanIcon(plan.plan_type);
            const bskPrice = plan.premium_inr / bskRate;
            
            return (
              <Card key={plan.id} className="bg-gradient-card shadow-card border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-8 h-8 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{getPlanTitle(plan.plan_type)}</CardTitle>
                        <p className="text-sm text-muted-foreground">Annual Coverage</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">₹{plan.premium_inr.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{bskPrice.toFixed(2)} BSK</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {getPlanDescription(plan.plan_type, plan.plan_settings)}
                  </p>
                  
                  <div className="bg-muted/20 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">Key Features:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {plan.plan_type === 'accident' && (
                        <>
                          <li>• Coverage: ₹{(plan.plan_settings.coverage_amount_inr || 0).toLocaleString()}</li>
                          <li>• Claims per year: {plan.plan_settings.claims_per_year || 1}</li>
                          <li>• Waiting period: {plan.plan_settings.waiting_period_days || 7} days</li>
                        </>
                      )}
                      {plan.plan_type === 'trading' && (
                        <>
                          <li>• Compensation: {plan.plan_settings.compensation_percent || 50}% of losses</li>
                          <li>• Max payout: ₹{(plan.plan_settings.max_payout_per_period_inr || 0).toLocaleString()}</li>
                          <li>• Coverage period: {plan.plan_settings.coverage_period_days || 30} days</li>
                        </>
                      )}
                      {plan.plan_type === 'life' && (
                        <>
                          <li>• Maturity benefit: ₹{(plan.plan_settings.maturity_benefit_inr || 0).toLocaleString()}</li>
                          <li>• Term: {plan.plan_settings.min_term_years}-{plan.plan_settings.max_term_years} years</li>
                          <li>• Age limit: {plan.plan_settings.min_age}-{plan.plan_settings.max_age} years</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <Button 
                    onClick={() => handlePurchasePlan(plan.plan_type)}
                    className="w-full"
                    disabled={!user || userBalance < bskPrice}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {!user ? 'Login to Purchase' : 
                     userBalance < bskPrice ? 'Insufficient BSK Balance' : 
                     'Purchase Plan'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {userPolicies.length > 0 ? (
            userPolicies.map((policy) => {
              const Icon = getPlanIcon(policy.plan_type);
              return (
                <Card key={policy.id} className="bg-gradient-card shadow-card border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-6 h-6 text-primary" />
                        <div>
                          <CardTitle className="text-base">{getPlanTitle(policy.plan_type)}</CardTitle>
                          <p className="text-sm text-muted-foreground">#{policy.policy_number}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(policy.status)}>
                        {policy.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Premium Paid</p>
                        <p className="font-medium">₹{policy.premium_inr.toLocaleString()} ({policy.premium_bsk.toFixed(2)} BSK)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-medium">{new Date(policy.start_at).toLocaleDateString()}</p>
                      </div>
                      {policy.end_at && (
                        <div>
                          <p className="text-muted-foreground">End Date</p>
                          <p className="font-medium">{new Date(policy.end_at).toLocaleDateString()}</p>
                        </div>
                      )}
                      {policy.maturity_at && (
                        <div>
                          <p className="text-muted-foreground">Maturity Date</p>
                          <p className="font-medium">{new Date(policy.maturity_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    
                    {policy.status === 'active' && (
                      <Button 
                        onClick={() => handleCreateClaim(policy.id)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        File Claim
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Policies Yet</h3>
                <p className="text-sm text-muted-foreground">
                  {user ? 'Purchase your first insurance plan to get started!' : 'Please log in to view your policies'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          {userClaims.length > 0 ? (
            userClaims.map((claim) => (
              <Card key={claim.id} className="bg-gradient-card shadow-card border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">#{claim.claim_reference}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {claim.claim_type.replace('_', ' ')}
                      </p>
                    </div>
                    <Badge className={getStatusColor(claim.status)}>
                      {claim.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p className="font-medium">{new Date(claim.submitted_at).toLocaleDateString()}</p>
                    </div>
                    {claim.approved_amount_inr && (
                      <div>
                        <p className="text-muted-foreground">Approved Amount</p>
                        <p className="font-medium text-green-600">
                          ₹{claim.approved_amount_inr.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {claim.payout_bsk && (
                      <div>
                        <p className="text-muted-foreground">BSK Payout</p>
                        <p className="font-medium text-green-600">
                          {claim.payout_bsk.toFixed(2)} BSK
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Claims Yet</h3>
                <p className="text-sm text-muted-foreground">
                  {user ? 'Your insurance claims will appear here once filed.' : 'Please log in to view your claims'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InsuranceScreen;