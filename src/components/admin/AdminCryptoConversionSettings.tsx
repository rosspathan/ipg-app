import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CryptoSetting {
  id: string;
  crypto_symbol: string;
  crypto_name: string;
  admin_wallet_address: string;
  network: string;
  conversion_rate_bsk: number;
  min_amount: number;
  max_amount: number;
  fee_percent: number;
  fee_fixed: number;
  is_active: boolean;
  instructions: string;
}

export function AdminCryptoConversionSettings() {
  const [settings, setSettings] = useState<CryptoSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    crypto_symbol: "",
    crypto_name: "",
    admin_wallet_address: "",
    network: "",
    conversion_rate_bsk: "",
    min_amount: "",
    max_amount: "",
    fee_percent: "",
    fee_fixed: "",
    is_active: true,
    instructions: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("crypto_conversion_settings")
        .select("*")
        .order("crypto_name");

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: CryptoSetting) => {
    setEditingId(setting.id);
    setFormData({
      crypto_symbol: setting.crypto_symbol,
      crypto_name: setting.crypto_name,
      admin_wallet_address: setting.admin_wallet_address,
      network: setting.network,
      conversion_rate_bsk: setting.conversion_rate_bsk.toString(),
      min_amount: setting.min_amount.toString(),
      max_amount: setting.max_amount.toString(),
      fee_percent: setting.fee_percent.toString(),
      fee_fixed: setting.fee_fixed.toString(),
      is_active: setting.is_active,
      instructions: setting.instructions || "",
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      crypto_symbol: "",
      crypto_name: "",
      admin_wallet_address: "",
      network: "",
      conversion_rate_bsk: "1",
      min_amount: "0.01",
      max_amount: "1000",
      fee_percent: "0",
      fee_fixed: "0",
      is_active: true,
      instructions: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        crypto_symbol: formData.crypto_symbol,
        crypto_name: formData.crypto_name,
        admin_wallet_address: formData.admin_wallet_address,
        network: formData.network,
        conversion_rate_bsk: parseFloat(formData.conversion_rate_bsk),
        min_amount: parseFloat(formData.min_amount),
        max_amount: parseFloat(formData.max_amount),
        fee_percent: parseFloat(formData.fee_percent),
        fee_fixed: parseFloat(formData.fee_fixed),
        is_active: formData.is_active,
        instructions: formData.instructions,
        created_by: user.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("crypto_conversion_settings")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("crypto_conversion_settings")
          .insert(payload);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Settings ${editingId ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      loadSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading settings...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Crypto Wallet Settings</CardTitle>
            <CardDescription>
              Configure admin wallet addresses and conversion rates for each cryptocurrency
            </CardDescription>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Crypto
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Rate (BSK)</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No crypto settings configured
                    </TableCell>
                  </TableRow>
                ) : (
                  settings.map((setting) => (
                    <TableRow key={setting.id}>
                      <TableCell className="font-medium">
                        {setting.crypto_name} ({setting.crypto_symbol})
                      </TableCell>
                      <TableCell>{setting.network}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {setting.admin_wallet_address}
                      </TableCell>
                      <TableCell>{setting.conversion_rate_bsk}</TableCell>
                      <TableCell>{setting.is_active ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(setting)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Crypto Settings</DialogTitle>
            <DialogDescription>
              Configure wallet address and conversion parameters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Crypto Symbol *</Label>
                <Input
                  value={formData.crypto_symbol}
                  onChange={(e) => setFormData({ ...formData, crypto_symbol: e.target.value })}
                  placeholder="BTC"
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-2">
                <Label>Crypto Name *</Label>
                <Input
                  value={formData.crypto_name}
                  onChange={(e) => setFormData({ ...formData, crypto_name: e.target.value })}
                  placeholder="Bitcoin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Network *</Label>
              <Input
                value={formData.network}
                onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                placeholder="Bitcoin Mainnet, BEP20, ERC20, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Admin Wallet Address *</Label>
              <Input
                value={formData.admin_wallet_address}
                onChange={(e) => setFormData({ ...formData, admin_wallet_address: e.target.value })}
                placeholder="Wallet address for receiving payments"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conversion Rate (BSK per 1 crypto) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.conversion_rate_bsk}
                  onChange={(e) => setFormData({ ...formData, conversion_rate_bsk: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Amount *</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={formData.min_amount}
                  onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                  placeholder="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Max Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.max_amount}
                  onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label>Fee Percent</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fee_percent}
                  onChange={(e) => setFormData({ ...formData, fee_percent: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Fee Fixed (BSK)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fee_fixed}
                  onChange={(e) => setFormData({ ...formData, fee_fixed: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Instructions</Label>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Instructions for users..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
