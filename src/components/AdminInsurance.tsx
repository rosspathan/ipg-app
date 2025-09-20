import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Shield, DollarSign, Clock, FileText, Plus, Edit, Trash2, Check, X, Crown, Star, Zap, Users, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InsurancePlan {
  id: string;
  plan_name: string;
  premium_amount: number;
  coverage_ratio: number;
  max_coverage_per_claim: number;
  min_loss_threshold: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface InsuranceSubscriptionTier {
  id: string;
  tier_name: string;
  monthly_fee: number;
  coverage_ratio: number;
  max_claim_per_trade: number;
  max_claims_per_month?: number;
  min_loss_threshold: number;
  bonus_rewards: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserInsuranceSubscription {
  id: string;
  user_id: string;
  tier_id: string;
  subscribed_at: string;
  expires_at: string;
  is_active: boolean;
  claims_used_this_month: number;
  last_claim_reset_date: string;
  tier: InsuranceSubscriptionTier;
}

interface InsuranceClaim {
  id: string;
  user_id: string;
  plan_id?: string;
  tier_id?: string;
  trade_id?: string;
  loss_amount: number;
  reimbursed_amount?: number;
  status: string;
  claim_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

interface InsurancePolicy {
  id: string;
  user_id: string;
  plan_id: string;
  premium_paid: number;
  status: string;
  subscribed_at: string;
  expires_at?: string;
}

const AdminInsurance = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [subscriptionTiers, setSubscriptionTiers] = useState<InsuranceSubscriptionTier[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserInsuranceSubscription[]>([]);
  const { toast } = useToast();

  // Plan form state
  const [planForm, setPlanForm] = useState({
    id: '',
    plan_name: '',
    premium_amount: 0,
    coverage_ratio: 0.5,
    max_coverage_per_claim: 1000,
    min_loss_threshold: 10,
    is_active: true,
    notes: ''
  });
  const [editingPlan, setEditingPlan] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  // Subscription tier form state
  const [tierForm, setTierForm] = useState({
    id: '',
    tier_name: '',
    monthly_fee: 0,
    coverage_ratio: 0.5,
    max_claim_per_trade: 500,
    max_claims_per_month: null as number | null,
    min_loss_threshold: 10,
    bonus_rewards: 0,
    is_active: true
  });
  const [editingTier, setEditingTier] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('insurance_plans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading plans:', error);
      toast({
        title: "Error",
        description: "Failed to load insurance plans",
        variant: "destructive",
      });
    } else {
      setPlans(data || []);
    }
  };

  const loadSubscriptionTiers = async () => {
    const { data, error } = await supabase
      .from('insurance_subscription_tiers')
      .select('*')
      .order('monthly_fee', { ascending: true });
    
    if (error) {
      console.error('Error loading subscription tiers:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription tiers",
        variant: "destructive",
      });
    } else {
      setSubscriptionTiers(data || []);
    }
  };

  const loadUserSubscriptions = async () => {
    const { data, error } = await supabase
      .from('user_insurance_subscriptions')
      .select(`
        *,
        tier:insurance_subscription_tiers(*)
      `)
      .eq('is_active', true)
      .order('subscribed_at', { ascending: false });
    
    if (error) {
      console.error('Error loading user subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load user subscriptions",
        variant: "destructive",
      });
    } else {
      setUserSubscriptions(data || []);
    }
  };

  const loadClaims = async () => {
    const { data, error } = await supabase
      .from('insurance_claims')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading claims:', error);
    } else {
      setClaims(data || []);
    }
  };

  const loadPolicies = async () => {
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .order('subscribed_at', { ascending: false });
    
    if (error) {
      console.error('Error loading policies:', error);
    } else {
      setPolicies(data || []);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadPlans(), loadClaims(), loadPolicies(), loadSubscriptionTiers(), loadUserSubscriptions()]);
      setLoading(false);
    };

    loadData();
  }, []);

  const resetPlanForm = () => {
    setPlanForm({
      id: '',
      plan_name: '',
      premium_amount: 0,
      coverage_ratio: 0.5,
      max_coverage_per_claim: 1000,
      min_loss_threshold: 10,
      is_active: true,
      notes: ''
    });
    setEditingPlan(false);
  };

  const resetTierForm = () => {
    setTierForm({
      id: '',
      tier_name: '',
      monthly_fee: 0,
      coverage_ratio: 0.5,
      max_claim_per_trade: 500,
      max_claims_per_month: null,
      min_loss_threshold: 10,
      bonus_rewards: 0,
      is_active: true
    });
    setEditingTier(false);
  };

  const handleSavePlan = async () => {
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('insurance_plans')
          .update({
            plan_name: planForm.plan_name,
            premium_amount: planForm.premium_amount,
            coverage_ratio: planForm.coverage_ratio,
            max_coverage_per_claim: planForm.max_coverage_per_claim,
            min_loss_threshold: planForm.min_loss_threshold,
            is_active: planForm.is_active,
            notes: planForm.notes
          })
          .eq('id', planForm.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('insurance_plans')
          .insert([{
            plan_name: planForm.plan_name,
            premium_amount: planForm.premium_amount,
            coverage_ratio: planForm.coverage_ratio,
            max_coverage_per_claim: planForm.max_coverage_per_claim,
            min_loss_threshold: planForm.min_loss_threshold,
            is_active: planForm.is_active,
            notes: planForm.notes
          }]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Insurance plan ${editingPlan ? 'updated' : 'created'} successfully`,
      });
      await loadPlans();
      resetPlanForm();
      setPlanDialogOpen(false);
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Error",
        description: "Failed to save insurance plan",
        variant: "destructive",
      });
    }
  };

  const handleSaveTier = async () => {
    try {
      if (editingTier) {
        const { error } = await supabase
          .from('insurance_subscription_tiers')
          .update({
            tier_name: tierForm.tier_name,
            monthly_fee: tierForm.monthly_fee,
            coverage_ratio: tierForm.coverage_ratio,
            max_claim_per_trade: tierForm.max_claim_per_trade,
            max_claims_per_month: tierForm.max_claims_per_month,
            min_loss_threshold: tierForm.min_loss_threshold,
            bonus_rewards: tierForm.bonus_rewards,
            is_active: tierForm.is_active
          })
          .eq('id', tierForm.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('insurance_subscription_tiers')
          .insert([{
            tier_name: tierForm.tier_name,
            monthly_fee: tierForm.monthly_fee,
            coverage_ratio: tierForm.coverage_ratio,
            max_claim_per_trade: tierForm.max_claim_per_trade,
            max_claims_per_month: tierForm.max_claims_per_month,
            min_loss_threshold: tierForm.min_loss_threshold,
            bonus_rewards: tierForm.bonus_rewards,
            is_active: tierForm.is_active
          }]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Subscription tier ${editingTier ? 'updated' : 'created'} successfully`,
      });
      await loadSubscriptionTiers();
      resetTierForm();
      setTierDialogOpen(false);
    } catch (error) {
      console.error('Error saving tier:', error);
      toast({
        title: "Error",
        description: "Failed to save subscription tier",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('insurance_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Insurance plan deleted successfully",
      });
      await loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete insurance plan",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTier = async (id: string) => {
    try {
      const { error } = await supabase
        .from('insurance_subscription_tiers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription tier deleted successfully",
      });
      await loadSubscriptionTiers();
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast({
        title: "Error",
        description: "Failed to delete subscription tier",
        variant: "destructive",
      });
    }
  };

  const handleClaimAction = async (claimId: string, status: string, reimbursedAmount?: number) => {
    try {
      const updateData: any = { status };
      if (reimbursedAmount !== undefined) {
        updateData.reimbursed_amount = reimbursedAmount;
      }

      const { error } = await supabase
        .from('insurance_claims')
        .update(updateData)
        .eq('id', claimId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Claim ${status} successfully`,
      });
      await loadClaims();
    } catch (error) {
      console.error('Error updating claim:', error);
      toast({
        title: "Error",
        description: "Failed to update claim",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'denied':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold flex items-center Space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <span>Insurance Management</span>
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tiers</p>
                <p className="text-2xl font-bold">{subscriptionTiers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{userSubscriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Claims</p>
                <p className="text-2xl font-bold">{claims.filter(c => c.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-sm text-muted-foreground">Total Payouts</p>
                <p className="text-2xl font-bold">${claims.reduce((sum, claim) => sum + (claim.reimbursed_amount || 0), 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tiers">Subscription Tiers</TabsTrigger>
          <TabsTrigger value="plans">Insurance Plans</TabsTrigger>
          <TabsTrigger value="claims">Claims Management</TabsTrigger>
          <TabsTrigger value="policies">Active Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Subscription Tiers</h3>
            <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  resetTierForm();
                  setTierDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTier ? 'Edit Subscription Tier' : 'Create New Subscription Tier'}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tier_name">Tier Name</Label>
                    <Input
                      id="tier_name"
                      value={tierForm.tier_name}
                      onChange={(e) => setTierForm({...tierForm, tier_name: e.target.value})}
                      placeholder="e.g., Basic, Premium, VIP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly_fee">Monthly Fee ($)</Label>
                    <Input
                      id="monthly_fee"
                      type="number"
                      step="0.01"
                      value={tierForm.monthly_fee}
                      onChange={(e) => setTierForm({...tierForm, monthly_fee: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="coverage_ratio">Coverage Ratio</Label>
                    <Input
                      id="coverage_ratio"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={tierForm.coverage_ratio}
                      onChange={(e) => setTierForm({...tierForm, coverage_ratio: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_claim_per_trade">Max Claim Per Trade ($)</Label>
                    <Input
                      id="max_claim_per_trade"
                      type="number"
                      value={tierForm.max_claim_per_trade}
                      onChange={(e) => setTierForm({...tierForm, max_claim_per_trade: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_claims_per_month">Max Claims Per Month</Label>
                    <Input
                      id="max_claims_per_month"
                      type="number"
                      value={tierForm.max_claims_per_month || ''}
                      onChange={(e) => setTierForm({...tierForm, max_claims_per_month: e.target.value ? parseInt(e.target.value) : null})}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_loss_threshold">Min Loss Threshold ($)</Label>
                    <Input
                      id="min_loss_threshold"
                      type="number"
                      value={tierForm.min_loss_threshold}
                      onChange={(e) => setTierForm({...tierForm, min_loss_threshold: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bonus_rewards">Bonus BSK Rewards</Label>
                    <Input
                      id="bonus_rewards"
                      type="number"
                      value={tierForm.bonus_rewards}
                      onChange={(e) => setTierForm({...tierForm, bonus_rewards: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={tierForm.is_active}
                      onCheckedChange={(checked) => setTierForm({...tierForm, is_active: checked})}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTier}>
                    {editingTier ? 'Update' : 'Create'} Tier
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {subscriptionTiers.map((tier) => (
              <Card key={tier.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      {tier.tier_name === 'Basic' && <Shield className="w-5 h-5 text-blue-500" />}
                      {tier.tier_name === 'Premium' && <Star className="w-5 h-5 text-purple-500" />}
                      {tier.tier_name === 'VIP' && <Crown className="w-5 h-5 text-gold" />}
                      {tier.tier_name === 'Elite' && <Zap className="w-5 h-5 text-orange-500" />}
                      <CardTitle className="text-lg">{tier.tier_name}</CardTitle>
                      <Badge variant={tier.is_active ? "default" : "secondary"}>
                        {tier.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTierForm({
                            id: tier.id,
                            tier_name: tier.tier_name,
                            monthly_fee: tier.monthly_fee,
                            coverage_ratio: tier.coverage_ratio,
                            max_claim_per_trade: tier.max_claim_per_trade,
                            max_claims_per_month: tier.max_claims_per_month,
                            min_loss_threshold: tier.min_loss_threshold,
                            bonus_rewards: tier.bonus_rewards,
                            is_active: tier.is_active
                          });
                          setEditingTier(true);
                          setTierDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTier(tier.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Monthly Fee</p>
                      <p className="font-semibold">${tier.monthly_fee}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Coverage</p>
                      <p className="font-semibold">{(tier.coverage_ratio * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Per Trade</p>
                      <p className="font-semibold">${tier.max_claim_per_trade}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Claims/Month</p>
                      <p className="font-semibold">{tier.max_claims_per_month || 'Unlimited'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Loss</p>
                      <p className="font-semibold">${tier.min_loss_threshold}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">BSK Rewards</p>
                      <p className="font-semibold">{tier.bonus_rewards} BSK</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Insurance Plans</h3>
            <Button onClick={() => {
              resetPlanForm();
              setPlanDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </div>

          <div className="grid gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="bg-card/60 backdrop-blur-sm border border-border/50">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold flex items-center space-x-2">
                        <span>{plan.plan_name}</span>
                        <Badge className={getStatusColor(plan.is_active ? 'active' : 'inactive')}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground">{plan.notes}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setPlanForm({
                          id: plan.id,
                          plan_name: plan.plan_name,
                          premium_amount: plan.premium_amount,
                          coverage_ratio: plan.coverage_ratio,
                          max_coverage_per_claim: plan.max_coverage_per_claim,
                          min_loss_threshold: plan.min_loss_threshold,
                          is_active: plan.is_active,
                          notes: plan.notes || ''
                        });
                        setEditingPlan(true);
                        setPlanDialogOpen(true);
                      }}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeletePlan(plan.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Premium</p>
                      <p className="font-semibold">${plan.premium_amount}/month</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Coverage</p>
                      <p className="font-semibold">{(plan.coverage_ratio * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Coverage</p>
                      <p className="font-semibold">${plan.max_coverage_per_claim}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Threshold</p>
                      <p className="font-semibold">${plan.min_loss_threshold}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <div className="space-y-4">
            {claims.map((claim) => (
              <Card key={claim.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Claim #{claim.id.slice(0, 8)}</CardTitle>
                    <Badge className={getStatusColor(claim.status)}>
                      {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Loss Amount</p>
                      <p className="font-semibold">${claim.loss_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reimbursement</p>
                      <p className="font-semibold">${(claim.reimbursed_amount || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-semibold">{new Date(claim.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">{claim.status}</p>
                    </div>
                  </div>
                  {claim.status === 'pending' && (
                    <div className="flex space-x-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => handleClaimAction(claim.id, 'approved', claim.reimbursed_amount)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleClaimAction(claim.id, 'denied', 0)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="space-y-4">
            {policies.map((policy) => (
              <Card key={policy.id}>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">User ID</p>
                      <p className="font-semibold">{policy.user_id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Premium Paid</p>
                      <p className="font-semibold">${policy.premium_paid}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(policy.status)}>
                        {policy.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Subscribed</p>
                      <p className="font-semibold">{new Date(policy.subscribed_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan_name">Plan Name</Label>
              <Input
                id="plan_name"
                value={planForm.plan_name}
                onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                placeholder="e.g., Trade Loss Protection"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="premium_amount">Monthly Premium ($)</Label>
                <Input
                  id="premium_amount"
                  type="number"
                  step="0.01"
                  value={planForm.premium_amount}
                  onChange={(e) => setPlanForm({ ...planForm, premium_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="29.99"
                />
              </div>
              <div>
                <Label htmlFor="coverage_ratio">Coverage Ratio</Label>
                <Input
                  id="coverage_ratio"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={planForm.coverage_ratio}
                  onChange={(e) => setPlanForm({ ...planForm, coverage_ratio: parseFloat(e.target.value) || 0 })}
                  placeholder="0.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_coverage_per_claim">Max Coverage per Claim ($)</Label>
                <Input
                  id="max_coverage_per_claim"
                  type="number"
                  value={planForm.max_coverage_per_claim}
                  onChange={(e) => setPlanForm({ ...planForm, max_coverage_per_claim: parseFloat(e.target.value) || 0 })}
                  placeholder="1000"
                />
              </div>
              <div>
                <Label htmlFor="min_loss_threshold">Min Loss Threshold ($)</Label>
                <Input
                  id="min_loss_threshold"
                  type="number"
                  value={planForm.min_loss_threshold}
                  onChange={(e) => setPlanForm({ ...planForm, min_loss_threshold: parseFloat(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={planForm.is_active}
                onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })}
              />
              <Label htmlFor="is_active">Active Plan</Label>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={planForm.notes}
                onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                placeholder="Plan description and terms..."
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSavePlan} className="flex-1">
                {editingPlan ? 'Update' : 'Create'} Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInsurance;
