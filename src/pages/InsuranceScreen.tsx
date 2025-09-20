import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, DollarSign, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InsurancePlan {
  id: string;
  plan_name: string;
  premium_amount: number;
  coverage_ratio: number;
  max_coverage_per_claim: number;
  min_loss_threshold: number;
  notes: string;
}

interface InsurancePolicy {
  id: string;
  plan_id: string;
  premium_paid: number;
  subscribed_at: string;
  expires_at: string | null;
  status: string;
  plan: InsurancePlan;
}

interface InsuranceClaim {
  id: string;
  trade_id: string | null;
  loss_amount: number;
  reimbursed_amount: number;
  status: string;
  created_at: string;
  claim_reason: string;
}

interface Trade {
  id: string;
  symbol: string;
  total_value: number;
  created_at: string;
  // Mock PnL - in real system this would be calculated
  pnl: number;
}

const InsuranceScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [userPolicy, setUserPolicy] = useState<InsurancePolicy | null>(null);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [losingTrades, setLosingTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  useEffect(() => {
    loadInsuranceData();
    loadUserPolicy();
    loadClaims();
    loadLosingTrades();
  }, []);

  const loadInsuranceData = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_plans')
        .select('*')
        .eq('is_active', true)
        .order('premium_amount');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadUserPolicy = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('insurance_policies')
        .select(`
          *,
          plan:insurance_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      setUserPolicy(data);
    } catch (error) {
      console.error('Error loading policy:', error);
    }
  };

  const loadClaims = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error('Error loading claims:', error);
    }
  };

  const loadLosingTrades = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mock losing trades data - in real system, this would calculate PnL from actual trades
      const mockLosingTrades: Trade[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          total_value: 5000,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          pnl: -150
        },
        {
          id: '2',
          symbol: 'ETHUSDT',
          total_value: 2000,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          pnl: -75
        }
      ];

      setLosingTrades(mockLosingTrades.filter(trade => trade.pnl < 0));
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      // In real system, this would integrate with payment processing
      const { error } = await supabase
        .from('insurance_policies')
        .insert({
          user_id: user.id,
          plan_id: planId,
          premium_paid: plan.premium_amount,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Insurance Activated!",
        description: `You are now protected with ${plan.plan_name}`,
      });

      loadUserPolicy();
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: "Subscription Failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleFileClaim = async () => {
    if (!selectedTrade || !userPolicy) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const lossAmount = Math.abs(selectedTrade.pnl);
      const plan = userPolicy.plan as any;
      
      if (lossAmount < plan.min_loss_threshold) {
        toast({
          title: "Loss Too Small",
          description: `Minimum loss for claims is $${plan.min_loss_threshold}`,
          variant: "destructive",
        });
        return;
      }

      const reimbursedAmount = Math.min(
        lossAmount * plan.coverage_ratio,
        plan.max_coverage_per_claim
      );

      const { error } = await supabase
        .from('insurance_claims')
        .insert({
          user_id: user.id,
          plan_id: userPolicy.plan_id,
          trade_id: selectedTrade.id,
          loss_amount: lossAmount,
          reimbursed_amount: reimbursedAmount,
          status: 'pending',
          claim_reason: 'trading_loss'
        });

      if (error) throw error;

      toast({
        title: "Claim Filed Successfully",
        description: `Your claim for $${reimbursedAmount.toFixed(2)} is under review`,
      });

      setShowClaimModal(false);
      setSelectedTrade(null);
      loadClaims();
    } catch (error) {
      console.error('Error filing claim:', error);
      toast({
        title: "Claim Failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'denied':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4 animate-fade-in">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span>Trade Insurance</span>
          </h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-card rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4 animate-fade-in">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-primary/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <span>Trade Insurance</span>
        </h1>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm border border-border/50">
          <TabsTrigger value="plans" className="data-[state=active]:bg-primary/20">Plans</TabsTrigger>
          <TabsTrigger value="policy" className="data-[state=active]:bg-primary/20">My Policy</TabsTrigger>
          <TabsTrigger value="claims" className="data-[state=active]:bg-primary/20">Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="bg-card/60 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl text-foreground">{plan.plan_name}</CardTitle>
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    ${plan.premium_amount}/month
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Coverage Ratio</p>
                    <p className="font-semibold text-foreground">{(plan.coverage_ratio * 100)}% reimbursement</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Max Coverage</p>
                    <p className="font-semibold text-foreground">${plan.max_coverage_per_claim} per claim</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Min Loss Threshold</p>
                    <p className="font-semibold text-foreground">${plan.min_loss_threshold}</p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{plan.notes}</p>
                
                <Button 
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!userPolicy}
                  className="w-full bg-primary hover:bg-primary/80"
                >
                  {userPolicy ? 'Already Subscribed' : 'Subscribe & Protect'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="policy" className="space-y-4">
          {userPolicy ? (
            <Card className="bg-card/60 backdrop-blur-sm border border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Active Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-semibold">{(userPolicy.plan as any).plan_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Premium Paid</p>
                    <p className="font-semibold">${userPolicy.premium_paid}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Coverage</p>
                    <p className="font-semibold">{((userPolicy.plan as any).coverage_ratio * 100)}% up to ${(userPolicy.plan as any).max_coverage_per_claim}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      {userPolicy.status}
                    </Badge>
                  </div>
                </div>

                <Button 
                  onClick={() => setShowClaimModal(true)}
                  className="w-full bg-primary hover:bg-primary/80"
                  disabled={losingTrades.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {losingTrades.length === 0 ? 'No Eligible Trades' : 'File New Claim'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/60 backdrop-blur-sm border border-border/50">
              <CardContent className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Policy</h3>
                <p className="text-muted-foreground mb-4">Subscribe to a plan to protect your trades</p>
                <Button onClick={() => {
                  const plansTab = document.querySelector('[value="plans"]') as HTMLElement;
                  plansTab?.click();
                }}>
                  Browse Plans
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          {claims.length > 0 ? (
            claims.map((claim) => (
              <Card key={claim.id} className="bg-card/60 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(claim.status)}
                      <span className="font-semibold">Trading Loss Claim</span>
                    </div>
                    <Badge className={getStatusColor(claim.status)}>
                      {claim.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Loss Amount</p>
                      <p className="font-semibold text-red-400">${claim.loss_amount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reimbursement</p>
                      <p className="font-semibold text-green-400">${claim.reimbursed_amount}</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Filed on {new Date(claim.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card/60 backdrop-blur-sm border border-border/50">
              <CardContent className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Claims Filed</h3>
                <p className="text-muted-foreground">Your trading loss claims will appear here</p>
              </CardContent>
            </Card>
          )}

          {userPolicy && (
            <Button 
              onClick={() => setShowClaimModal(true)}
              disabled={losingTrades.length === 0}
              className="w-full bg-primary hover:bg-primary/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              File New Claim
            </Button>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>File Insurance Claim</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Select Losing Trade</label>
              <Select onValueChange={(value) => {
                const trade = losingTrades.find(t => t.id === value);
                setSelectedTrade(trade || null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a trade with losses" />
                </SelectTrigger>
                <SelectContent>
                  {losingTrades.map((trade) => (
                    <SelectItem key={trade.id} value={trade.id}>
                      {trade.symbol} - Loss: ${Math.abs(trade.pnl)} ({new Date(trade.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTrade && userPolicy && (
              <div className="bg-muted/20 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Loss Amount:</span>
                  <span className="font-semibold text-red-400">${Math.abs(selectedTrade.pnl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Coverage Ratio:</span>
                  <span className="font-semibold">{((userPolicy.plan as any).coverage_ratio * 100)}%</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-2">
                  <span className="font-medium">Eligible Reimbursement:</span>
                  <span className="font-bold text-primary">
                    ${Math.min(
                      Math.abs(selectedTrade.pnl) * (userPolicy.plan as any).coverage_ratio,
                      (userPolicy.plan as any).max_coverage_per_claim
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowClaimModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleFileClaim}
                disabled={!selectedTrade}
                className="flex-1 bg-primary hover:bg-primary/80"
              >
                Submit Claim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InsuranceScreen;