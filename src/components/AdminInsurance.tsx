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
import { Shield, Heart, TrendingDown, Plus, Edit, Trash2, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BSKInsurancePlan {
  id: string;
  plan_type: string;
  plan_name: string;
  annual_premium_bsk: number;
  max_coverage_bsk: number;
  min_age?: number | null;
  max_age?: number | null;
  min_loss_required_bsk?: number | null;
  coverage_ratio?: number | null;
  is_active: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

interface InsuranceClaim {
  id: string;
  user_id: string;
  loss_amount: number;
  reimbursed_amount?: number;
  status: string;
  claim_reason?: string;
  admin_notes?: string;
  created_at: string;
}

const AdminInsurance = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<BSKInsurancePlan[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const { toast } = useToast();

  const [planForm, setPlanForm] = useState({
    id: '',
    plan_type: 'accident' as 'accident' | 'trading' | 'life',
    plan_name: '',
    annual_premium_bsk: 10000,
    max_coverage_bsk: 1000000,
    min_age: undefined as number | undefined,
    max_age: undefined as number | undefined,
    min_loss_required_bsk: undefined as number | undefined,
    coverage_ratio: undefined as number | undefined,
    is_active: true,
    description: ''
  });
  const [editingPlan, setEditingPlan] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('insurance_bsk_plans')
      .select('*')
      .order('plan_type', { ascending: true });
    
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

  const loadClaims = async () => {
    const { data, error } = await supabase
      .from('insurance_claims')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error loading claims:', error);
    } else {
      setClaims(data || []);
    }
  };

  const loadPolicies = async () => {
    const { data, error } = await supabase
      .from('insurance_bsk_policies')
      .select('*')
      .order('start_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error loading policies:', error);
    } else {
      setPolicies(data || []);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadPlans(), loadClaims(), loadPolicies()]);
      setLoading(false);
    };

    loadData();
  }, []);

  const resetPlanForm = () => {
    setPlanForm({
      id: '',
      plan_type: 'accident',
      plan_name: '',
      annual_premium_bsk: 10000,
      max_coverage_bsk: 1000000,
      min_age: undefined,
      max_age: undefined,
      min_loss_required_bsk: undefined,
      coverage_ratio: undefined,
      is_active: true,
      description: ''
    });
    setEditingPlan(false);
  };

  const handleSavePlan = async () => {
    try {
      const planData = {
        plan_type: planForm.plan_type,
        plan_name: planForm.plan_name,
        annual_premium_bsk: planForm.annual_premium_bsk,
        max_coverage_bsk: planForm.max_coverage_bsk,
        min_age: planForm.min_age || null,
        max_age: planForm.max_age || null,
        min_loss_required_bsk: planForm.min_loss_required_bsk || null,
        coverage_ratio: planForm.coverage_ratio || null,
        is_active: planForm.is_active,
        description: planForm.description
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('insurance_bsk_plans')
          .update(planData)
          .eq('id', planForm.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('insurance_bsk_plans')
          .insert([planData]);

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

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this insurance plan?')) return;
    
    try {
      const { error } = await supabase
        .from('insurance_bsk_plans')
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

  const getPlanIcon = (type: string) => {
    switch (type) {
      case 'accident':
        return Shield;
      case 'life':
        return Heart;
      case 'trading':
        return TrendingDown;
      default:
        return Shield;
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
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <span>Insurance Management (BSK)</span>
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Plans</p>
                <p className="text-2xl font-bold">{plans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Active Policies</p>
                <p className="text-2xl font-bold">{policies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Claims</p>
                <p className="text-2xl font-bold">{claims.filter(c => c.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Total Payouts (BSK)</p>
                <p className="text-2xl font-bold">{claims.reduce((sum, claim) => sum + (claim.reimbursed_amount || 0), 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">Insurance Plans</TabsTrigger>
          <TabsTrigger value="claims">Claims Management</TabsTrigger>
          <TabsTrigger value="policies">Active Policies</TabsTrigger>
        </TabsList>

        {/* Insurance Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Insurance Plans</h3>
            <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetPlanForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPlan ? 'Edit' : 'Create'} Insurance Plan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Plan Type</Label>
                    <Select
                      value={planForm.plan_type}
                      onValueChange={(value: any) => setPlanForm({ ...planForm, plan_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accident">Accident Insurance</SelectItem>
                        <SelectItem value="trading">Trading Insurance</SelectItem>
                        <SelectItem value="life">Life Insurance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Plan Name</Label>
                    <Input
                      value={planForm.plan_name}
                      onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                      placeholder="Enter plan name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Annual Premium (BSK)</Label>
                      <Input
                        type="number"
                        value={planForm.annual_premium_bsk}
                        onChange={(e) => setPlanForm({ ...planForm, annual_premium_bsk: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <Label>Max Coverage (BSK)</Label>
                      <Input
                        type="number"
                        value={planForm.max_coverage_bsk}
                        onChange={(e) => setPlanForm({ ...planForm, max_coverage_bsk: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {planForm.plan_type === 'life' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Min Age</Label>
                        <Input
                          type="number"
                          value={planForm.min_age || ''}
                          onChange={(e) => setPlanForm({ ...planForm, min_age: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>

                      <div>
                        <Label>Max Age</Label>
                        <Input
                          type="number"
                          value={planForm.max_age || ''}
                          onChange={(e) => setPlanForm({ ...planForm, max_age: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                    </div>
                  )}

                  {planForm.plan_type === 'trading' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Min Loss Required (BSK)</Label>
                        <Input
                          type="number"
                          value={planForm.min_loss_required_bsk || ''}
                          onChange={(e) => setPlanForm({ ...planForm, min_loss_required_bsk: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>

                      <div>
                        <Label>Coverage Ratio</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={planForm.coverage_ratio || ''}
                          onChange={(e) => setPlanForm({ ...planForm, coverage_ratio: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={planForm.description}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      placeholder="Plan description"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={planForm.is_active}
                      onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>

                  <Button onClick={handleSavePlan} className="w-full">
                    {editingPlan ? 'Update' : 'Create'} Plan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {plans.map((plan) => {
              const Icon = getPlanIcon(plan.plan_type);
              return (
                <Card key={plan.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle>{plan.plan_name}</CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">{plan.plan_type} Insurance</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPlanForm({
                              id: plan.id,
                              plan_type: plan.plan_type as any,
                              plan_name: plan.plan_name,
                              annual_premium_bsk: plan.annual_premium_bsk,
                              max_coverage_bsk: plan.max_coverage_bsk,
                              min_age: plan.min_age || undefined,
                              max_age: plan.max_age || undefined,
                              min_loss_required_bsk: plan.min_loss_required_bsk || undefined,
                              coverage_ratio: plan.coverage_ratio || undefined,
                              is_active: plan.is_active,
                              description: plan.description || ''
                            });
                            setEditingPlan(true);
                            setPlanDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Annual Premium</p>
                        <p className="text-lg font-semibold">{plan.annual_premium_bsk.toLocaleString()} BSK</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Max Coverage</p>
                        <p className="text-lg font-semibold">{plan.max_coverage_bsk.toLocaleString()} BSK</p>
                      </div>
                      {plan.plan_type === 'life' && (
                        <div>
                          <p className="text-sm text-muted-foreground">Age Range</p>
                          <p className="text-lg font-semibold">{plan.min_age || 0} - {plan.max_age || 100} years</p>
                        </div>
                      )}
                      {plan.plan_type === 'trading' && plan.min_loss_required_bsk && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Min Loss Required</p>
                            <p className="text-lg font-semibold">{plan.min_loss_required_bsk.toLocaleString()} BSK</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Coverage Ratio</p>
                            <p className="text-lg font-semibold">{((plan.coverage_ratio || 0) * 100).toFixed(0)}%</p>
                          </div>
                        </>
                      )}
                    </div>
                    {plan.description && (
                      <p className="mt-4 text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Claims Management Tab */}
        <TabsContent value="claims" className="space-y-6">
          <h3 className="text-xl font-semibold">Claims Management</h3>
          <div className="space-y-4">
            {claims.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No claims submitted yet
                </CardContent>
              </Card>
            ) : (
              claims.map((claim) => (
                <Card key={claim.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(claim.status)}>
                            {claim.status.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(claim.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">Loss Amount:</span> {claim.loss_amount.toLocaleString()} BSK
                        </p>
                        {claim.reimbursed_amount && (
                          <p className="text-sm">
                            <span className="font-medium">Reimbursed:</span> {claim.reimbursed_amount.toLocaleString()} BSK
                          </p>
                        )}
                        {claim.claim_reason && (
                          <p className="text-sm text-muted-foreground">{claim.claim_reason}</p>
                        )}
                      </div>
                      
                      {claim.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleClaimAction(claim.id, 'approved', claim.loss_amount * 0.5)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleClaimAction(claim.id, 'denied')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Active Policies Tab */}
        <TabsContent value="policies" className="space-y-6">
          <h3 className="text-xl font-semibold">Active Policies</h3>
          <div className="space-y-4">
            {policies.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No active policies
                </CardContent>
              </Card>
            ) : (
              policies.map((policy) => (
                <Card key={policy.id}>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Policy Number</p>
                        <p className="font-semibold">{policy.policy_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Plan Type</p>
                        <p className="font-semibold capitalize">{policy.plan_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Premium Paid</p>
                        <p className="font-semibold">{policy.premium_bsk?.toLocaleString() || 0} BSK</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={policy.status === 'active' ? "default" : "secondary"}>
                          {policy.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInsurance;
