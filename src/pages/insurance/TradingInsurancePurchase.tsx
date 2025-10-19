import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingDown, AlertCircle, CheckCircle, ArrowLeft, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { ComplianceGate } from '@/components/compliance/ComplianceGate';

export default function TradingInsurancePurchase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [planConfig, setPlanConfig] = useState<any>(null);
  const [bskBalance, setBskBalance] = useState(0);
  const [bskRate, setBskRate] = useState(1.0);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load trading plan config
      const { data: plan, error: planError } = await supabase
        .from('insurance_bsk_plan_configs')
        .select('*')
        .eq('plan_type', 'trading')
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
          plan_type: 'trading'
        }
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: `Trading insurance policy purchased. Policy #${data.policy.policy_number}`
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
              Trading insurance is currently not available
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
  const compensationPercent = planConfig.plan_settings?.compensation_percent || 50;
  const maxPayoutInr = planConfig.plan_settings?.max_payout_per_period_inr || 50000;
  const coveragePeriodDays = planConfig.plan_settings?.coverage_period_days || 30;
  const minLossInr = planConfig.plan_settings?.min_loss_threshold_inr || 1000;

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
              <div className="p-3 bg-warning/10 rounded-xl">
                <TrendingDown className="h-6 w-6 text-warning" />
              </div>
              <div>
                <CardTitle>Trading Loss Insurance</CardTitle>
                <CardDescription>Protection against trading losses</CardDescription>
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
                <p className="text-sm text-muted-foreground mb-1">Coverage Period</p>
                <p className="text-2xl font-bold">{coveragePeriodDays}</p>
                <p className="text-xs text-muted-foreground">Days</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Coverage Details
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                <li>• <strong>{compensationPercent}%</strong> of realized trading losses</li>
                <li>• Maximum payout: <strong>₹{maxPayoutInr.toLocaleString()}</strong> per period</li>
                <li>• Minimum loss threshold: <strong>₹{minLossInr.toLocaleString()}</strong></li>
                <li>• Coverage period: <strong>{coveragePeriodDays} days</strong></li>
                <li>• Automatic claim processing for verified losses</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-2">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">How it works:</p>
                <p className="text-muted-foreground">
                  If you incur trading losses above ₹{minLossInr.toLocaleString()} during the coverage period, 
                  we'll reimburse {compensationPercent}% of your losses up to ₹{maxPayoutInr.toLocaleString()}.
                </p>
              </div>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm">
                <strong>Important:</strong> Only verified trading losses on the platform are covered. 
                Claims are processed after the coverage period ends.
              </p>
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
                'Purchase Trading Insurance'
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
