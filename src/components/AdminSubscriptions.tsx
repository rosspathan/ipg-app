import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: string;
  features: any; // JSONB field from database
  is_popular: boolean;
  is_active: boolean;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  features: string;
  is_popular: boolean;
  is_active: boolean;
  stripe_price_id: string;
}

export function AdminSubscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>({
    name: "",
    description: "",
    price: 0,
    currency: "USD",
    billing_period: "monthly",
    features: "",
    is_popular: false,
    is_active: true,
    stripe_price_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error loading plans:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        ...formData,
        features: formData.features.split('\n').filter(f => f.trim()),
      };

      if (editingPlan) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", editingPlan.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Subscription plan updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert([planData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Subscription plan created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
      resetForm();
      loadPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Error",
        description: "Failed to save subscription plan",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      currency: plan.currency,
      billing_period: plan.billing_period,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      is_popular: plan.is_popular,
      is_active: plan.is_active,
      stripe_price_id: plan.stripe_price_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`Are you sure you want to delete the plan "${plan.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", plan.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Subscription plan deleted successfully",
      });
      loadPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        title: "Error",
        description: "Failed to delete subscription plan",
        variant: "destructive",
      });
    }
  };

  const togglePlanStatus = async (plan: SubscriptionPlan) => {
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active: !plan.is_active })
        .eq("id", plan.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Plan ${!plan.is_active ? 'activated' : 'deactivated'} successfully`,
      });
      loadPlans();
    } catch (error) {
      console.error("Error updating plan status:", error);
      toast({
        title: "Error",
        description: "Failed to update plan status",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      currency: "USD",
      billing_period: "monthly",
      features: "",
      is_popular: false,
      is_active: true,
      stripe_price_id: "",
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
    resetForm();
  };

  if (loading) {
    return <div>Loading subscription plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Subscriptions Management</h2>
          <p className="text-muted-foreground">Create and manage subscription plans, configure bonuses and multipliers.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogClose()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
              <DialogDescription>
                {editingPlan ? 'Update the subscription plan details' : 'Add a new subscription plan to your platform'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Premium Plan"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Plan description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_period">Billing Period</Label>
                <Select value={formData.billing_period} onValueChange={(value) => setFormData({ ...formData, billing_period: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe_price_id">Stripe Price ID (optional)</Label>
                <Input
                  id="stripe_price_id"
                  value={formData.stripe_price_id}
                  onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                  placeholder="price_xxx"
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_popular"
                    checked={formData.is_popular}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                  />
                  <Label htmlFor="is_popular">Mark as Popular</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>
            Manage your platform's subscription plans and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No subscription plans found. Create your first plan to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{plan.name}</span>
                          {plan.is_popular && (
                            <Badge variant="secondary">Popular</Badge>
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {plan.currency} {plan.price.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">{plan.billing_period}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {Array.isArray(plan.features) && plan.features.slice(0, 2).map((feature, index) => (
                          <div key={index} className="text-sm">{feature}</div>
                        ))}
                        {Array.isArray(plan.features) && plan.features.length > 2 && (
                          <div className="text-sm text-muted-foreground">
                            +{plan.features.length - 2} more
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {plan.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePlanStatus(plan)}
                        >
                          {plan.is_active ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(plan)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}