import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, AlertCircle, CheckCircle, ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { ComplianceGate } from '@/components/compliance/ComplianceGate';

interface BeneficiaryInfo {
  name: string;
  relationship: string;
  phone: string;
}

export default function LifeInsurancePurchase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [planConfig, setPlanConfig] = useState<any>(null);
  const [bskBalance, setBskBalance] = useState(0);
  const [bskRate, setBskRate] = useState(1.0);
  const [userAge, setUserAge] = useState<number>(0);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termYears, setTermYears] = useState(5);
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

      // Load life plan config
      const { data: plan, error: planError } = await supabase
        .from('insurance_bsk_plan_configs')
        .select('*')
        .eq('plan_type', 'life')
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

    // Validate age
    if (!ageConfirmed || userAge === 0) {
      toast({
        title: 'Age Confirmation Required',
        description: 'Please confirm your age to purchase life insurance',
        variant: 'destructive'
      });
      return;
    }

    const minAge = planConfig.plan_settings?.min_age || 18;
    const maxAge = planConfig.plan_settings?.max_age || 65;

    if (userAge < minAge || userAge > maxAge) {
      toast({
        title: 'Age Restriction',
        description: `Life insurance is available for ages ${minAge}-${maxAge} only. Your age: ${userAge}`,
        variant: 'destructive'
      });
      return;
    }

    // Validate beneficiary
    if (!beneficiary.name || !beneficiary.relationship || !beneficiary.phone) {
      toast({
        title: 'Incomplete Information',
        description: 'Please provide all beneficiary details',
        variant: 'destructive'
      });
      return;
    }

    // Validate term years
    const minTerm = planConfig.plan_settings?.min_term_years || 5;
    const maxTerm = planConfig.plan_settings?.max_term_years || 20;
    if (termYears < minTerm || termYears > maxTerm) {
      toast({
        title: 'Invalid Term',
        description: `Term must be between ${minTerm}-${maxTerm} years`,
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
          plan_type: 'life',
          beneficiaries: [beneficiary],
          term_years: termYears
        }
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: `Life insurance policy purchased. Policy #${data.policy.policy_number}`
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
              Life insurance is currently not available
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
  const maturityBenefitInr = planConfig.plan_settings?.maturity_benefit_inr || 500000;
  const minAge = planConfig.plan_settings?.min_age || 18;
  const maxAge = planConfig.plan_settings?.max_age || 65;
  const minTerm = planConfig.plan_settings?.min_term_years || 5;
  const maxTerm = planConfig.plan_settings?.max_term_years || 20;
  const isAgeEligible = ageConfirmed && userAge >= minAge && userAge <= maxAge;

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

        {/* Age Confirmation - No KYC needed */}
        {!ageConfirmed && (
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardContent className="p-4 flex gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm flex-1">
                <p className="font-semibold mb-1">Age Eligibility Required</p>
                <p className="text-muted-foreground mb-3">
                  Life insurance is available for ages {planConfig?.plan_settings?.min_age || 18}-{planConfig?.plan_settings?.max_age || 65}. 
                  Please confirm your current age.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={18}
                    max={100}
                    value={userAge || ''}
                    onChange={(e) => setUserAge(Number(e.target.value))}
                    placeholder="Enter your age"
                    className="w-32"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => {
                      if (userAge > 0) setAgeConfirmed(true);
                    }}
                    disabled={!userAge || userAge === 0}
                  >
                    Confirm Age
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {ageConfirmed && !isAgeEligible && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Age Restriction</p>
                <p className="text-muted-foreground">
                  Life insurance is available for ages {minAge}-{maxAge} only. Your current age is {userAge}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-success/10 rounded-xl">
                <Heart className="h-6 w-6 text-success" />
              </div>
              <div>
                <CardTitle>Life Insurance</CardTitle>
                <CardDescription>Term life insurance with maturity benefit</CardDescription>
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
                <p className="text-sm text-muted-foreground mb-1">Maturity Benefit</p>
                <p className="text-2xl font-bold">₹{maturityBenefitInr.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">At maturity</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Coverage Details
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                <li>• Life coverage for the entire term</li>
                <li>• Death benefit to nominee</li>
                <li>• Maturity benefit of ₹{maturityBenefitInr.toLocaleString()} on survival</li>
                <li>• Age eligibility: {minAge}-{maxAge} years</li>
                <li>• Term options: {minTerm}-{maxTerm} years</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-2">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-muted-foreground">
                  One-time premium payment. Your beneficiary receives the death benefit if you pass away during 
                  the term, or you receive the maturity benefit if you survive the term.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Term Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Insurance Term</CardTitle>
            <CardDescription>Choose the coverage period</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="term-years">Term Period (Years) *</Label>
              <Select
                value={termYears.toString()}
                onValueChange={(val) => setTermYears(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxTerm - minTerm + 1 }, (_, i) => minTerm + i).map(years => (
                    <SelectItem key={years} value={years.toString()}>
                      {years} Years
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Policy will mature on {new Date(new Date().setFullYear(new Date().getFullYear() + termYears)).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Beneficiary Form */}
        <Card>
          <CardHeader>
            <CardTitle>Nominee Information</CardTitle>
            <CardDescription>Who should receive benefits in case of death</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="beneficiary-name">Full Name *</Label>
              <Input
                id="beneficiary-name"
                value={beneficiary.name}
                onChange={(e) => setBeneficiary({ ...beneficiary, name: e.target.value })}
                placeholder="Enter nominee name"
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
            {ageConfirmed && userAge > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Your Age</span>
                <Badge variant={isAgeEligible ? 'default' : 'destructive'}>
                  {userAge} years {isAgeEligible ? '✓' : '✗'}
                </Badge>
              </div>
            )}

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
              disabled={purchasing || bskBalance < premiumBsk || !isAgeEligible || !ageConfirmed}
              className="w-full h-12"
              size="lg"
            >
              {purchasing ? (
                'Processing...'
              ) : !ageConfirmed ? (
                'Confirm Age First'
              ) : !isAgeEligible ? (
                'Age Not Eligible'
              ) : bskBalance < premiumBsk ? (
                'Insufficient BSK Balance'
              ) : (
                'Purchase Life Insurance'
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
