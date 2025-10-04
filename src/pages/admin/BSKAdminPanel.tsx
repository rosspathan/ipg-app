import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Coins, Lock, Settings, TrendingUp } from "lucide-react";

export default function BSKAdminPanel() {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['bsk-admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_admin_settings')
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
          .from('bsk_admin_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bsk_admin_settings')
          .insert(updates);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-admin-settings'] });
      toast.success('BSK settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    }
  });

  const [formData, setFormData] = useState({
    daily_mint_limit: settings?.daily_mint_limit || 1000000,
    daily_burn_limit: settings?.daily_burn_limit || 1000000,
    withdrawal_enabled: settings?.withdrawal_enabled ?? true,
    withdrawal_fee_percent: settings?.withdrawal_fee_percent || 0,
    min_withdrawal_amount: settings?.min_withdrawal_amount || 10,
    max_withdrawal_amount: settings?.max_withdrawal_amount || 1000000,
    require_kyc_for_withdrawal: settings?.require_kyc_for_withdrawal ?? false,
    notes: settings?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading BSK settings...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center">
            <Coins className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">BSK Admin Control Panel</h1>
            <p className="text-sm text-muted-foreground">Manage BSK fiat currency settings</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Minting & Burning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Minting & Burning Limits
              </CardTitle>
              <CardDescription>Daily limits for BSK creation and destruction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-mint">Daily Mint Limit (BSK)</Label>
                  <Input
                    id="daily-mint"
                    type="number"
                    value={formData.daily_mint_limit}
                    onChange={(e) => setFormData({...formData, daily_mint_limit: parseFloat(e.target.value)})}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-burn">Daily Burn Limit (BSK)</Label>
                  <Input
                    id="daily-burn"
                    type="number"
                    value={formData.daily_burn_limit}
                    onChange={(e) => setFormData({...formData, daily_burn_limit: parseFloat(e.target.value)})}
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Withdrawal Settings
              </CardTitle>
              <CardDescription>Control BSK withdrawal parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Withdrawals</Label>
                  <p className="text-xs text-muted-foreground">Allow users to withdraw BSK</p>
                </div>
                <Switch
                  checked={formData.withdrawal_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, withdrawal_enabled: checked})}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-withdrawal">Min Withdrawal</Label>
                  <Input
                    id="min-withdrawal"
                    type="number"
                    value={formData.min_withdrawal_amount}
                    onChange={(e) => setFormData({...formData, min_withdrawal_amount: parseFloat(e.target.value)})}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-withdrawal">Max Withdrawal</Label>
                  <Input
                    id="max-withdrawal"
                    type="number"
                    value={formData.max_withdrawal_amount}
                    onChange={(e) => setFormData({...formData, max_withdrawal_amount: parseFloat(e.target.value)})}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdrawal-fee">Fee (%)</Label>
                  <Input
                    id="withdrawal-fee"
                    type="number"
                    step="0.01"
                    value={formData.withdrawal_fee_percent}
                    onChange={(e) => setFormData({...formData, withdrawal_fee_percent: parseFloat(e.target.value)})}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require KYC for Withdrawal</Label>
                  <p className="text-xs text-muted-foreground">Force KYC verification before withdrawals</p>
                </div>
                <Switch
                  checked={formData.require_kyc_for_withdrawal}
                  onCheckedChange={(checked) => setFormData({...formData, require_kyc_for_withdrawal: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Admin Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Add internal notes about BSK configuration..."
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
              {updateSettings.isPending ? 'Saving...' : 'Save BSK Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
