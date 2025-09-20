import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, DollarSign, Settings, Percent } from "lucide-react";

interface TradingFeeSettings {
  id: string;
  default_maker_bps: number;
  default_taker_bps: number;
  fee_collect_asset: string;
  fee_discount_asset: string | null;
  fee_discount_tiers: any[] | null;
  min_fee: number;
  max_fee: number;
  admin_wallet_id: string | null;
}

interface FeeOverride {
  id: string;
  market_symbol: string;
  maker_bps: number | null;
  taker_bps: number | null;
  fee_collect_asset: string | null;
}

export const AdminTradingFees = () => {
  const [globalSettings, setGlobalSettings] = useState<TradingFeeSettings | null>(null);
  const [overrides, setOverrides] = useState<FeeOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<FeeOverride | null>(null);
  const { toast } = useToast();

  const [globalForm, setGlobalForm] = useState({
    default_maker_bps: '',
    default_taker_bps: '',
    fee_collect_asset: 'quote',
    fee_discount_asset: '',
    min_fee: '',
    max_fee: '',
  });

  const [overrideForm, setOverrideForm] = useState({
    market_symbol: '',
    maker_bps: '',
    taker_bps: '',
    fee_collect_asset: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [settingsResponse, overridesResponse] = await Promise.all([
        supabase.from("trading_fee_settings" as any).select("*").order("created_at", { ascending: false }).limit(1),
        supabase.from("trading_fee_overrides" as any).select("*").order("created_at", { ascending: false })
      ]);

      if (settingsResponse.error) throw settingsResponse.error;
      if (overridesResponse.error) throw overridesResponse.error;

      setGlobalSettings(settingsResponse.data?.[0] as TradingFeeSettings || null);
      setOverrides(overridesResponse.data as FeeOverride[] || []);

      if (settingsResponse.data?.[0]) {
        const settings = settingsResponse.data[0] as TradingFeeSettings;
        setGlobalForm({
          default_maker_bps: settings.default_maker_bps.toString(),
          default_taker_bps: settings.default_taker_bps.toString(),
          fee_collect_asset: settings.fee_collect_asset,
          fee_discount_asset: settings.fee_discount_asset || '',
          min_fee: settings.min_fee.toString(),
          max_fee: settings.max_fee.toString(),
        });
      }
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

  const handleSaveGlobal = async () => {
    try {
      const settingsData = {
        default_maker_bps: parseInt(globalForm.default_maker_bps),
        default_taker_bps: parseInt(globalForm.default_taker_bps),
        fee_collect_asset: globalForm.fee_collect_asset,
        fee_discount_asset: globalForm.fee_discount_asset || null,
        min_fee: parseFloat(globalForm.min_fee) || 0,
        max_fee: parseFloat(globalForm.max_fee) || 0,
        admin_wallet_id: null // TODO: Set admin wallet
      };

      let response;
      if (globalSettings) {
        response = await supabase
          .from("trading_fee_settings" as any)
          .update(settingsData)
          .eq("id", globalSettings.id);
      } else {
        response = await supabase
          .from("trading_fee_settings" as any)
          .insert([settingsData]);
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "Global fee settings updated successfully",
      });

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveOverride = async () => {
    try {
      const overrideData = {
        market_symbol: overrideForm.market_symbol,
        maker_bps: overrideForm.maker_bps ? parseInt(overrideForm.maker_bps) : null,
        taker_bps: overrideForm.taker_bps ? parseInt(overrideForm.taker_bps) : null,
        fee_collect_asset: overrideForm.fee_collect_asset || null,
      };

      let response;
      if (editingOverride) {
        response = await supabase
          .from("trading_fee_overrides" as any)
          .update(overrideData)
          .eq("id", editingOverride.id);
      } else {
        response = await supabase
          .from("trading_fee_overrides" as any)
          .insert([overrideData]);
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Fee override ${editingOverride ? 'updated' : 'created'} successfully`,
      });

      setOverrideDialogOpen(false);
      setEditingOverride(null);
      setOverrideForm({ market_symbol: '', maker_bps: '', taker_bps: '', fee_collect_asset: '' });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditOverride = (override: FeeOverride) => {
    setEditingOverride(override);
    setOverrideForm({
      market_symbol: override.market_symbol,
      maker_bps: override.maker_bps?.toString() || '',
      taker_bps: override.taker_bps?.toString() || '',
      fee_collect_asset: override.fee_collect_asset || '',
    });
    setOverrideDialogOpen(true);
  };

  const handleDeleteOverride = async (override: FeeOverride) => {
    if (!confirm(`Are you sure you want to delete fee override for ${override.market_symbol}?`)) return;

    try {
      const { error } = await supabase
        .from("trading_fee_overrides" as any)
        .delete()
        .eq("id", override.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fee override deleted successfully",
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading fee settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Global Fee Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Global Trading Fee Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Default maker/taker fees for all markets (can be overridden per market)
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  {globalSettings ? 'Edit Settings' : 'Setup Fees'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Global Fee Configuration</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Maker Fee (basis points)</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={globalForm.default_maker_bps}
                        onChange={(e) => setGlobalForm({ ...globalForm, default_maker_bps: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">10 bps = 0.10%</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Taker Fee (basis points)</Label>
                      <Input
                        type="number"
                        placeholder="15"
                        value={globalForm.default_taker_bps}
                        onChange={(e) => setGlobalForm({ ...globalForm, default_taker_bps: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">15 bps = 0.15%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Fee Collection Asset</Label>
                    <Select 
                      value={globalForm.fee_collect_asset} 
                      onValueChange={(value) => setGlobalForm({ ...globalForm, fee_collect_asset: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quote">Quote Asset (e.g., USDT in BTC/USDT)</SelectItem>
                        <SelectItem value="USDT">Always USDT</SelectItem>
                        <SelectItem value="base">Base Asset (e.g., BTC in BTC/USDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fee Discount Asset (Optional)</Label>
                    <Input
                      placeholder="BSK, IPG, etc."
                      value={globalForm.fee_discount_asset}
                      onChange={(e) => setGlobalForm({ ...globalForm, fee_discount_asset: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Users holding this asset get fee discounts</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Fee (USDT)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={globalForm.min_fee}
                        onChange={(e) => setGlobalForm({ ...globalForm, min_fee: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Fee (USDT)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={globalForm.max_fee}
                        onChange={(e) => setGlobalForm({ ...globalForm, max_fee: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveGlobal}>
                      Save Settings
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {globalSettings ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{globalSettings.default_maker_bps}</div>
                <div className="text-sm text-muted-foreground">Maker Fee (bps)</div>
                <div className="text-xs text-muted-foreground">{(globalSettings.default_maker_bps / 100).toFixed(2)}%</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{globalSettings.default_taker_bps}</div>
                <div className="text-sm text-muted-foreground">Taker Fee (bps)</div>
                <div className="text-xs text-muted-foreground">{(globalSettings.default_taker_bps / 100).toFixed(2)}%</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-primary">{globalSettings.fee_collect_asset}</div>
                <div className="text-sm text-muted-foreground">Collection Asset</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-primary">{globalSettings.fee_discount_asset || 'None'}</div>
                <div className="text-sm text-muted-foreground">Discount Asset</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No global fee settings configured</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market-Specific Overrides */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Market Fee Overrides
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Custom fee rates for specific trading pairs
              </p>
            </div>
            <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingOverride(null);
                  setOverrideForm({ market_symbol: '', maker_bps: '', taker_bps: '', fee_collect_asset: '' });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Override
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingOverride ? 'Edit Fee Override' : 'Create Fee Override'}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Market Symbol</Label>
                    <Input
                      placeholder="BTC/USDT, ETH/USDT, etc."
                      value={overrideForm.market_symbol}
                      onChange={(e) => setOverrideForm({ ...overrideForm, market_symbol: e.target.value })}
                      disabled={!!editingOverride}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Maker Fee (bps)</Label>
                      <Input
                        type="number"
                        placeholder="Leave empty to use global"
                        value={overrideForm.maker_bps}
                        onChange={(e) => setOverrideForm({ ...overrideForm, maker_bps: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Taker Fee (bps)</Label>
                      <Input
                        type="number"
                        placeholder="Leave empty to use global"
                        value={overrideForm.taker_bps}
                        onChange={(e) => setOverrideForm({ ...overrideForm, taker_bps: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Fee Collection Asset (Optional)</Label>
                    <Select 
                      value={overrideForm.fee_collect_asset} 
                      onValueChange={(value) => setOverrideForm({ ...overrideForm, fee_collect_asset: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Use global setting" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Use Global Setting</SelectItem>
                        <SelectItem value="quote">Quote Asset</SelectItem>
                        <SelectItem value="USDT">Always USDT</SelectItem>
                        <SelectItem value="base">Base Asset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveOverride}>
                      {editingOverride ? 'Update' : 'Create'} Override
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <div className="text-center py-8">
              <Percent className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No market-specific overrides configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overrides.map((override) => (
                <div key={override.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="font-mono">
                      {override.market_symbol}
                    </Badge>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Maker:</span> {override.maker_bps || 'Global'} bps
                      <span className="ml-4 text-muted-foreground">Taker:</span> {override.taker_bps || 'Global'} bps
                    </div>
                    {override.fee_collect_asset && (
                      <Badge variant="secondary">
                        {override.fee_collect_asset}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditOverride(override)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteOverride(override)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};