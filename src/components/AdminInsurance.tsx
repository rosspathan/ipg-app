import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Shield, FileText, Users, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";

interface InsurancePlan {
  id: string;
  name: string;
  type: string;
  premium: number;
  coverage_amount: number;
  duration_days: number;
  max_claims: number;
  waiting_period_hours: number;
  coverage_scope: string;
  exclusions: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface InsuranceClaim {
  id: string;
  user_id: string;
  policy_id: string | null;
  reason: string;
  description: string | null;
  claim_amount: number;
  payout_amount: number | null;
  payout_asset: string | null;
  status: string;
  reference_id: string | null;
  attachments: string[] | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface InsurancePolicy {
  id: string;
  user_id: string;
  plan_id: string | null;
  premium_paid: number;
  coverage_amount: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export const AdminInsurance = () => {
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InsurancePlan | null>(null);
  const [activeTab, setActiveTab] = useState("plans");
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    premium: "",
    coverage_amount: "",
    duration_days: "",
    max_claims: "",
    waiting_period_hours: "",
    coverage_scope: "",
    exclusions: "",
    active: true,
  });
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [plansResponse, claimsResponse, policiesResponse] = await Promise.all([
        supabase.from("insurance_plans").select("*").order("created_at", { ascending: false }),
        supabase.from("insurance_claims").select("*").order("created_at", { ascending: false }),
        supabase.from("insurance_policies").select("*").order("created_at", { ascending: false })
      ]);

      if (plansResponse.error) throw plansResponse.error;
      if (claimsResponse.error) throw claimsResponse.error;
      if (policiesResponse.error) throw policiesResponse.error;

      setPlans(plansResponse.data || []);
      setClaims(claimsResponse.data || []);
      setPolicies(policiesResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading insurance data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      premium: "",
      coverage_amount: "",
      duration_days: "",
      max_claims: "",
      waiting_period_hours: "",
      coverage_scope: "",
      exclusions: "",
      active: true,
    });
    setEditingPlan(null);
  };

  const handleEditPlan = (plan: InsurancePlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      type: plan.type,
      premium: plan.premium.toString(),
      coverage_amount: plan.coverage_amount.toString(),
      duration_days: plan.duration_days.toString(),
      max_claims: plan.max_claims.toString(),
      waiting_period_hours: plan.waiting_period_hours.toString(),
      coverage_scope: plan.coverage_scope,
      exclusions: plan.exclusions?.join(", ") || "",
      active: plan.active,
    });
    setDialogOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      const planData = {
        name: formData.name,
        type: formData.type,
        premium: parseFloat(formData.premium),
        coverage_amount: parseFloat(formData.coverage_amount),
        duration_days: parseInt(formData.duration_days),
        max_claims: parseInt(formData.max_claims),
        waiting_period_hours: parseInt(formData.waiting_period_hours),
        coverage_scope: formData.coverage_scope,
        exclusions: formData.exclusions ? formData.exclusions.split(",").map(s => s.trim()).filter(s => s) : null,
        active: formData.active,
      };

      let response;
      if (editingPlan) {
        response = await supabase
          .from("insurance_plans")
          .update(planData)
          .eq("id", editingPlan.id);

        await supabase.rpc("log_admin_action", {
          p_action: "update_insurance_plan",
          p_resource_type: "insurance_plans",
          p_resource_id: editingPlan.id,
          p_old_values: JSON.parse(JSON.stringify(editingPlan)),
          p_new_values: JSON.parse(JSON.stringify({ ...editingPlan, ...planData })),
        });
      } else {
        response = await supabase.from("insurance_plans").insert([planData]);

        await supabase.rpc("log_admin_action", {
          p_action: "create_insurance_plan",
          p_resource_type: "insurance_plans",
          p_new_values: JSON.parse(JSON.stringify(planData)),
        });
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Insurance plan ${editingPlan ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClaimAction = async (claim: InsuranceClaim, action: string, payoutAmount?: number) => {
    try {
      const updates: any = { status: action };
      if (action === "approved" && payoutAmount) {
        updates.payout_amount = payoutAmount;
        updates.payout_asset = "USDT";
      }
      updates.reviewed_at = new Date().toISOString();
      updates.reviewed_by = "admin"; // Should be actual admin ID

      const { error } = await supabase
        .from("insurance_claims")
        .update(updates)
        .eq("id", claim.id);

      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: `${action}_insurance_claim`,
        p_resource_type: "insurance_claims",
        p_resource_id: claim.id,
        p_old_values: JSON.parse(JSON.stringify(claim)),
        p_new_values: JSON.parse(JSON.stringify({ ...claim, ...updates })),
      });

      toast({
        title: "Success",
        description: `Claim ${action} successfully`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      case "expired": return "outline";
      default: return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading insurance data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Insurance Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage insurance plans, policies, and claims
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger>
            <TabsTrigger value="claims">Claims ({claims.length})</TabsTrigger>
            <TabsTrigger value="policies">Policies ({policies.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Insurance Plans</h3>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPlan ? "Edit Insurance Plan" : "Create New Insurance Plan"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Plan Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Crypto Loss Protection"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Plan Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="theft">Theft Protection</SelectItem>
                            <SelectItem value="exchange">Exchange Protection</SelectItem>
                            <SelectItem value="wallet">Wallet Protection</SelectItem>
                            <SelectItem value="comprehensive">Comprehensive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="premium">Premium (USDT)</Label>
                        <Input
                          id="premium"
                          type="number"
                          step="0.01"
                          value={formData.premium}
                          onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                          placeholder="e.g., 100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coverage_amount">Coverage Amount</Label>
                        <Input
                          id="coverage_amount"
                          type="number"
                          step="0.01"
                          value={formData.coverage_amount}
                          onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
                          placeholder="e.g., 10000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration_days">Duration (Days)</Label>
                        <Input
                          id="duration_days"
                          type="number"
                          value={formData.duration_days}
                          onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                          placeholder="e.g., 365"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="max_claims">Max Claims</Label>
                        <Input
                          id="max_claims"
                          type="number"
                          value={formData.max_claims}
                          onChange={(e) => setFormData({ ...formData, max_claims: e.target.value })}
                          placeholder="e.g., 2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="waiting_period_hours">Waiting Period (Hours)</Label>
                        <Input
                          id="waiting_period_hours"
                          type="number"
                          value={formData.waiting_period_hours}
                          onChange={(e) => setFormData({ ...formData, waiting_period_hours: e.target.value })}
                          placeholder="e.g., 24"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coverage_scope">Coverage Scope</Label>
                      <Textarea
                        id="coverage_scope"
                        value={formData.coverage_scope}
                        onChange={(e) => setFormData({ ...formData, coverage_scope: e.target.value })}
                        placeholder="Describe what this plan covers..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exclusions">Exclusions (comma-separated)</Label>
                      <Textarea
                        id="exclusions"
                        value={formData.exclusions}
                        onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
                        placeholder="e.g., Market volatility, User error, Trading losses"
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                      />
                      <Label htmlFor="active">Active</Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSavePlan}>
                        {editingPlan ? "Update" : "Create"} Plan
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{plan.name}</h4>
                      <Badge variant={getStatusColor(plan.active ? "active" : "inactive")}>
                        {plan.active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{plan.type}</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Premium</p>
                      <p className="font-semibold">{plan.premium} USDT</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Coverage</p>
                      <p className="font-semibold">{plan.coverage_amount.toLocaleString()} USDT</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-semibold">{plan.duration_days} days</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Claims</p>
                      <p className="font-semibold">{plan.max_claims}</p>
                    </div>
                  </div>

                  <Separator className="my-3" />
                  <p className="text-sm text-muted-foreground">{plan.coverage_scope}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="claims" className="space-y-4">
            <h3 className="text-lg font-semibold">Insurance Claims</h3>
            <div className="space-y-4">
              {claims.map((claim) => (
                <div key={claim.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">Claim #{claim.id.slice(0, 8)}</h4>
                      <Badge variant={getStatusColor(claim.status)}>
                        {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {claim.status === "pending" && (
                        <>
                          <Input
                            type="number"
                            placeholder="Payout amount"
                            className="w-32"
                            id={`payout-${claim.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`payout-${claim.id}`) as HTMLInputElement;
                              const amount = parseFloat(input.value);
                              if (amount > 0) {
                                handleClaimAction(claim, "approved", amount);
                              }
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleClaimAction(claim, "rejected")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-muted-foreground">Claim Amount</p>
                      <p className="font-semibold">{claim.claim_amount.toLocaleString()} USDT</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payout Amount</p>
                      <p className="font-semibold">
                        {claim.payout_amount ? `${claim.payout_amount.toLocaleString()} ${claim.payout_asset}` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reason</p>
                      <p className="font-semibold">{claim.reason}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-semibold">{formatDate(claim.created_at)}</p>
                    </div>
                  </div>

                  {claim.description && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-sm">{claim.description}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <h3 className="text-lg font-semibold">Insurance Policies</h3>
            <div className="space-y-4">
              {policies.map((policy) => (
                <div key={policy.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">Policy #{policy.id.slice(0, 8)}</h4>
                      <Badge variant={getStatusColor(policy.status)}>
                        {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Premium Paid</p>
                      <p className="font-semibold">{policy.premium_paid} USDT</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Coverage</p>
                      <p className="font-semibold">{policy.coverage_amount.toLocaleString()} USDT</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-semibold">{formatDate(policy.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-semibold">{formatDate(policy.end_date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};