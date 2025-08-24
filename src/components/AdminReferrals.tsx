import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle, Users, DollarSign } from "lucide-react";
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

interface ReferralConfig {
  id: string;
  name: string;
  description: string | null;
  levels: number;
  commission_rates: any; // JSONB field
  max_referrals_per_level: number | null;
  min_deposit_required: number;
  referrer_bonus: number;
  referee_bonus: number;
  bonus_currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConfigFormData {
  name: string;
  description: string;
  levels: number;
  commission_rates: string;
  max_referrals_per_level: number | null;
  min_deposit_required: number;
  referrer_bonus: number;
  referee_bonus: number;
  bonus_currency: string;
  is_active: boolean;
}

export function AdminReferrals() {
  const [configs, setConfigs] = useState<ReferralConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ReferralConfig | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>({
    name: "",
    description: "",
    levels: 3,
    commission_rates: "10,5,2",
    max_referrals_per_level: null,
    min_deposit_required: 0,
    referrer_bonus: 0,
    referee_bonus: 0,
    bonus_currency: "USDT",
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("referral_configs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error("Error loading referral configs:", error);
      toast({
        title: "Error",
        description: "Failed to load referral configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse commission rates
      const ratesArray = formData.commission_rates.split(',').map(rate => parseFloat(rate.trim())).filter(rate => !isNaN(rate));
      
      if (ratesArray.length !== formData.levels) {
        toast({
          title: "Error",
          description: `Commission rates must match the number of levels (${formData.levels})`,
          variant: "destructive",
        });
        return;
      }

      const configData = {
        ...formData,
        commission_rates: ratesArray,
      };

      if (editingConfig) {
        const { error } = await supabase
          .from("referral_configs")
          .update(configData)
          .eq("id", editingConfig.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Referral configuration updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("referral_configs")
          .insert([configData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Referral configuration created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingConfig(null);
      resetForm();
      loadConfigs();
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Error",
        description: "Failed to save referral configuration",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (config: ReferralConfig) => {
    setEditingConfig(config);
    const rates = Array.isArray(config.commission_rates) ? config.commission_rates.join(',') : '';
    setFormData({
      name: config.name,
      description: config.description || "",
      levels: config.levels,
      commission_rates: rates,
      max_referrals_per_level: config.max_referrals_per_level,
      min_deposit_required: config.min_deposit_required,
      referrer_bonus: config.referrer_bonus,
      referee_bonus: config.referee_bonus,
      bonus_currency: config.bonus_currency,
      is_active: config.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (config: ReferralConfig) => {
    if (!confirm(`Are you sure you want to delete the configuration "${config.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("referral_configs")
        .delete()
        .eq("id", config.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Referral configuration deleted successfully",
      });
      loadConfigs();
    } catch (error) {
      console.error("Error deleting config:", error);
      toast({
        title: "Error",
        description: "Failed to delete referral configuration",
        variant: "destructive",
      });
    }
  };

  const toggleConfigStatus = async (config: ReferralConfig) => {
    try {
      const { error } = await supabase
        .from("referral_configs")
        .update({ is_active: !config.is_active })
        .eq("id", config.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Configuration ${!config.is_active ? 'activated' : 'deactivated'} successfully`,
      });
      loadConfigs();
    } catch (error) {
      console.error("Error updating config status:", error);
      toast({
        title: "Error",
        description: "Failed to update configuration status",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      levels: 3,
      commission_rates: "10,5,2",
      max_referrals_per_level: null,
      min_deposit_required: 0,
      referrer_bonus: 0,
      referee_bonus: 0,
      bonus_currency: "USDT",
      is_active: true,
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingConfig(null);
    resetForm();
  };

  if (loading) {
    return <div>Loading referral configurations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Referrals Configuration</h2>
          <p className="text-muted-foreground">Configure multi-level referral structure and commission rates.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogClose()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Config
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingConfig ? 'Edit Configuration' : 'Create New Configuration'}</DialogTitle>
              <DialogDescription>
                {editingConfig ? 'Update the referral configuration' : 'Add a new referral program configuration'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Configuration Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Standard Referral Program"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="levels">Number of Levels</Label>
                  <Input
                    id="levels"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.levels}
                    onChange={(e) => setFormData({ ...formData, levels: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Configuration description..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commission_rates">Commission Rates (% per level, comma-separated)</Label>
                <Input
                  id="commission_rates"
                  value={formData.commission_rates}
                  onChange={(e) => setFormData({ ...formData, commission_rates: e.target.value })}
                  placeholder="10,5,2"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter {formData.levels} rates separated by commas (e.g., 10,5,2 for 10% level 1, 5% level 2, 2% level 3)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_deposit_required">Min Deposit Required</Label>
                  <Input
                    id="min_deposit_required"
                    type="number"
                    step="0.01"
                    value={formData.min_deposit_required}
                    onChange={(e) => setFormData({ ...formData, min_deposit_required: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_referrals_per_level">Max Referrals Per Level</Label>
                  <Input
                    id="max_referrals_per_level"
                    type="number"
                    value={formData.max_referrals_per_level || ""}
                    onChange={(e) => setFormData({ ...formData, max_referrals_per_level: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referrer_bonus">Referrer Bonus</Label>
                  <Input
                    id="referrer_bonus"
                    type="number"
                    step="0.01"
                    value={formData.referrer_bonus}
                    onChange={(e) => setFormData({ ...formData, referrer_bonus: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referee_bonus">Referee Bonus</Label>
                  <Input
                    id="referee_bonus"
                    type="number"
                    step="0.01"
                    value={formData.referee_bonus}
                    onChange={(e) => setFormData({ ...formData, referee_bonus: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonus_currency">Bonus Currency</Label>
                  <Select value={formData.bonus_currency} onValueChange={(value) => setFormData({ ...formData, bonus_currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="BNB">BNB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active Configuration</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingConfig ? 'Update Configuration' : 'Create Configuration'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Configurations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs.filter(c => c.is_active).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Commission Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configs.length > 0 ? 
                (configs.reduce((acc, config) => {
                  const rates = Array.isArray(config.commission_rates) ? config.commission_rates : [];
                  return acc + (rates[0] || 0);
                }, 0) / configs.length).toFixed(1) + '%' : '0%'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referral Configurations</CardTitle>
          <CardDescription>
            Manage your platform's referral program configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referral configurations found. Create your first configuration to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Levels</TableHead>
                  <TableHead>Commission Rates</TableHead>
                  <TableHead>Bonuses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-medium">{config.name}</span>
                        {config.description && (
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{config.levels} Levels</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {Array.isArray(config.commission_rates) && config.commission_rates.map((rate, index) => (
                          <div key={index} className="text-sm">
                            L{index + 1}: {rate}%
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {config.referrer_bonus > 0 && (
                          <div className="text-sm">Referrer: {config.referrer_bonus} {config.bonus_currency}</div>
                        )}
                        {config.referee_bonus > 0 && (
                          <div className="text-sm">Referee: {config.referee_bonus} {config.bonus_currency}</div>
                        )}
                        {config.referrer_bonus === 0 && config.referee_bonus === 0 && (
                          <span className="text-sm text-muted-foreground">No bonuses</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {config.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {config.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleConfigStatus(config)}
                        >
                          {config.is_active ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(config)}
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