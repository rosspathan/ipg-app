import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit, Plus, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  perks: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

const AdminSubscriptions = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [newPerk, setNewPerk] = useState({ key: '', value: '' });
  const { toast } = useToast();

  const emptyPlan: Omit<SubscriptionPlan, 'id' | 'created_at'> = {
    name: '',
    price: 0,
    currency: 'USDT',
    duration_days: 30,
    perks: {},
    is_active: true,
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('subscriptions_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('Error loading plans:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSave = async () => {
    if (!editingPlan) return;

    try {
      const planData = {
        name: editingPlan.name,
        price: editingPlan.price,
        currency: editingPlan.currency,
        duration_days: editingPlan.duration_days,
        perks: editingPlan.perks,
        is_active: editingPlan.is_active,
      };

      if (editingPlan.id) {
        // Update existing plan
        await (supabase as any)
          .from('subscriptions_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        await (supabase as any)
          .from('admin_audit')
          .insert({
            actor: 'admin',
            action: 'subscription_plan_updated',
            entity: 'subscriptions_plans',
            entity_id: editingPlan.id,
            after: planData,
          });
      } else {
        // Create new plan
        const { data } = await (supabase as any)
          .from('subscriptions_plans')
          .insert(planData)
          .select()
          .single();

        await (supabase as any)
          .from('admin_audit')
          .insert({
            actor: 'admin',
            action: 'subscription_plan_created',
            entity: 'subscriptions_plans',
            entity_id: data?.id,
            after: planData,
          });
      }

      toast({
        title: "Success",
        description: `Plan ${editingPlan.id ? 'updated' : 'created'} successfully`,
      });

      setDialogOpen(false);
      setEditingPlan(null);
      loadPlans();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      toast({
        title: "Error",
        description: "Failed to save plan",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (planId: string, isActive: boolean) => {
    try {
      await (supabase as any)
        .from('subscriptions_plans')
        .update({ is_active: isActive })
        .eq('id', planId);

      await (supabase as any)
        .from('admin_audit')
        .insert({
          actor: 'admin',
          action: `subscription_plan_${isActive ? 'activated' : 'deactivated'}`,
          entity: 'subscriptions_plans',
          entity_id: planId,
          after: { is_active: isActive },
        });

      toast({
        title: "Success",
        description: `Plan ${isActive ? 'activated' : 'deactivated'} successfully`,
      });

      loadPlans();
    } catch (error: any) {
      console.error('Error toggling plan:', error);
      toast({
        title: "Error",
        description: "Failed to toggle plan status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      await (supabase as any)
        .from('subscriptions_plans')
        .delete()
        .eq('id', planId);

      await (supabase as any)
        .from('admin_audit')
        .insert({
          actor: 'admin',
          action: 'subscription_plan_deleted',
          entity: 'subscriptions_plans',
          entity_id: planId,
        });

      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });

      loadPlans();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive",
      });
    }
  };

  const addPerk = () => {
    if (!newPerk.key.trim() || !newPerk.value.trim() || !editingPlan) return;

    setEditingPlan({
      ...editingPlan,
      perks: {
        ...editingPlan.perks,
        [newPerk.key]: newPerk.value,
      },
    });
    setNewPerk({ key: '', value: '' });
  };

  const removePerk = (key: string) => {
    if (!editingPlan) return;

    const { [key]: removed, ...remainingPerks } = editingPlan.perks;
    setEditingPlan({
      ...editingPlan,
      perks: remainingPerks,
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading subscription plans...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Subscription Plans</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingPlan(emptyPlan as SubscriptionPlan);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingPlan?.id ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
              </DialogHeader>
              {editingPlan && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Plan Name</label>
                    <Input
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        name: e.target.value
                      })}
                      placeholder="VIP Plan"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Price</label>
                      <Input
                        type="number"
                        value={editingPlan.price}
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          price: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Currency</label>
                      <Select
                        value={editingPlan.currency}
                        onValueChange={(value) => setEditingPlan({
                          ...editingPlan,
                          currency: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USDT">USDT</SelectItem>
                          <SelectItem value="BTC">BTC</SelectItem>
                          <SelectItem value="ETH">ETH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duration (Days)</label>
                    <Input
                      type="number"
                      value={editingPlan.duration_days}
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        duration_days: parseInt(e.target.value) || 1
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Perks</label>
                    <div className="space-y-2">
                      {Object.entries(editingPlan.perks).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm">{key}: {value}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePerk(key)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Perk name"
                          value={newPerk.key}
                          onChange={(e) => setNewPerk({ ...newPerk, key: e.target.value })}
                        />
                        <Input
                          placeholder="Perk value"
                          value={newPerk.value}
                          onChange={(e) => setNewPerk({ ...newPerk, value: e.target.value })}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addPerk}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Active</label>
                    <Switch
                      checked={editingPlan.is_active}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        is_active: checked
                      })}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} className="flex-1">
                      {editingPlan.id ? 'Update' : 'Create'} Plan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setEditingPlan(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{plan.name}</h3>
                        <Badge variant={plan.is_active ? 'default' : 'outline'}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Price: {plan.price} {plan.currency}</p>
                        <p>Duration: {plan.duration_days} days</p>
                        {Object.keys(plan.perks).length > 0 && (
                          <div>
                            <p>Perks:</p>
                            <ul className="list-disc list-inside ml-2">
                              {Object.entries(plan.perks).map(([key, value]) => (
                                <li key={key}>{key}: {value}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(plan.id, !plan.is_active)}
                      >
                        {plan.is_active ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPlan(plan);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscriptions;