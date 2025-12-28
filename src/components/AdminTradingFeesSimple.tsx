import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Settings, Percent, Wallet, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface FeeSettings {
  maker_fee_percent: number;
  taker_fee_percent: number;
  admin_fee_wallet: string;
}

interface FeeStats {
  total_collected: number;
  total_trades: number;
  today_collected: number;
}

export const AdminTradingFeesSimple = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch fee settings from database
  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['trading-fee-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_engine_settings')
        .select('maker_fee_percent, taker_fee_percent, admin_fee_wallet')
        .single();
      
      if (error) throw error;
      return data as FeeSettings;
    }
  });

  // Fetch fee statistics
  const { data: feeStats } = useQuery({
    queryKey: ['trading-fee-stats'],
    queryFn: async () => {
      // Total collected
      const { data: totalData } = await supabase
        .from('trading_fees_collected')
        .select('fee_amount');
      
      const total_collected = totalData?.reduce((sum, row) => sum + Number(row.fee_amount), 0) || 0;
      const total_trades = totalData?.length || 0;

      // Today's collected
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from('trading_fees_collected')
        .select('fee_amount')
        .gte('created_at', today);
      
      const today_collected = todayData?.reduce((sum, row) => sum + Number(row.fee_amount), 0) || 0;

      return { total_collected, total_trades, today_collected } as FeeStats;
    }
  });

  const [formData, setFormData] = useState({
    maker_fee_percent: "0.5",
    taker_fee_percent: "0.5",
    admin_fee_wallet: "0x97E07a738600A6F13527fAe0Cacb0A592FbEAfB1"
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        maker_fee_percent: String(settings.maker_fee_percent),
        taker_fee_percent: String(settings.taker_fee_percent),
        admin_fee_wallet: settings.admin_fee_wallet || "0x97E07a738600A6F13527fAe0Cacb0A592FbEAfB1"
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('trading_engine_settings')
        .update({
          maker_fee_percent: parseFloat(formData.maker_fee_percent),
          taker_fee_percent: parseFloat(formData.taker_fee_percent),
          admin_fee_wallet: formData.admin_fee_wallet
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Trading fee settings updated successfully",
      });
      setDialogOpen(false);
      refetchSettings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  return (
    <div className="space-y-6">
      {/* Admin Wallet Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Admin Fee Wallet
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                All trading fees are collected to this address
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm break-all">
            {settings?.admin_fee_wallet || "0x97E07a738600A6F13527fAe0Cacb0A592FbEAfB1"}
          </div>
        </CardContent>
      </Card>

      {/* Fee Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Fee Collection Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {feeStats?.total_collected?.toFixed(4) || "0.00"}
              </div>
              <div className="text-sm text-muted-foreground">Total Collected (USDT)</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {feeStats?.today_collected?.toFixed(4) || "0.00"}
              </div>
              <div className="text-sm text-muted-foreground">Collected Today (USDT)</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {feeStats?.total_trades || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Fee Entries</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Fee Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Trading Fee Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Fee percentage applied to both buy and sell orders
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Fee Configuration</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Buy Fee (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.5"
                        value={formData.taker_fee_percent}
                        onChange={(e) => setFormData(prev => ({ ...prev, taker_fee_percent: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Fee on buy orders</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Sell Fee (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.5"
                        value={formData.maker_fee_percent}
                        onChange={(e) => setFormData(prev => ({ ...prev, maker_fee_percent: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Fee on sell orders</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Admin Fee Wallet Address</Label>
                    <Input
                      type="text"
                      placeholder="0x..."
                      value={formData.admin_fee_wallet}
                      onChange={(e) => setFormData(prev => ({ ...prev, admin_fee_wallet: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Wallet to receive collected fees</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      Save Settings
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{settings?.taker_fee_percent || 0.5}%</div>
              <div className="text-sm text-muted-foreground">Buy Fee</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{settings?.maker_fee_percent || 0.5}%</div>
              <div className="text-sm text-muted-foreground">Sell Fee</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">1.0%</div>
              <div className="text-sm text-muted-foreground">Total Per Trade</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary font-mono">
                {truncateAddress(settings?.admin_fee_wallet || '')}
              </div>
              <div className="text-sm text-muted-foreground">Fee Recipient</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Overrides Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Market Fee Overrides
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Custom fee rates for specific trading pairs (coming soon)
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Percent className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Market-specific overrides will be available in a future update</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
