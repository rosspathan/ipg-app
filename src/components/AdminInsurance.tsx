import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit3, Trash2, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
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
  is_active: boolean;
  notes: string;
  created_at: string;
}

interface InsuranceClaim {
  id: string;
  user_id: string;
  plan_id: string;
  trade_id: string | null;
  loss_amount: number;
  reimbursed_amount: number;
  status: string;
  claim_reason: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  insurance_plans?: {
    plan_name: string;
  };
}

interface InsurancePolicy {
  id: string;
  user_id: string;
  plan_id: string;
  premium_paid: number;
  status: string;
  subscribed_at: string;
  expires_at: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
  insurance_plans?: {
    plan_name: string;
  };
}

const AdminInsurance = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InsurancePlan | null>(null);
  const [planForm, setPlanForm] = useState({
    plan_name: '',
    premium_amount: '',
    coverage_ratio: '',
    max_coverage_per_claim: '',
    min_loss_threshold: '',
    is_active: true,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadPlans(),
        loadClaims(),
        loadPolicies()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error('Error loading claims:', error);
    }
  };

  const loadPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Error loading policies:', error);
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      plan_name: '',
      premium_amount: '',
      coverage_ratio: '',
      max_coverage_per_claim: '',
      min_loss_threshold: '',
      is_active: true,
      notes: ''
    });
    setEditingPlan(null);
  };

  const handleEditPlan = (plan: InsurancePlan) => {
    setEditingPlan(plan);
    setPlanForm({
      plan_name: plan.plan_name,
      premium_amount: plan.premium_amount.toString(),
      coverage_ratio: (plan.coverage_ratio * 100).toString(), // Convert to percentage
      max_coverage_per_claim: plan.max_coverage_per_claim.toString(),
      min_loss_threshold: plan.min_loss_threshold.toString(),
      is_active: plan.is_active,
      notes: plan.notes || ''
    });
    setShowPlanDialog(true);
  };

  const handleSavePlan = async () => {
    try {
      const planData = {
        plan_name: planForm.plan_name,
        premium_amount: parseFloat(planForm.premium_amount),
        coverage_ratio: parseFloat(planForm.coverage_ratio) / 100, // Convert from percentage
        max_coverage_per_claim: parseFloat(planForm.max_coverage_per_claim),
        min_loss_threshold: parseFloat(planForm.min_loss_threshold),
        is_active: planForm.is_active,
        notes: planForm.notes
      };

      let error;
      if (editingPlan) {
        const result = await supabase
          .from('insurance_plans')
          .update(planData)
          .eq('id', editingPlan.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('insurance_plans')
          .insert([planData]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: `Plan ${editingPlan ? 'Updated' : 'Created'}`,
        description: `Insurance plan has been ${editingPlan ? 'updated' : 'created'} successfully`,
      });

      setShowPlanDialog(false);
      resetPlanForm();
      loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Error",
        description: "Failed to save plan",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('insurance_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "Plan Deleted",
        description: "Insurance plan has been deleted successfully",
      });

      loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete plan",
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
        title: "Claim Updated",
        description: `Claim has been ${status}`,
      });

      loadClaims();
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
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'denied':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'active':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-card rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <span>Insurance Management</span>
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card/60 backdrop-blur-sm border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Plans</p>
                <p className="text-2xl font-bold">{plans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Active Policies</p>
                <p className="text-2xl font-bold">{policies.filter(p => p.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Claims</p>
                <p className="text-2xl font-bold">{claims.filter(c => c.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-sm text-muted-foreground">Total Payouts</p>
                <p className="text-2xl font-bold">
                  ${claims.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.reimbursed_amount, 0).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm border border-border/50">
          <TabsTrigger value="plans" className="data-[state=active]:bg-primary/20">Insurance Plans</TabsTrigger>
          <TabsTrigger value="claims" className="data-[state=active]:bg-primary/20">Claims Management</TabsTrigger>
          <TabsTrigger value="policies" className="data-[state=active]:bg-primary/20">Active Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Insurance Plans</h3>
            <Button onClick={() => {
              resetPlanForm();
              setShowPlanDialog(true);
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
                      <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
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
          <h3 className="text-xl font-semibold">Claims Management</h3>
          
          <div className="space-y-4">
            {claims.map((claim) => (
              <Card key={claim.id} className="bg-card/60 backdrop-blur-sm border border-border/50">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold">{(claim.profiles as any)?.full_name || 'Unknown User'}</h4>
                      <p className="text-sm text-muted-foreground">{(claim.profiles as any)?.email}</p>
                      <p className="text-sm text-muted-foreground">Plan: {(claim.insurance_plans as any)?.plan_name}</p>
                    </div>
                    <Badge className={getStatusColor(claim.status)}>
                      {claim.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Loss Amount</p>
                      <p className="font-semibold text-red-400">${claim.loss_amount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reimbursement</p>
                      <p className="font-semibold text-green-400">${claim.reimbursed_amount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Filed</p>
                      <p className="font-semibold">{new Date(claim.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {claim.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleClaimAction(claim.id, 'approved', claim.reimbursed_amount)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleClaimAction(claim.id, 'denied')}
                      >
                        Deny
                      </Button>
                    </div>
                  )}

                  {claim.status === 'approved' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleClaimAction(claim.id, 'paid', claim.reimbursed_amount)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Mark as Paid
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <h3 className="text-xl font-semibold">Active Policies</h3>
          
          <div className="space-y-4">
            {policies.map((policy) => (
              <Card key={policy.id} className="bg-card/60 backdrop-blur-sm border border-border/50">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold">{(policy.profiles as any)?.full_name || 'Unknown User'}</h4>
                      <p className="text-sm text-muted-foreground">{(policy.profiles as any)?.email}</p>
                    </div>
                    <Badge className={getStatusColor(policy.status)}>
                      {policy.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Plan</p>
                      <p className="font-semibold">{(policy.insurance_plans as any)?.plan_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Premium Paid</p>
                      <p className="font-semibold">${policy.premium_paid}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Subscribed</p>
                      <p className="font-semibold">{new Date(policy.subscribed_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className="font-semibold">
                        {policy.expires_at ? new Date(policy.expires_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
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
                  onChange={(e) => setPlanForm({ ...planForm, premium_amount: e.target.value })}
                  placeholder="29.99"
                />
              </div>
              <div>
                <Label htmlFor="coverage_ratio">Coverage Ratio (%)</Label>
                <Input
                  id="coverage_ratio"
                  type="number"
                  min="0"
                  max="100"
                  value={planForm.coverage_ratio}
                  onChange={(e) => setPlanForm({ ...planForm, coverage_ratio: e.target.value })}
                  placeholder="50"
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
                  onChange={(e) => setPlanForm({ ...planForm, max_coverage_per_claim: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div>
                <Label htmlFor="min_loss_threshold">Min Loss Threshold ($)</Label>
                <Input
                  id="min_loss_threshold"
                  type="number"
                  value={planForm.min_loss_threshold}
                  onChange={(e) => setPlanForm({ ...planForm, min_loss_threshold: e.target.value })}
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
              <Button variant="outline" onClick={() => setShowPlanDialog(false)} className="flex-1">
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