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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, DollarSign, TrendingUp, Users, Coins, Settings } from "lucide-react";

interface FeeConfig {
  id: string;
  fee_type: string;
  user_tier: string | null;
  asset_id: string | null;
  pair_id: string | null;
  fee_percentage: number | null;
  fixed_fee: number | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

interface Asset {
  id: string;
  symbol: string;
  name: string;
}

interface TradingPair {
  id: string;
  symbol: string;
}

export const AdminFees = () => {
  const [fees, setFees] = useState<FeeConfig[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeConfig | null>(null);
  const [activeTab, setActiveTab] = useState("trading");
  const [formData, setFormData] = useState({
    fee_type: "",
    user_tier: "standard",
    asset_id: "",
    pair_id: "",
    fee_percentage: "",
    fixed_fee: "",
    active: true,
  });
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [feesResponse, assetsResponse, pairsResponse] = await Promise.all([
        supabase.from("fee_configs").select("*").order("created_at", { ascending: false }),
        supabase.from("assets").select("id, symbol, name").eq("is_active", true),
        supabase.from("trading_pairs").select("id, symbol").eq("active", true)
      ]);

      if (feesResponse.error) throw feesResponse.error;
      if (assetsResponse.error) throw assetsResponse.error;
      if (pairsResponse.error) throw pairsResponse.error;

      setFees(feesResponse.data || []);
      setAssets(assetsResponse.data || []);
      setPairs(pairsResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading fee data",
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
      fee_type: "",
      user_tier: "standard",
      asset_id: "",
      pair_id: "",
      fee_percentage: "",
      fixed_fee: "",
      active: true,
    });
    setEditingFee(null);
  };

