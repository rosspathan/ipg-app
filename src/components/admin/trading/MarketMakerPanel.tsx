import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface MarketMakerPanelProps {
  tradingPairs: Array<{ symbol: string }>;
}

export function MarketMakerPanel({ tradingPairs }: MarketMakerPanelProps) {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState('IPG/USDT');
  const [buyPrice, setBuyPrice] = useState('0.50');
  const [sellPrice, setSellPrice] = useState('0.50');
  const [buyAmount, setBuyAmount] = useState('100');
  const [sellAmount, setSellAmount] = useState('100');
  const [isSeeding, setIsSeeding] = useState(false);

  // Seed order mutation
  const seedOrderMutation = useMutation({
    mutationFn: async ({ side, amount, price }: { side: 'buy' | 'sell'; amount: number; price: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('admin_seed_market_order', {
        p_admin_id: user.id,
        p_symbol: symbol,
        p_side: side,
        p_amount: amount,
        p_price: price,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.side.toUpperCase()} order created`, {
        description: `${variables.amount} @ ${variables.price}`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error: any) => {
      toast.error('Failed to create order', {
        description: error.message,
      });
    },
  });

  // Trigger database matching function
  const triggerMatchingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('admin_trigger_matching', {
        p_symbol: symbol,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        toast.success('Matching completed', {
          description: data[0].message,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error: any) => {
      toast.error('Matching failed', {
        description: error.message,
      });
    },
  });

  const handleSeedBothSides = async () => {
    setIsSeeding(true);
    try {
      // Create buy order
      await seedOrderMutation.mutateAsync({
        side: 'buy',
        amount: parseFloat(buyAmount),
        price: parseFloat(buyPrice),
      });

      // Create sell order
      await seedOrderMutation.mutateAsync({
        side: 'sell',
        amount: parseFloat(sellAmount),
        price: parseFloat(sellPrice),
      });

      toast.success('Liquidity seeded on both sides');
    } catch (error) {
      // Individual errors already handled by mutation
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Market Maker
        </CardTitle>
        <CardDescription>
          Seed initial liquidity for trading pairs. Admin balance will be used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Symbol Selection */}
        <div className="space-y-2">
          <Label>Trading Pair</Label>
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

        {/* Buy Side */}
        <div className="p-4 border rounded-lg bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="font-medium text-green-500">Buy Side (Bids)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Price</Label>
              <Input
                type="number"
                step="0.01"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="0.50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                step="1"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-3 border-green-500/50 text-green-600 hover:bg-green-500/10"
            onClick={() =>
              seedOrderMutation.mutate({
                side: 'buy',
                amount: parseFloat(buyAmount),
                price: parseFloat(buyPrice),
              })
            }
            disabled={seedOrderMutation.isPending}
          >
            {seedOrderMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create Buy Order
          </Button>
        </div>

        {/* Sell Side */}
        <div className="p-4 border rounded-lg bg-red-500/5 border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="font-medium text-red-500">Sell Side (Asks)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Price</Label>
              <Input
                type="number"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0.50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                step="1"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-3 border-red-500/50 text-red-600 hover:bg-red-500/10"
            onClick={() =>
              seedOrderMutation.mutate({
                side: 'sell',
                amount: parseFloat(sellAmount),
                price: parseFloat(sellPrice),
              })
            }
            disabled={seedOrderMutation.isPending}
          >
            {seedOrderMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create Sell Order
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={handleSeedBothSides}
            disabled={isSeeding}
          >
            {isSeeding ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Seed Both Sides
          </Button>
          <Button
            variant="secondary"
            onClick={() => triggerMatchingMutation.mutate()}
            disabled={triggerMatchingMutation.isPending}
          >
            {triggerMatchingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Run Matching
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 To execute a trade: Create a buy order at X price and a sell order at the same or lower price.
          Then run matching. Orders from the same user won't match.
        </p>
      </CardContent>
    </Card>
  );
}
