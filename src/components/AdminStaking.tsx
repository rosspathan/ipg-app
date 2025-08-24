import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, TrendingUp, Clock, Users } from "lucide-react";

interface StakingPool {
  id: string;
  name: string;
  asset_id: string;
  apy: number;
  lock_period_days: number;
  capacity: number | null;
  current_staked: number;
  early_exit_penalty: number;
  platform_fee: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Asset {
  id: string;
  symbol: string;
  name: string;
}

export const AdminStaking = () => {
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<StakingPool | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    asset_id: "",
    apy: "",
    lock_period_days: "",
    capacity: "",
    early_exit_penalty: "",
    platform_fee: "",
    active: true,
  });
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load pools and assets in parallel
      const [poolsResponse, assetsResponse] = await Promise.all([
        supabase.from("staking_pools").select("*").order("created_at", { ascending: false }),
        supabase.from("assets").select("id, symbol, name").eq("is_active", true)
      ]);

      if (poolsResponse.error) throw poolsResponse.error;
      if (assetsResponse.error) throw assetsResponse.error;

      setPools(poolsResponse.data || []);
      setAssets(assetsResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
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
      asset_id: "",
      apy: "",
      lock_period_days: "",
      capacity: "",
      early_exit_penalty: "",
      platform_fee: "",
      active: true,
    });
    setEditingPool(null);
  };

  const handleEdit = (pool: StakingPool) => {
    setEditingPool(pool);
    setFormData({
      name: pool.name,
      asset_id: pool.asset_id || "",
      apy: pool.apy.toString(),
      lock_period_days: pool.lock_period_days.toString(),
      capacity: pool.capacity?.toString() || "",
      early_exit_penalty: pool.early_exit_penalty.toString(),
      platform_fee: pool.platform_fee.toString(),
      active: pool.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const poolData = {
        name: formData.name,
        asset_id: formData.asset_id || null,
        apy: parseFloat(formData.apy),
        lock_period_days: parseInt(formData.lock_period_days),
        capacity: formData.capacity ? parseFloat(formData.capacity) : null,
        early_exit_penalty: parseFloat(formData.early_exit_penalty),
        platform_fee: parseFloat(formData.platform_fee),
        active: formData.active,
      };

      let response;
      if (editingPool) {
        response = await supabase
          .from("staking_pools")
          .update(poolData)
          .eq("id", editingPool.id);

        // Log the admin action
        await supabase.rpc("log_admin_action", {
          p_action: "update_staking_pool",
          p_resource_type: "staking_pools",
          p_resource_id: editingPool.id,
          p_old_values: JSON.parse(JSON.stringify(editingPool)),
          p_new_values: JSON.parse(JSON.stringify({ ...editingPool, ...poolData })),
        });
      } else {
        response = await supabase.from("staking_pools").insert([poolData]);

        // Log the admin action
        await supabase.rpc("log_admin_action", {
          p_action: "create_staking_pool",
          p_resource_type: "staking_pools",
          p_new_values: poolData,
        });
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Staking pool ${editingPool ? "updated" : "created"} successfully`,
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

  const handleToggleActive = async (pool: StakingPool) => {
    try {
      const { error } = await supabase
        .from("staking_pools")
        .update({ active: !pool.active })
        .eq("id", pool.id);

      if (error) throw error;

      // Log the admin action
      await supabase.rpc("log_admin_action", {
        p_action: pool.active ? "deactivate_staking_pool" : "activate_staking_pool",
        p_resource_type: "staking_pools",
        p_resource_id: pool.id,
        p_old_values: JSON.parse(JSON.stringify(pool)),
        p_new_values: JSON.parse(JSON.stringify({ ...pool, active: !pool.active })),
      });

      toast({
        title: "Success",
        description: `Staking pool ${pool.active ? "deactivated" : "activated"} successfully`,
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

  const handleDelete = async (pool: StakingPool) => {
    if (!confirm("Are you sure you want to delete this staking pool?")) return;

    try {
      const { error } = await supabase.from("staking_pools").delete().eq("id", pool.id);

      if (error) throw error;

      // Log the admin action
      await supabase.rpc("log_admin_action", {
        p_action: "delete_staking_pool",
        p_resource_type: "staking_pools",
        p_resource_id: pool.id,
        p_old_values: JSON.parse(JSON.stringify(pool)),
      });

      toast({
        title: "Success",
        description: "Staking pool deleted successfully",
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

  const getAssetSymbol = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    return asset?.symbol || "Unknown";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading staking pools...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Staking Pools Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage staking pools with APY, lock periods, and capacity limits
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pool
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPool ? "Edit Staking Pool" : "Create New Staking Pool"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Pool Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Bitcoin High Yield Pool"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset">Asset</Label>
                    <Select
                      value={formData.asset_id}
                      onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.symbol} - {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apy">APY (%)</Label>
                    <Input
                      id="apy"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.apy}
                      onChange={(e) => setFormData({ ...formData, apy: e.target.value })}
                      placeholder="e.g., 12.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lock_period">Lock Period (days)</Label>
                    <Input
                      id="lock_period"
                      type="number"
                      min="1"
                      value={formData.lock_period_days}
                      onChange={(e) => setFormData({ ...formData, lock_period_days: e.target.value })}
                      placeholder="e.g., 30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (optional)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      step="0.00000001"
                      min="0"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      placeholder="e.g., 1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="early_exit_penalty">Early Exit Penalty (%)</Label>
                    <Input
                      id="early_exit_penalty"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.early_exit_penalty}
                      onChange={(e) => setFormData({ ...formData, early_exit_penalty: e.target.value })}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform_fee">Platform Fee (%)</Label>
                    <Input
                      id="platform_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.platform_fee}
                      onChange={(e) => setFormData({ ...formData, platform_fee: e.target.value })}
                      placeholder="e.g., 2"
                    />
                  </div>
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
                  <Button onClick={handleSave}>
                    {editingPool ? "Update" : "Create"} Pool
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {pools.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No staking pools found. Create your first pool to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pools.map((pool) => (
              <div key={pool.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{pool.name}</h3>
                    <Badge variant={pool.active ? "default" : "secondary"}>
                      {pool.active ? "Active" : "Inactive"}
                    </Badge>
                    {pool.asset_id && (
                      <Badge variant="outline">{getAssetSymbol(pool.asset_id)}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pool.active}
                      onCheckedChange={() => handleToggleActive(pool)}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleEdit(pool)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(pool)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-muted-foreground">APY</p>
                      <p className="font-semibold">{pool.apy}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-muted-foreground">Lock Period</p>
                      <p className="font-semibold">{pool.lock_period_days} days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-muted-foreground">Capacity</p>
                      <p className="font-semibold">
                        {pool.capacity ? pool.capacity.toLocaleString() : "Unlimited"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-muted-foreground">Current Staked</p>
                      <p className="font-semibold">{pool.current_staked.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {(pool.early_exit_penalty > 0 || pool.platform_fee > 0) && (
                  <>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {pool.early_exit_penalty > 0 && (
                        <div>
                          <p className="text-muted-foreground">Early Exit Penalty</p>
                          <p className="font-semibold text-red-500">{pool.early_exit_penalty}%</p>
                        </div>
                      )}
                      {pool.platform_fee > 0 && (
                        <div>
                          <p className="text-muted-foreground">Platform Fee</p>
                          <p className="font-semibold">{pool.platform_fee}%</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};