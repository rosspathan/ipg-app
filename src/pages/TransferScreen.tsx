import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Loader2, Info, AlertTriangle, CheckCircle2, TrendingUp, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { SuccessAnimation } from "@/components/wallet/SuccessAnimation";
import { BalanceCardSkeleton } from "@/components/wallet/SkeletonLoader";
import { motion, AnimatePresence } from "framer-motion";
import AssetLogo from "@/components/AssetLogo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

type TransferDirection = "to_trading" | "to_wallet";
type TransferDestination = "trading" | "staking";

interface AssetBalance {
  symbol: string;
  name: string;
  logoUrl?: string;
  tradingAvailable: number;
  tradingLocked: number;
  tradingTotal: number;
  assetId: string;
}

const TransferScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedAsset, setSelectedAsset] = useState("");
  const [destination, setDestination] = useState<TransferDestination>("trading");
  const [direction, setDirection] = useState<TransferDirection>("to_trading");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Fetch all tradable assets with balances
  const { data: tradingAssets = [], isLoading: tradingLoading, refetch: refetchTrading } = useQuery({
    queryKey: ['transfer-assets-custodial'],
    queryFn: async (): Promise<AssetBalance[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: dbAssets } = await supabase
        .from('assets')
        .select('id, symbol, name, logo_url')
        .or('network.ilike.%bep20%,network.ilike.%bsc%')
        .eq('is_active', true)
        .eq('trading_enabled', true);

      if (!dbAssets?.length) return [];

      const { data: tradingBalances } = await supabase
        .from('wallet_balances')
        .select('asset_id, available, locked, total')
        .eq('user_id', user.id);

      const tradingMap = new Map((tradingBalances || []).map(b => [b.asset_id, b]));

      const results: AssetBalance[] = [];
      for (const asset of dbAssets) {
        const trading = tradingMap.get(asset.id);
        results.push({
          symbol: asset.symbol,
          name: asset.name,
          logoUrl: asset.logo_url,
          tradingAvailable: trading?.available || 0,
          tradingLocked: trading?.locked || 0,
          tradingTotal: trading?.total || 0,
          assetId: asset.id,
        });
      }

      return results.sort((a, b) => {
        if (a.tradingTotal > 0 && b.tradingTotal === 0) return -1;
        if (a.tradingTotal === 0 && b.tradingTotal > 0) return 1;
        return a.symbol.localeCompare(b.symbol);
      });
    },
    refetchInterval: 15000
  });

  // Set default asset
  useEffect(() => {
    if (tradingAssets.length > 0 && !selectedAsset) {
      const withBalance = tradingAssets.find(a => a.tradingTotal > 0);
      setSelectedAsset(withBalance?.symbol || tradingAssets[0]?.symbol || '');
    }
  }, [tradingAssets, selectedAsset]);

  // Reset on direction change
  useEffect(() => {
    setAmount("");
    setTransferError(null);
  }, [direction]);

  const currentTradingAsset = tradingAssets.find(a => a.symbol === selectedAsset);
  const availableBalance = currentTradingAsset?.tradingAvailable || 0;

  // Internal transfer handler — no on-chain transactions
  const handleTransfer = async () => {
    if (!amount || !currentTradingAsset) {
      toast({ title: "Invalid Request", description: "Please enter an amount", variant: "destructive" });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    if (direction === "to_wallet" && amountNum > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Available: ${availableBalance.toFixed(6)} ${selectedAsset}`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setTransferError(null);

    try {
      const { data, error } = await supabase.functions.invoke('internal-balance-transfer', {
        body: {
          asset_id: currentTradingAsset.assetId,
          amount: amountNum,
          direction: direction === "to_trading" ? "to_trading" : "to_wallet",
        }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Transfer failed');

      toast({
        title: "Transfer Complete",
        description: data?.message || `${amountNum} ${selectedAsset} transferred successfully`,
      });

      setShowSuccess(true);

      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ['transfer-assets-custodial'] });
      queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    } catch (err: any) {
      const msg = err.message || "Transfer failed";
      setTransferError(msg);
      toast({ title: "Transfer Failed", description: msg, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <SuccessAnimation
            title="Transfer Complete!"
            subtitle={`${amount} ${selectedAsset} has been ${direction === "to_trading" ? "added to" : "removed from"} your trading balance`}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-card shadow-lg border border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">
                    {direction === "to_trading" ? "Deposit to Trading" : "Withdraw to Wallet"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">{amount} {selectedAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            <Button onClick={() => navigate("/app/wallet")} className="w-full" size="lg">
              Back to Wallet
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSuccess(false);
                setAmount("");
                setTransferError(null);
                refetchTrading();
              }} 
              className="w-full" 
              size="lg"
            >
              Make Another Transfer
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto w-full space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-4"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/wallet")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Transfer Funds</h1>
        </motion.div>

        {/* Destination Selector */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setDestination("trading")}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              destination === "trading"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Trading
          </button>
          <button
            onClick={() => setDestination("staking")}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              destination === "staking"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Coins className="w-4 h-4" />
            Staking
          </button>
        </div>

        {/* Info */}
        <Alert className="bg-primary/10 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs space-y-1">
            {destination === "trading" ? (
              <p><strong>Instant Transfer</strong>: Move funds between your wallet and trading balance instantly — no gas fees required.</p>
            ) : (
              <p><strong>Staking Transfer</strong>: Move funds between your wallet and staking account to earn rewards.</p>
            )}
          </AlertDescription>
        </Alert>

        <AnimatePresence mode="wait">
          {tradingLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <BalanceCardSkeleton />
              <BalanceCardSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {destination === "trading" ? (
                <>
                  {/* Direction Tabs */}
                  <div className="flex bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setDirection("to_trading")}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        direction === "to_trading"
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ArrowDownToLine className="w-4 h-4 inline mr-2" />
                      Deposit
                    </button>
                    <button
                      onClick={() => setDirection("to_wallet")}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        direction === "to_wallet"
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ArrowUpFromLine className="w-4 h-4 inline mr-2" />
                      Withdraw
                    </button>
                  </div>

                  {/* Transfer Form */}
                  <Card className="bg-card shadow-lg border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-foreground flex items-center gap-2">
                        {direction === "to_trading" ? (
                          <ArrowDownToLine className="w-4 h-4 text-primary" />
                        ) : (
                          <ArrowUpFromLine className="w-4 h-4 text-primary" />
                        )}
                        {direction === "to_trading" ? "Transfer to Trading" : "Withdraw to Wallet"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Asset Selection */}
                      <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {tradingAssets.map((asset) => (
                            <SelectItem key={asset.symbol} value={asset.symbol}>
                              <div className="flex items-center gap-2">
                                <AssetLogo symbol={asset.symbol} logoUrl={asset.logoUrl} size="sm" />
                                <span>{asset.symbol}</span>
                                <span className="text-muted-foreground ml-2">
                                  ({asset.tradingAvailable.toFixed(4)} available)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Amount Input */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => {
                              setAmount(e.target.value);
                              setTransferError(null);
                            }}
                            className="pr-20 text-lg"
                            step="any"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs"
                            onClick={() => {
                              if (direction === "to_wallet") {
                                setAmount(availableBalance.toString());
                              }
                            }}
                            disabled={direction === "to_wallet" && availableBalance <= 0}
                          >
                            MAX
                          </Button>
                        </div>
                        {direction === "to_wallet" && (
                          <p className="text-xs text-muted-foreground">
                            Available: {availableBalance.toFixed(6)} {selectedAsset}
                          </p>
                        )}
                      </div>

                      {/* Error Display */}
                      {transferError && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">{transferError}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Transfer Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleTransfer}
                    disabled={
                      isProcessing ||
                      !amount ||
                      parseFloat(amount) <= 0 ||
                      !selectedAsset ||
                      (direction === "to_wallet" && parseFloat(amount) > availableBalance)
                    }
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {direction === "to_trading" ? (
                          <ArrowDownToLine className="w-4 h-4 mr-2" />
                        ) : (
                          <ArrowUpFromLine className="w-4 h-4 mr-2" />
                        )}
                        {direction === "to_trading" ? "Transfer" : "Withdraw"} {amount ? `${amount} ${selectedAsset}` : ''} {direction === "to_trading" ? "to Trading" : "to Wallet"}
                      </>
                    )}
                  </Button>

                  {/* Current Trading Balances */}
                  <Card className="bg-card shadow-lg border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Your Trading Balances</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {tradingAssets.filter(a => a.tradingTotal > 0.000001).length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">No trading balance</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Deposit funds to start trading
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tradingAssets.filter(a => a.tradingTotal > 0.000001).map(asset => (
                            <div key={asset.symbol} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                              <div className="flex items-center gap-2">
                                <AssetLogo symbol={asset.symbol} logoUrl={asset.logoUrl} size="sm" />
                                <span className="font-medium text-foreground">{asset.symbol}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-sm text-foreground">
                                  {asset.tradingTotal.toFixed(4)}
                                </div>
                                {asset.tradingLocked > 0 && (
                                  <div className="text-xs text-amber-400">
                                    {asset.tradingLocked.toFixed(4)} locked
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* STAKING DESTINATION */
                <>
                  <div className="flex bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setDirection("to_trading")}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        direction === "to_trading"
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ArrowDownToLine className="w-4 h-4 inline mr-2" />
                      Fund
                    </button>
                    <button
                      onClick={() => setDirection("to_wallet")}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        direction === "to_wallet"
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ArrowUpFromLine className="w-4 h-4 inline mr-2" />
                      Withdraw
                    </button>
                  </div>

                  <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-foreground flex items-center gap-2">
                        <Coins className="w-4 h-4 text-primary" />
                        {direction === "to_trading" ? "Fund Staking Account" : "Withdraw from Staking"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {direction === "to_trading" 
                          ? "Transfer IPG tokens from your wallet to your staking account to start earning rewards."
                          : "Withdraw your available balance from staking back to your wallet. 0.5% fee applies."}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center p-3 bg-muted/50 rounded-lg flex-1">
                          <p className="text-xl font-bold text-primary">4-10%</p>
                          <p className="text-xs text-muted-foreground">Monthly</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg flex-1">
                          <p className="text-xl font-bold text-foreground">30</p>
                          <p className="text-xs text-muted-foreground">Days Lock</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg flex-1">
                          <p className="text-xl font-bold text-foreground">0.5%</p>
                          <p className="text-xs text-muted-foreground">Fee</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => navigate(direction === "to_trading" ? "/app/staking/deposit" : "/app/staking/withdraw")}
                  >
                    {direction === "to_trading" ? (
                      <>
                        <ArrowDownToLine className="w-4 h-4 mr-2" />
                        Go to Staking Deposit
                      </>
                    ) : (
                      <>
                        <ArrowUpFromLine className="w-4 h-4 mr-2" />
                        Go to Staking Withdraw
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/app/staking")}
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    View Staking Plans & Rewards
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TransferScreen;
