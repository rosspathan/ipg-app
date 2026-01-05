import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Bot, RefreshCw, PowerOff, Power, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MarketMakerPanelProps {
  tradingPairs: Array<{ symbol: string }>;
}

export function MarketMakerPanel({ tradingPairs }: MarketMakerPanelProps) {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState('IPG/USDT');
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch current market maker settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
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

  const handleSetup = async () => {
    setLoading('setup');
    try {
      const { data, error } = await supabase.functions.invoke('admin-setup-market-maker', {
        body: { action: 'setup_and_seed' }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Market Maker Setup Complete', {
          description: `Bot user created and orders seeded. ID: ${data.marketMakerUserId?.slice(0, 8)}...`,
        });
        queryClient.invalidateQueries({ queryKey: ['trading-engine-settings'] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      } else {
        throw new Error(data?.error || 'Setup failed');
      }
    } catch (error: any) {
      toast.error('Setup Failed', { description: error.message });
    } finally {
      setLoading(null);
    }
  };

  const handleSeed = async () => {
    setLoading('seed');
    try {
      const { data, error } = await supabase.functions.invoke('seed-market-maker');

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Orders Seeded', {
          description: `Created ${data.ordersCreated} market maker orders`,
        });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      } else {
        throw new Error(data?.message || data?.error || 'Seeding failed');
      }
    } catch (error: any) {
      toast.error('Seed Failed', { description: error.message });
    } finally {
      setLoading(null);
    }
  };

  const handleDisable = async () => {
    setLoading('disable');
    try {
      const { data, error } = await supabase.functions.invoke('admin-setup-market-maker', {
        body: { action: 'disable' }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Market Maker Disabled', {
          description: 'All pending orders cancelled and funds unlocked',
        });
        queryClient.invalidateQueries({ queryKey: ['trading-engine-settings'] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      } else {
        throw new Error(data?.error || 'Disable failed');
      }
    } catch (error: any) {
      toast.error('Disable Failed', { description: error.message });
    } finally {
      setLoading(null);
    }
  };

  const isEnabled = settings?.market_maker_enabled;
  const hasUserId = !!settings?.market_maker_user_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Market Maker Bot
        </CardTitle>
        <CardDescription>
          Automated liquidity provider with dedicated virtual funds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            {settingsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEnabled ? (
              <Badge variant="default" className="bg-green-600 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Disabled
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Bot User</span>
            {settingsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasUserId ? (
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {settings.market_maker_user_id?.slice(0, 8)}...
              </code>
            ) : (
              <span className="text-xs text-muted-foreground">Not created</span>
            )}
          </div>

          {settings && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Spread</span>
                <span className="text-sm">{settings.market_maker_spread_percent}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Depth Levels</span>
                <span className="text-sm">{settings.market_maker_depth_levels}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Order Size</span>
                <span className="text-sm">{settings.market_maker_order_size}</span>
              </div>
            </>
          )}
        </div>

        {/* Symbol Selection */}
        <div className="space-y-2">
          <Label>Trading Pair (for seeding)</Label>
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IPG/USDT">IPG/USDT</SelectItem>
              {tradingPairs
                .filter((p) => p.symbol !== 'IPG/USDT')
                .map((pair) => (
                  <SelectItem key={pair.symbol} value={pair.symbol}>
                    {pair.symbol}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {!hasUserId ? (
            <Button
              className="w-full gap-2"
              onClick={handleSetup}
              disabled={loading !== null}
            >
              {loading === 'setup' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              Setup Market Maker Bot
            </Button>
          ) : (
            <>
              <Button
                className="w-full gap-2"
                onClick={handleSeed}
                disabled={loading !== null}
              >
                {loading === 'seed' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Seed Orders Now
              </Button>
              
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleDisable}
                disabled={loading !== null}
              >
                {loading === 'disable' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PowerOff className="h-4 w-4" />
                )}
                Disable Market Maker
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          💡 The bot uses a dedicated system user with virtual funds. Setup creates the user, funds it (1M IPG + 1M USDT), and seeds initial orders.
        </p>
      </CardContent>
    </Card>
  );
}