  const handleEdit = (fee: FeeConfig) => {
    setEditingFee(fee);
    setFormData({
      fee_type: fee.fee_type,
      user_tier: fee.user_tier || "standard",
      asset_id: fee.asset_id || "",
      pair_id: fee.pair_id || "",
      fee_percentage: fee.fee_percentage?.toString() || "",
      fixed_fee: fee.fixed_fee?.toString() || "",
      active: fee.active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const feeData = {
        fee_type: formData.fee_type,
        user_tier: formData.user_tier,
        asset_id: formData.asset_id || null,
        pair_id: formData.pair_id || null,
        fee_percentage: formData.fee_percentage ? parseFloat(formData.fee_percentage) : null,
        fixed_fee: formData.fixed_fee ? parseFloat(formData.fixed_fee) : null,
        active: formData.active,
      };

      let response;
      if (editingFee) {
        response = await supabase
          .from("fee_configs")
          .update(feeData)
          .eq("id", editingFee.id);

        await supabase.rpc("log_admin_action", {
          p_action: "update_fee_config",
          p_resource_type: "fee_configs",
          p_resource_id: editingFee.id,
          p_old_values: JSON.parse(JSON.stringify(editingFee)),
          p_new_values: JSON.parse(JSON.stringify({ ...editingFee, ...feeData })),
        });
      } else {
        response = await supabase.from("fee_configs").insert([feeData]);

        await supabase.rpc("log_admin_action", {
          p_action: "create_fee_config",
          p_resource_type: "fee_configs",
          p_new_values: JSON.parse(JSON.stringify(feeData)),
        });
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Fee configuration ${editingFee ? "updated" : "created"} successfully`,
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

  const handleToggleActive = async (fee: FeeConfig) => {
    try {
      const { error } = await supabase
        .from("fee_configs")
        .update({ active: !fee.active })
        .eq("id", fee.id);

      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: fee.active ? "deactivate_fee_config" : "activate_fee_config",
        p_resource_type: "fee_configs",
        p_resource_id: fee.id,
        p_old_values: JSON.parse(JSON.stringify(fee)),
        p_new_values: JSON.parse(JSON.stringify({ ...fee, active: !fee.active })),
      });

      toast({
        title: "Success",
        description: `Fee configuration ${fee.active ? "deactivated" : "activated"} successfully`,
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

  const handleDelete = async (fee: FeeConfig) => {
    if (!confirm("Are you sure you want to delete this fee configuration?")) return;

    try {
      const { error } = await supabase.from("fee_configs").delete().eq("id", fee.id);

      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "delete_fee_config",
        p_resource_type: "fee_configs",
        p_resource_id: fee.id,
        p_old_values: JSON.parse(JSON.stringify(fee)),
      });

      toast({
        title: "Success",
        description: "Fee configuration deleted successfully",
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

  const getAssetSymbol = (assetId: string | null) => {
    if (!assetId) return "All Assets";
    const asset = assets.find(a => a.id === assetId);
    return asset?.symbol || "Unknown";
  };

  const getPairSymbol = (pairId: string | null) => {
    if (!pairId) return "All Pairs";
    const pair = pairs.find(p => p.id === pairId);
    return pair?.symbol || "Unknown";
  };

  const filterFeesByType = (feeType: string) => {
    return fees.filter(fee => fee.fee_type === feeType);
  };

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case "standard": return "secondary";
      case "premium": return "default";
      case "vip": return "destructive";
      default: return "outline";
    }
  };

  const formatFee = (fee: FeeConfig) => {
    const parts = [];
    if (fee.fee_percentage) parts.push(`${fee.fee_percentage}%`);
    if (fee.fixed_fee) parts.push(`${fee.fixed_fee} USDT`);
    return parts.join(" + ") || "Free";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading fee configurations...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fees & Revenue Configuration
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure platform fee structures and revenue settings
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Config
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingFee ? "Edit Fee Configuration" : "Create New Fee Configuration"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fee_type">Fee Type</Label>
                  <Select
                    value={formData.fee_type}
                    onValueChange={(value) => setFormData({ ...formData, fee_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trading_maker">Trading Maker Fee</SelectItem>
                      <SelectItem value="trading_taker">Trading Taker Fee</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal Fee</SelectItem>
                      <SelectItem value="deposit">Deposit Fee</SelectItem>
                      <SelectItem value="transfer">Transfer Fee</SelectItem>
                      <SelectItem value="staking">Staking Fee</SelectItem>
                      <SelectItem value="subscription">Subscription Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_tier">User Tier</Label>
                  <Select
                    value={formData.user_tier}
                    onValueChange={(value) => setFormData({ ...formData, user_tier: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.fee_type === "withdrawal" || formData.fee_type === "deposit") && (
                  <div className="space-y-2">
                    <Label htmlFor="asset_id">Asset (optional)</Label>
                    <Select
                      value={formData.asset_id}
                      onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All assets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Assets</SelectItem>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.symbol} - {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(formData.fee_type === "trading_maker" || formData.fee_type === "trading_taker") && (
                  <div className="space-y-2">
                    <Label htmlFor="pair_id">Trading Pair (optional)</Label>
                    <Select
                      value={formData.pair_id}
                      onValueChange={(value) => setFormData({ ...formData, pair_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All pairs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Pairs</SelectItem>
                        {pairs.map((pair) => (
                          <SelectItem key={pair.id} value={pair.id}>
                            {pair.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fee_percentage">Fee Percentage (%)</Label>
                    <Input
                      id="fee_percentage"
                      type="number"
                      step="0.001"
                      min="0"
                      max="100"
                      value={formData.fee_percentage}
                      onChange={(e) => setFormData({ ...formData, fee_percentage: e.target.value })}
                      placeholder="e.g., 0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fixed_fee">Fixed Fee (USDT)</Label>
                    <Input
                      id="fixed_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.fixed_fee}
                      onChange={(e) => setFormData({ ...formData, fixed_fee: e.target.value })}
                      placeholder="e.g., 5"
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
                    {editingFee ? "Update" : "Create"} Configuration
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trading">Trading Fees</TabsTrigger>
            <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="other">Other Fees</TabsTrigger>
          </TabsList>

          <TabsContent value="trading" className="space-y-4">
            <div className="space-y-4">
              {["trading_maker", "trading_taker"].map(feeType => {
                const typeFees = filterFeesByType(feeType);
                return (
                  <div key={feeType}>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {feeType === "trading_maker" ? "Maker Fees" : "Taker Fees"} ({typeFees.length})
                    </h4>
                    {typeFees.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No {feeType} configurations found.</p>
                    ) : (
                      <div className="space-y-2">
                        {typeFees.map((fee) => (
                          <div key={fee.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant={getTierColor(fee.user_tier)}>
                                  {fee.user_tier?.toUpperCase() || "ALL"}
                                </Badge>
                                <span className="text-sm">{getPairSymbol(fee.pair_id)}</span>
                                <span className="font-semibold">{formatFee(fee)}</span>
                                <Badge variant={fee.active ? "default" : "secondary"}>
                                  {fee.active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={fee.active ?? false}
                                  onCheckedChange={() => handleToggleActive(fee)}
                                />
                                <Button variant="outline" size="sm" onClick={() => handleEdit(fee)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(fee)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="withdrawal" className="space-y-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Withdrawal Fees ({filterFeesByType("withdrawal").length})
            </h4>
            <div className="space-y-2">
              {filterFeesByType("withdrawal").map((fee) => (
                <div key={fee.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={getTierColor(fee.user_tier)}>
                        {fee.user_tier?.toUpperCase() || "ALL"}
                      </Badge>
                      <span className="text-sm">{getAssetSymbol(fee.asset_id)}</span>
                      <span className="font-semibold">{formatFee(fee)}</span>
                      <Badge variant={fee.active ? "default" : "secondary"}>
                        {fee.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={fee.active ?? false}
                        onCheckedChange={() => handleToggleActive(fee)}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleEdit(fee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(fee)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="deposit" className="space-y-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Deposit Fees ({filterFeesByType("deposit").length})
            </h4>
            <div className="space-y-2">
              {filterFeesByType("deposit").map((fee) => (
                <div key={fee.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={getTierColor(fee.user_tier)}>
                        {fee.user_tier?.toUpperCase() || "ALL"}
                      </Badge>
                      <span className="text-sm">{getAssetSymbol(fee.asset_id)}</span>
                      <span className="font-semibold">{formatFee(fee)}</span>
                      <Badge variant={fee.active ? "default" : "secondary"}>
                        {fee.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={fee.active ?? false}
                        onCheckedChange={() => handleToggleActive(fee)}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleEdit(fee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(fee)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Other Platform Fees ({fees.filter(f => !["trading_maker", "trading_taker", "withdrawal", "deposit"].includes(f.fee_type)).length})
            </h4>
            <div className="space-y-2">
              {fees.filter(f => !["trading_maker", "trading_taker", "withdrawal", "deposit"].includes(f.fee_type)).map((fee) => (
                <div key={fee.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{fee.fee_type.replace("_", " ").toUpperCase()}</Badge>
                      <Badge variant={getTierColor(fee.user_tier)}>
                        {fee.user_tier?.toUpperCase() || "ALL"}
                      </Badge>
                      <span className="font-semibold">{formatFee(fee)}</span>
                      <Badge variant={fee.active ? "default" : "secondary"}>
                        {fee.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={fee.active ?? false}
                        onCheckedChange={() => handleToggleActive(fee)}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleEdit(fee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(fee)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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