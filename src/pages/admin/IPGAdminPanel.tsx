import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, Shield, Settings, Link as LinkIcon } from "lucide-react";

export default function IPGAdminPanel() {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['ipg-admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ipg_admin_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      if (settings?.id) {
        const { error } = await supabase
          .from('ipg_admin_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ipg_admin_settings')
          .insert(updates);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipg-admin-settings'] });
      toast.success('IPG settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    }
  });

  const [formData, setFormData] = useState({
    contract_address: settings?.contract_address || '0xDbcA5db00f2ADAEc2C47bBba9fFbFE21BF75864a',
    network: settings?.network || 'BEP20',
    decimals: settings?.decimals || 18,
    is_verified: settings?.is_verified ?? false,
    trading_enabled: settings?.trading_enabled ?? true,
    withdrawal_enabled: settings?.withdrawal_enabled ?? true,
    min_trade_amount: settings?.min_trade_amount || 0.001,
    notes: settings?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate contract address format
    if (!formData.contract_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Invalid contract address format');
      return;
    }
    
    updateSettings.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading IPG settings...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">IPG Admin Control Panel</h1>
            <p className="text-sm text-muted-foreground">Manage IPG cryptocurrency settings</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Smart Contract Details
              </CardTitle>
              <CardDescription>Configure IPG token contract on BSC network</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contract-address">Contract Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="contract-address"
                    value={formData.contract_address}
                    onChange={(e) => setFormData({...formData, contract_address: e.target.value})}
                    placeholder="0x..."
                    className="font-mono text-sm"
                  />
                  {formData.is_verified && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 whitespace-nowrap">
                      ✓ Verified
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  BEP20 token address on Binance Smart Chain
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="network">Network</Label>
                  <Input
                    id="network"
                    value={formData.network}
                    onChange={(e) => setFormData({...formData, network: e.target.value})}
                    disabled
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decimals">Decimals</Label>
                  <Input
                    id="decimals"
                    type="number"
                    value={formData.decimals}
                    onChange={(e) => setFormData({...formData, decimals: parseInt(e.target.value)})}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label>Contract Verified</Label>
                  <p className="text-xs text-muted-foreground">Mark contract as verified on BSCScan</p>
                </div>
                <Switch
                  checked={formData.is_verified}
                  onCheckedChange={(checked) => setFormData({...formData, is_verified: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Trading Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Trading & Withdrawal Settings
              </CardTitle>
              <CardDescription>Control IPG trading and withdrawal features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Trading</Label>
                    <p className="text-xs text-muted-foreground">Allow IPG trading on all pairs</p>
                  </div>
                  <Switch
                    checked={formData.trading_enabled}
                    onCheckedChange={(checked) => setFormData({...formData, trading_enabled: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Withdrawals</Label>
                    <p className="text-xs text-muted-foreground">Allow IPG withdrawals to external wallets</p>
                  </div>
                  <Switch
                    checked={formData.withdrawal_enabled}
                    onCheckedChange={(checked) => setFormData({...formData, withdrawal_enabled: checked})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-trade">Minimum Trade Amount (IPG)</Label>
                <Input
                  id="min-trade"
                  type="number"
                  step="0.001"
                  value={formData.min_trade_amount}
                  onChange={(e) => setFormData({...formData, min_trade_amount: parseFloat(e.target.value)})}
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Add internal notes about IPG configuration..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={updateSettings.isPending}
              className="flex-1"
            >
              {updateSettings.isPending ? 'Saving...' : 'Save IPG Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
