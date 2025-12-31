import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Play, RefreshCw, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { MarketMakerPanel } from '@/components/admin/trading/MarketMakerPanel';

export default function AdminTradingEngine() {
  const queryClient = useQueryClient();
  const [isMatching, setIsMatching] = useState(false);

  // Fetch engine settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['trading-engine-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_engine_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch trading pairs
  const { data: tradingPairs = [] } = useQuery({
    queryKey: ['trading-pairs-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('symbol')
        .eq('active', true);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('trading_engine_settings')
        .update(updates)
        .eq('id', settings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-engine-settings'] });
      toast.success('Settings updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update settings', {
        description: error.message,
      });
    },
  });

  // Manual matching trigger
  const triggerMatchingMutation = useMutation({
    mutationFn: async () => {
      setIsMatching(true);
      const { data, error } = await supabase.functions.invoke('match-orders');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Order matching completed', {
        description: data.message || `Matched ${data.matched} orders`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setIsMatching(false);
    },
    onError: (error: any) => {
      toast.error('Matching failed', {
        description: error.message,
      });
      setIsMatching(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Trading Engine Controls</h1>
        <p className="text-muted-foreground">
          Configure and monitor the order matching engine
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Engine Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  settings?.auto_matching_enabled && !settings?.circuit_breaker_active
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-2xl font-bold">
                {settings?.auto_matching_enabled && !settings?.circuit_breaker_active
                  ? 'Active'
                  : 'Inactive'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Matching Interval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settings?.matching_interval_seconds}s
            </div>
            <p className="text-xs text-muted-foreground">Per cycle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Fee Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-sm">
                Maker: <span className="font-bold">{settings?.maker_fee_percent}%</span>
              </div>
              <div className="text-sm">
                Taker: <span className="font-bold">{settings?.taker_fee_percent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Auto-Matching</CardTitle>
            <CardDescription>
              Enable or disable automatic order matching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-matching">Auto-matching enabled</Label>
              <Switch
                id="auto-matching"
                checked={settings?.auto_matching_enabled}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ auto_matching_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings?.matching_interval_seconds}
                onChange={(e) =>
                  updateSettingsMutation.mutate({
                    matching_interval_seconds: parseInt(e.target.value),
                  })
                }
                className="w-24"
              />
              <Label>Interval (seconds)</Label>
            </div>

            <Button
              onClick={() => triggerMatchingMutation.mutate()}
              disabled={isMatching || settings?.circuit_breaker_active}
              className="w-full"
            >
              {isMatching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matching Orders...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Trigger Manual Match
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Circuit Breaker</CardTitle>
            <CardDescription>
              Emergency stop for all trading activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <Label htmlFor="circuit-breaker">Circuit breaker active</Label>
              </div>
              <Switch
                id="circuit-breaker"
                checked={settings?.circuit_breaker_active}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ circuit_breaker_active: checked })
                }
              />
            </div>

            {settings?.circuit_breaker_active && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ All trading is currently halted
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  No orders will be matched until circuit breaker is disabled
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fee Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Configuration</CardTitle>
          <CardDescription>Set maker and taker fees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maker-fee">Maker Fee (%)</Label>
              <Input
                id="maker-fee"
                type="number"
                step="0.01"
                value={settings?.maker_fee_percent}
                onChange={(e) =>
                  updateSettingsMutation.mutate({
                    maker_fee_percent: parseFloat(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taker-fee">Taker Fee (%)</Label>
              <Input
                id="taker-fee"
                type="number"
                step="0.01"
                value={settings?.taker_fee_percent}
                onChange={(e) =>
                  updateSettingsMutation.mutate({
                    taker_fee_percent: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
          <CardDescription>Control order placement limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="max-orders">Max orders per user per minute</Label>
            <Input
              id="max-orders"
              type="number"
              value={settings?.max_orders_per_user_per_minute}
              onChange={(e) =>
                updateSettingsMutation.mutate({
                  max_orders_per_user_per_minute: parseInt(e.target.value),
                })
              }
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Market Maker Panel */}
      <div className="mt-6">
        <MarketMakerPanel tradingPairs={tradingPairs} />
      </div>
    </div>
  );
}
