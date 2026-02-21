import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, TrendingUp, Clock, AlertTriangle, ChevronRight, RefreshCw, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useCatalog } from '@/hooks/useCatalog';
import { useAuth } from '@/hooks/useAuth';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function SwapScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { assetsList } = useCatalog();

  const [fromAsset, setFromAsset] = useState<string>('');
  const [toAsset, setToAsset] = useState<string>('');
  const [fromAmount, setFromAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filter tradeable assets
  const tradeableAssets = useMemo(() =>
    assetsList.filter(asset => asset.is_active && asset.trading_enabled && asset.symbol !== 'INR'),
    [assetsList]
  );

  // Real-time quote from market_prices
  const quote = useSwapQuote(fromAsset, toAsset, fromAmount, slippage);

  const amount = parseFloat(fromAmount) || 0;
  const insufficientBalance = amount > 0 && amount > quote.fromBalance;

  const handleMaxAmount = useCallback(() => {
    if (quote.fromBalance > 0) {
      setFromAmount(quote.fromBalance.toString());
    }
  }, [quote.fromBalance]);

  const swapAssets = useCallback(() => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setFromAmount('');
  }, [fromAsset, toAsset]);

  const handleReviewSwap = () => {
    if (!quote.routeAvailable || amount <= 0 || insufficientBalance) return;
    setShowConfirmation(true);
  };

  const handleConfirmSwap = async () => {
    if (!user || !quote.route || !fromAmount) return;

    setShowConfirmation(false);
    setIsSwapping(true);

    try {
      const idempotencyKey = `swap:${user.id}:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;

      const { data: result, error: invokeError } = await supabase.functions.invoke('execute-swap', {
        body: {
          from_asset: fromAsset,
          to_asset: toAsset,
          from_amount: amount,
          expected_rate: quote.route.rate,
          slippage_percent: slippage,
          min_receive: quote.minReceive,
          idempotency_key: idempotencyKey,
        },
      });

      if (invokeError) throw invokeError;

      if (result?.error) {
        if (result.error === 'SLIPPAGE_EXCEEDED') {
          toast({
            title: "Price Changed",
            description: result.message || "Price moved beyond your slippage tolerance. Quote refreshed.",
            variant: "destructive",
          });
          quote.refreshQuote();
          return;
        }
        if (result.error === 'INSUFFICIENT_BALANCE') {
          toast({ title: "Insufficient Balance", description: result.message, variant: "destructive" });
          return;
        }
        throw new Error(result.message || result.error);
      }

      if (result?.success) {
        toast({
          title: "Swap Completed ✓",
          description: `Swapped ${result.from_amount} ${result.from_asset} → ${Number(result.to_amount).toFixed(6)} ${result.to_asset}`,
          className: "bg-success/10 border-success/50 text-success",
        });
        setFromAmount('');
        quote.refreshQuote();
        setTimeout(() => navigate('/app/wallet'), 1500);
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      toast({
        title: "Swap Failed",
        description: error.message || "Failed to execute swap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
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
          <Button variant="ghost" size="icon" onClick={quote.refreshQuote}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>

        {/* Swap Card */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Exchange Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* From Asset */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground">From</Label>
                {fromAsset && (
                  <span className="text-xs text-muted-foreground">
                    Balance:{' '}
                    {quote.isLoadingBalance ? (
                      <Loader2 className="inline h-3 w-3 animate-spin" />
                    ) : (
                      <span className="font-medium text-foreground">
                        {quote.fromBalance.toFixed(4)} {fromAsset}
                      </span>
                    )}
                  </span>
                )}
              </div>
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
                    className={insufficientBalance ? 'border-destructive' : ''}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs text-primary"
                    onClick={handleMaxAmount}
                    disabled={!fromAsset || quote.fromBalance <= 0}
                  >
                    MAX
                  </Button>
                </div>
              </div>
              {insufficientBalance && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Insufficient balance
                </p>
              )}
            </div>

            {/* Swap Direction Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={swapAssets}
                disabled={!fromAsset || !toAsset}
                className="rounded-full border-2"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* To Asset */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">To</Label>
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
                    type="text"
                    placeholder="0.00"
                    value={quote.estimatedOutput > 0 ? quote.estimatedOutput.toFixed(6) : ''}
                    disabled
                    className="bg-muted/50"
                  />
                </div>
              </div>
            </div>

            {/* Slippage */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Slippage Tolerance</Label>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0, 2.0].map((value) => (
                  <Button
                    key={value}
                    variant={slippage === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSlippage(value)}
                    className="text-xs"
                  >
                    {value}%
                  </Button>
                ))}
                <Input
                  type="number"
                  className="w-20 text-sm"
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

        {/* Quote Details */}
        {quote.routeAvailable && amount > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-4 space-y-3">
              {/* Quote countdown */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Quote refreshes in
                </div>
                <Badge variant={quote.secondsRemaining <= 5 ? "destructive" : "secondary"} className="text-xs">
                  {quote.secondsRemaining}s
                </Badge>
              </div>

              <Separator />

              {/* Route */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Route</span>
                <div className="flex items-center gap-1.5">
                  {quote.route?.path.map((step, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs font-medium">
                        {step}
                      </Badge>
                      {i < (quote.route?.path.length || 0) - 1 && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rate */}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rate</span>
                <span className="text-sm font-medium">
                  1 {fromAsset} = {quote.route?.rate.toFixed(6)} {toAsset}
                </span>
              </div>

              {/* Estimated Receive */}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Estimated Receive</span>
                <span className="text-sm font-medium">
                  {quote.estimatedOutput.toFixed(6)} {toAsset}
                </span>
              </div>

              {/* Minimum Receive */}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Min. Receive</span>
                <span className="text-sm">
                  {quote.minReceive.toFixed(6)} {toAsset}
                </span>
              </div>

              <Separator />

              {/* Fees */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee ({quote.platformFeePercent}%)</span>
                <span>{quote.platformFeeAmount.toFixed(6)} {toAsset}</span>
              </div>

              {quote.route?.type === '2hop' && (
                <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
                  <Info className="h-3 w-3 shrink-0" />
                  2-hop route via {quote.route.path[1]}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        <Button
          className="w-full h-12"
          onClick={handleReviewSwap}
          disabled={
            !quote.routeAvailable ||
            amount <= 0 ||
            insufficientBalance ||
            isSwapping ||
            quote.isLoadingPrices
          }
        >
          {isSwapping ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Swapping...
            </span>
          ) : !fromAsset || !toAsset ? (
            'Select Assets'
          ) : !quote.routeAvailable ? (
            'Route Unavailable'
          ) : insufficientBalance ? (
            'Insufficient Balance'
          ) : amount <= 0 ? (
            'Enter Amount'
          ) : (
            'Review Swap'
          )}
        </Button>

        {!quote.routeAvailable && fromAsset && toAsset && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            No trading route available for {fromAsset} → {toAsset}
          </p>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Swap</DialogTitle>
              <DialogDescription>Review the details below before confirming.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">You Pay</span>
                <span className="font-semibold">{amount} {fromAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">You Receive</span>
                <span className="font-semibold text-primary">≈ {quote.estimatedOutput.toFixed(6)} {toAsset}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span>1 {fromAsset} = {quote.route?.rate.toFixed(6)} {toAsset}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Route</span>
                <span>{quote.route?.path.join(' → ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee ({quote.platformFeePercent}%)</span>
                <span>{quote.platformFeeAmount.toFixed(6)} {toAsset}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min. Receive</span>
                <span>{quote.minReceive.toFixed(6)} {toAsset}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Slippage</span>
                <span>{slippage}%</span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSwap} disabled={isSwapping}>
                {isSwapping ? 'Executing...' : 'Confirm Swap'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
