import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { ComplianceGate } from '@/components/compliance/ComplianceGate';

interface BeneficiaryInfo {
  name: string;
  relationship: string;
  phone: string;
}

export default function AccidentInsurancePurchase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [planConfig, setPlanConfig] = useState<any>(null);
  const [bskBalance, setBskBalance] = useState(0);
  const [bskRate, setBskRate] = useState(1.0);
  const [beneficiary, setBeneficiary] = useState<BeneficiaryInfo>({
    name: '',
    relationship: '',
    phone: ''
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load accident plan config
      const { data: plan, error: planError } = await supabase
        .from('insurance_bsk_plan_configs')
        .select('*')
        .eq('plan_type', 'accident')
        .eq('is_enabled', true)
        .single();

      if (planError) throw planError;
      setPlanConfig(plan);

      // Load BSK rate
      const { data: rate } = await supabase
        .from('bsk_rates')
        .select('rate_inr_per_bsk')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setBskRate(rate?.rate_inr_per_bsk || 1.0);

      if (user) {
        // Load user's BSK balance
        const { data: balance } = await supabase
          .from('user_bsk_balances')
          .select('withdrawable_balance')
          .eq('user_id', user.id)
          .single();

        setBskBalance(balance?.withdrawable_balance || 0);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load insurance plan details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || !planConfig) return;

    // Validate beneficiary
    if (!beneficiary.name || !beneficiary.relationship || !beneficiary.phone) {
      toast({
        title: 'Incomplete Information',
        description: 'Please provide all beneficiary details',
        variant: 'destructive'
      });
      return;
    }

    const premiumBsk = planConfig.premium_inr / bskRate;

    if (bskBalance < premiumBsk) {
      toast({
        title: 'Insufficient Balance',
        description: `You need ${premiumBsk.toFixed(2)} BSK to purchase this plan`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setPurchasing(true);

      const { data, error } = await supabase.functions.invoke('insurance-purchase', {
        body: {
          plan_type: 'accident',
          beneficiaries: [beneficiary]
        }
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: `Accident insurance policy purchased. Policy #${data.policy.policy_number}`
      });

      navigate('/app/insurance');
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to purchase insurance',
        variant: 'destructive'
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!planConfig) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Plan Unavailable</h2>
            <p className="text-muted-foreground mb-4">
              Accident insurance is currently not available
            </p>
            <Button onClick={() => navigate('/app/insurance')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Insurance
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const premiumBsk = planConfig.premium_inr / bskRate;
  const coverageAmount = planConfig.plan_settings?.coverage_amount_inr || 0;
  const waitingPeriod = planConfig.plan_settings?.waiting_period_days || 7;

  return (
    <ComplianceGate requireAgeVerification requireTermsAcceptance>
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/insurance')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Plan Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/10 rounded-xl">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle>Accident Insurance</CardTitle>
                <CardDescription>Comprehensive accident coverage</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Premium</p>
                <p className="text-2xl font-bold">₹{planConfig.premium_inr.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{premiumBsk.toFixed(2)} BSK</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Coverage</p>
                <p className="text-2xl font-bold">₹{coverageAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Per claim</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Coverage Includes
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                <li>• 24/7 worldwide accident coverage</li>
                <li>• Hospitalization expenses</li>
                <li>• Medical treatment costs</li>
                <li>• Permanent/temporary disability benefits</li>
                <li>• Accidental death benefit to nominee</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm">
                <strong>Waiting Period:</strong> {waitingPeriod} days from purchase
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Beneficiary Form */}
        <Card>
          <CardHeader>
            <CardTitle>Beneficiary Information</CardTitle>
            <CardDescription>Who should receive benefits in case of accident</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="beneficiary-name">Full Name *</Label>
              <Input
                id="beneficiary-name"
                value={beneficiary.name}
                onChange={(e) => setBeneficiary({ ...beneficiary, name: e.target.value })}
                placeholder="Enter beneficiary name"
              />
            </div>

            <div>
              <Label htmlFor="beneficiary-relationship">Relationship *</Label>
              <Input
                id="beneficiary-relationship"
                value={beneficiary.relationship}
                onChange={(e) => setBeneficiary({ ...beneficiary, relationship: e.target.value })}
                placeholder="e.g., Spouse, Parent, Child"
              />
            </div>

            <div>
              <Label htmlFor="beneficiary-phone">Contact Number *</Label>
              <Input
                id="beneficiary-phone"
                type="tel"
                value={beneficiary.phone}
                onChange={(e) => setBeneficiary({ ...beneficiary, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Balance & Purchase */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Your BSK Balance</span>
              <Badge variant={bskBalance >= premiumBsk ? 'default' : 'destructive'}>
                {bskBalance.toFixed(2)} BSK
              </Badge>
            </div>

            <div className="flex justify-between items-center font-semibold">
              <span>Premium Required</span>
              <span>{premiumBsk.toFixed(2)} BSK</span>
            </div>

            <Separator />

            <Button
              onClick={handlePurchase}
              disabled={purchasing || bskBalance < premiumBsk}
              className="w-full h-12"
              size="lg"
            >
              {purchasing ? (
                'Processing...'
              ) : bskBalance < premiumBsk ? (
                'Insufficient BSK Balance'
              ) : (
                'Purchase Accident Insurance'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By purchasing, you agree to the terms and conditions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
    </ComplianceGate>
  );
}
