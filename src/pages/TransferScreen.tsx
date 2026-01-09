import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Loader2, Info, Copy, Check, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { SuccessAnimation } from "@/components/wallet/SuccessAnimation";
import { BalanceCardSkeleton } from "@/components/wallet/SkeletonLoader";
import { motion, AnimatePresence } from "framer-motion";
import AssetLogo from "@/components/AssetLogo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHotWalletAddress } from "@/hooks/useTradingBalances";

type TransferDirection = "to_trading" | "to_wallet";

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
  const { data: hotWalletAddress } = useHotWalletAddress();
  
  const [selectedAsset, setSelectedAsset] = useState("");
  const [direction, setDirection] = useState<TransferDirection>("to_trading");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch assets with trading balances only
  const { data: assets = [], isLoading: assetsLoading, refetch: refetchAssets } = useQuery({
    queryKey: ['transfer-assets-custodial'],
    queryFn: async (): Promise<AssetBalance[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get tradable BSC assets
      const { data: dbAssets } = await supabase
        .from('assets')
        .select('id, symbol, name, logo_url')
        .or('network.ilike.%bep20%,network.ilike.%bsc%')
        .eq('is_active', true)
        .eq('trading_enabled', true);

      if (!dbAssets?.length) return [];

      // Get trading balances from wallet_balances (custodial)
      const { data: tradingBalances } = await supabase
        .from('wallet_balances')
        .select('asset_id, available, locked, total')
        .eq('user_id', user.id);

      const tradingMap = new Map((tradingBalances || []).map(b => [b.asset_id, b]));

      // Build asset list - include all tradable assets for deposits
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

      // Sort: assets with balance first, then alphabetically
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
    if (assets.length > 0 && !selectedAsset) {
      // Prefer USDT or first asset with balance
      const usdt = assets.find(a => a.symbol === 'USDT');
      const withBalance = assets.find(a => a.tradingTotal > 0);
      setSelectedAsset(usdt?.symbol || withBalance?.symbol || assets[0].symbol);
    }
  }, [assets, selectedAsset]);

  const currentAsset = assets.find(a => a.symbol === selectedAsset);

  // For withdrawals, available balance is from trading
  const availableBalance = currentAsset?.tradingAvailable || 0;

  const handleCopyAddress = async () => {
    if (!hotWalletAddress) return;
    try {
      await navigator.clipboard.writeText(hotWalletAddress);
      setCopied(true);
      toast({ title: "Address copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  // Handle withdrawal (trading → wallet)
  const handleWithdraw = async () => {
    if (!amount || !currentAsset) {
      toast({ title: "Invalid Request", description: "Please enter an amount", variant: "destructive" });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0 || amountNum > availableBalance) {
      toast({
        title: "Invalid Amount",
        description: amountNum > availableBalance 
          ? `Insufficient balance. Available: ${availableBalance.toFixed(6)} ${selectedAsset}` 
          : "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('request-custodial-withdrawal', {
        body: {
          asset_symbol: selectedAsset,
          amount: amountNum
        }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Withdrawal failed');

      toast({
        title: "Withdrawal Requested",
        description: `${amountNum.toFixed(6)} ${selectedAsset} withdrawal is being processed`
      });
      setShowSuccess(true);

      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ['transfer-assets-custodial'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
      queryClient.invalidateQueries({ queryKey: ['bep20-balances'] });
    } catch (err: any) {
      toast({
        title: "Withdrawal Failed",
        description: err.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <SuccessAnimation
            title="Request Submitted!"
            subtitle="Your withdrawal is being processed"
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
                  <span className="font-medium text-foreground">Withdrawal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">{amount} {selectedAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-amber-400">Processing</span>
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
          <h1 className="text-2xl font-bold text-foreground">Trading Funds</h1>
        </motion.div>

        {/* Info Alert - Custodial model explanation */}
        <Alert className="bg-primary/10 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs space-y-1">
            <p><strong>Custodial Trading</strong>: Your trading balance is held securely in the platform wallet.</p>
            <p><strong>Deposit</strong>: Send tokens to the deposit address below.</p>
            <p><strong>Withdraw</strong>: Request funds back to your personal wallet.</p>
          </AlertDescription>
        </Alert>

        <AnimatePresence mode="wait">
          {assetsLoading ? (
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

              {direction === "to_trading" ? (
                /* DEPOSIT SECTION */
                <Card className="bg-card shadow-lg border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-foreground flex items-center gap-2">
                      <ArrowDownToLine className="w-4 h-4 text-primary" />
                      Deposit to Trading
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Send BEP-20 tokens to this address. Your trading balance will be credited automatically after confirmation.
                    </p>
                    
                    {hotWalletAddress ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                          <code className="text-xs font-mono text-foreground flex-1 break-all">
                            {hotWalletAddress}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0"
                            onClick={handleCopyAddress}
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0"
                            onClick={() => window.open(`https://bscscan.com/address/${hotWalletAddress}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="bg-muted px-2 py-1 rounded">BSC (BEP-20)</span>
                          <span className="bg-muted px-2 py-1 rounded">~15 confirmations</span>
                        </div>
                        
                        <Alert className="bg-amber-500/10 border-amber-500/20">
                          <AlertDescription className="text-xs text-amber-400">
                            Only send BSC (BEP-20) tokens. Sending other networks will result in permanent loss.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading deposit address...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                /* WITHDRAW SECTION */
                <>
                  {/* Asset Selection */}
                  <Card className="bg-card shadow-lg border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-foreground">Select Asset</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assets.filter(a => a.tradingTotal > 0.000001).map((asset) => (
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
                          {assets.filter(a => a.tradingTotal > 0.000001).length === 0 && (
                            <SelectItem value="none" disabled>
                              No trading balance
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {/* Balance Display */}
                  {currentAsset && currentAsset.tradingTotal > 0 && (
                    <Card className="bg-muted/30 border border-border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Trading Balance</span>
                          <div className="text-right">
                            <div className="font-medium text-foreground">
                              {currentAsset.tradingTotal.toFixed(6)} {selectedAsset}
                            </div>
                            {currentAsset.tradingLocked > 0 && (
                              <div className="text-xs text-amber-400">
                                {currentAsset.tradingLocked.toFixed(4)} in orders
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Amount Input */}
                  <Card className="bg-card shadow-lg border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-foreground">Withdraw Amount</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pr-20 text-lg"
                          step="any"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs"
                          onClick={() => setAmount(availableBalance.toString())}
                          disabled={availableBalance <= 0}
                        >
                          MAX
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available: {availableBalance.toFixed(6)} {selectedAsset}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Withdraw Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleWithdraw}
                    disabled={isProcessing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowUpFromLine className="w-4 h-4 mr-2" />
                        Withdraw {amount && `${amount} ${selectedAsset}`}
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Current Trading Balances */}
              <Card className="bg-card shadow-lg border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Your Trading Balances</CardTitle>
                </CardHeader>
                <CardContent>
                  {assets.filter(a => a.tradingTotal > 0.000001).length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No trading balance</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deposit funds to start trading
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assets.filter(a => a.tradingTotal > 0.000001).map(asset => (
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TransferScreen;
