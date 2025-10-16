import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCatalog } from '@/hooks/useCatalog';
import { useFX } from '@/hooks/useFX';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SwapRoute {
  type: 'direct' | '2hop';
  fromAsset: string;
  toAsset: string;
  intermediateAsset?: string;
  estimatedRate: number;
  platformFee: number;
  tradingFees: number;
  totalFees: number;
}

export default function SwapScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { assetsList, pairsList } = useCatalog();
  const { convert, formatCurrency } = useFX();

  const [fromAsset, setFromAsset] = useState<string>('');
  const [toAsset, setToAsset] = useState<string>('');
  const [fromAmount, setFromAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [isSwapping, setIsSwapping] = useState(false);

  // Filter tradeable assets
  const tradeableAssets = assetsList.filter(asset => 
    asset.is_active && asset.trading_enabled && asset.symbol !== 'INR'
  );

  // Calculate swap route and rates
  const swapRoute = useMemo((): SwapRoute | null => {
    if (!fromAsset || !toAsset || !fromAmount || parseFloat(fromAmount) <= 0) {
      return null;
    }

    const amount = parseFloat(fromAmount);
    
    // Check for direct pair
    const directPair = pairsList.find(pair => 
      (pair.base_symbol === fromAsset && pair.quote_symbol === toAsset) ||
      (pair.base_symbol === toAsset && pair.quote_symbol === fromAsset)
    );

    if (directPair) {
      // Use static rate for MVP
      const rate = convert(1, fromAsset, toAsset);
      const platformFee = amount * 0.001; // 0.1% platform fee
      const tradingFees = amount * 0.001; // 0.1% trading fee
      
      return {
        type: 'direct',
        fromAsset,
        toAsset,
        estimatedRate: rate,
        platformFee,
        tradingFees,
        totalFees: platformFee + tradingFees
      };
    }

    // Check for 2-hop via USDT
    const fromToUSDT = pairsList.find(pair => 
      (pair.base_symbol === fromAsset && pair.quote_symbol === 'USDT') ||
      (pair.base_symbol === 'USDT' && pair.quote_symbol === fromAsset)
    );

    const USDTToTarget = pairsList.find(pair => 
      (pair.base_symbol === 'USDT' && pair.quote_symbol === toAsset) ||
      (pair.base_symbol === toAsset && pair.quote_symbol === 'USDT')
    );

    if (fromToUSDT && USDTToTarget) {
      const rate = convert(1, fromAsset, toAsset);
      const platformFee = amount * 0.0015; // 0.15% for 2-hop
      const tradingFees = amount * 0.002; // 0.2% for 2 trades
      
      return {
        type: '2hop',
        fromAsset,
        toAsset,
        intermediateAsset: 'USDT',
        estimatedRate: rate,
        platformFee,
        tradingFees,
        totalFees: platformFee + tradingFees
      };
    }

    return null;
  }, [fromAsset, toAsset, fromAmount, pairsList, convert]);

  const estimatedReceive = useMemo(() => {
    if (!swapRoute || !fromAmount) return 0;
    const amount = parseFloat(fromAmount);
    return (amount * swapRoute.estimatedRate) - swapRoute.totalFees;
  }, [swapRoute, fromAmount]);

  const minReceive = useMemo(() => {
    if (!estimatedReceive) return 0;
    return estimatedReceive * (1 - slippage / 100);
  }, [estimatedReceive, slippage]);

  const handleSwap = async () => {
    if (!user || !swapRoute || !fromAmount) {
      toast({
        title: "Error",
        description: "Please check all fields and try again",
        variant: "destructive"
      });
      return;
    }

    setIsSwapping(true);
    
    try {
      const amount = parseFloat(fromAmount);
      
      // Create swap record
      const { data: swap, error: swapError } = await supabase
        .from('swaps')
        .insert({
          user_id: user.id,
          from_asset: fromAsset,
          to_asset: toAsset,
          from_amount: amount,
          to_amount: estimatedReceive,
          estimated_rate: swapRoute.estimatedRate,
          route_type: swapRoute.type,
          intermediate_asset: swapRoute.intermediateAsset,
          slippage_percent: slippage,
          min_receive: minReceive,
          platform_fee: swapRoute.platformFee,
          trading_fees: swapRoute.tradingFees,
          total_fees: swapRoute.totalFees,
          status: 'pending'
        })
        .select()
        .single();

      if (swapError) throw swapError;

      // Execute swap via edge function
      const { data: executeResult, error: executeError } = await supabase.functions.invoke('execute-swap', {
        body: { swap_id: swap.id }
      });

      if (executeError) {
        console.warn('Edge function not available, swap created but not executed');
      }

      if (executeResult?.success) {
        toast({
          title: "Swap Completed ✓",
          description: `Successfully swapped ${executeResult.from_amount} ${executeResult.from_asset} for ${Number(executeResult.to_amount).toFixed(6)} ${executeResult.to_asset}`,
          className: "bg-success/10 border-success/50 text-success",
        });
        
        // Reset and navigate
        setFromAmount("");
        setTimeout(() => {
          navigate("/app/wallet");
        }, 1500);
      } else {
        toast({
          title: "Swap Initiated",
          description: `Swapping ${amount} ${fromAsset} for ${toAsset}`,
        });
        navigate(`/app/wallet`);
      }
      
    } catch (error: any) {
      console.error('Swap error:', error);
      toast({
        title: "Swap Failed",
        description: error.message || "Failed to execute swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleMaxAmount = () => {
    // In a real app, this would get the user's balance for the selected asset
    setFromAmount('1000'); // Mock value
  };

  const swapAssets = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setFromAmount('');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">Swap</h1>
          <div className="w-10" />
        </div>

        {/* Swap Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Exchange Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* From Asset */}
            <div className="space-y-2">
              <Label>From</Label>
              <div className="flex gap-2">
                <Select value={fromAsset} onValueChange={setFromAsset}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradeableAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.symbol}>
                        {asset.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs"
                    onClick={handleMaxAmount}
                  >
                    MAX
                  </Button>
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={swapAssets}
                disabled={!fromAsset || !toAsset}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* To Asset */}
            <div className="space-y-2">
              <Label>To</Label>
              <div className="flex gap-2">
                <Select value={toAsset} onValueChange={setToAsset}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradeableAssets
                      .filter(asset => asset.symbol !== fromAsset)
                      .map((asset) => (
                        <SelectItem key={asset.id} value={asset.symbol}>
                          {asset.symbol}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={estimatedReceive.toFixed(6)}
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Slippage */}
            <div className="space-y-2">
              <Label>Slippage Tolerance (%)</Label>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0, 2.0].map((value) => (
                  <Button
                    key={value}
                    variant={slippage === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSlippage(value)}
                  >
                    {value}%
                  </Button>
                ))}
                <Input
                  type="number"
                  className="w-20"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                  min={0.1}
                  max={10}
                  step={0.1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Information */}
        {swapRoute && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <div className="flex items-center gap-2">
                  <Badge variant={swapRoute.type === 'direct' ? 'default' : 'secondary'}>
                    {swapRoute.type === 'direct' ? 'Direct' : '2-Hop via USDT'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span>1 {fromAsset} = {swapRoute.estimatedRate.toFixed(6)} {toAsset}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Receive</span>
                <span>{estimatedReceive.toFixed(6)} {toAsset}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum Receive</span>
                <span>{minReceive.toFixed(6)} {toAsset}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span>{formatCurrency(swapRoute.platformFee)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trading Fees</span>
                <span>{formatCurrency(swapRoute.tradingFees)}</span>
              </div>

              <div className="flex justify-between font-medium">
                <span>Total Fees</span>
                <span>{formatCurrency(swapRoute.totalFees)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Swap Button */}
        <Button
          className="w-full h-12"
          onClick={handleSwap}
          disabled={!swapRoute || !fromAmount || parseFloat(fromAmount) <= 0 || isSwapping}
        >
          {isSwapping ? 'Swapping...' : !swapRoute ? 'Route Unavailable' : 'Review Swap'}
        </Button>

        {!swapRoute && fromAsset && toAsset && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            No trading route available for {fromAsset} → {toAsset}
          </p>
        )}
      </div>
    </div>
  );
}