import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Loader2, RefreshCw, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { SuccessAnimation } from "@/components/wallet/SuccessAnimation";
import { BalanceCardSkeleton } from "@/components/wallet/SkeletonLoader";
import { motion, AnimatePresence } from "framer-motion";
import AssetLogo from "@/components/AssetLogo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatUnits } from "ethers";

type TransferDirection = "to_trading" | "to_wallet";

interface AssetBalance {
  symbol: string;
  name: string;
  logoUrl?: string;
  onchainBalance: number;
  tradingAvailable: number;
  tradingLocked: number;
  tradingTotal: number;
  assetId: string;
  contractAddress?: string;
  decimals: number;
}

// Fetch on-chain balance with BigInt-safe precision
async function getOnchainBalance(contractAddress: string | null, walletAddress: string, decimals: number, symbol: string): Promise<number> {
  try {
    if (symbol === 'BNB' || !contractAddress) {
      // Native BNB balance
      const response = await fetch('https://bsc-dataseed.binance.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [walletAddress, 'latest'],
          id: 1
        })
      });
      const result = await response.json();
      if (!result.result || result.result === '0x') return 0;
      // Use BigInt for precision
      const balanceBigInt = BigInt(result.result);
      return parseFloat(formatUnits(balanceBigInt, 18));
    }

    // ERC20 balance
    const data = `0x70a08231000000000000000000000000${walletAddress.replace('0x', '')}`;
    const response = await fetch('https://bsc-dataseed.binance.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ data, to: contractAddress }, 'latest'],
        id: 1
      })
    });
    const result = await response.json();
    if (!result.result || result.result === '0x') return 0;
    // Use BigInt for precision - handles large token balances correctly
    const balanceBigInt = BigInt(result.result);
    return parseFloat(formatUnits(balanceBigInt, decimals));
  } catch (error) {
    console.error(`Failed to fetch on-chain balance for ${symbol}:`, error);
    return 0;
  }
}

const TransferScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Real-time subscription is handled globally in AstraLayout
  
  const [selectedAsset, setSelectedAsset] = useState("");
  const [direction, setDirection] = useState<TransferDirection>("to_trading");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch user's wallet address
  const { data: userWallet } = useQuery({
    queryKey: ['user-wallet-address'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('bsc_wallet_address, wallet_address')
        .eq('user_id', user.id)
        .single();

      return profile?.bsc_wallet_address || profile?.wallet_address || null;
    }
  });

  // Fetch assets with balances
  const { data: assets = [], isLoading: assetsLoading, refetch: refetchAssets } = useQuery({
    queryKey: ['transfer-assets', userWallet],
    queryFn: async (): Promise<AssetBalance[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userWallet) return [];

      // Get tradable BSC assets
      const { data: dbAssets } = await supabase
        .from('assets')
        .select('id, symbol, name, logo_url, contract_address, decimals')
        .or('network.ilike.%bep20%,network.ilike.%bsc%')
        .eq('is_active', true)
        .eq('trading_enabled', true);

      if (!dbAssets?.length) return [];

      // Get trading balances
      const { data: tradingBalances } = await supabase
        .from('wallet_balances')
        .select('asset_id, available, locked, total')
        .eq('user_id', user.id);

      const tradingMap = new Map((tradingBalances || []).map(b => [b.asset_id, b]));

      // Fetch on-chain balances for each asset
      const results: AssetBalance[] = [];
      for (const asset of dbAssets) {
        try {
          const onchainBalance = await getOnchainBalance(
            asset.contract_address,
            userWallet,
            asset.decimals || 18,
            asset.symbol
          );
          const trading = tradingMap.get(asset.id);

          // Include if either balance > 0
          if (onchainBalance > 0.000001 || (trading?.total || 0) > 0.000001) {
            results.push({
              symbol: asset.symbol,
              name: asset.name,
              logoUrl: asset.logo_url,
              onchainBalance,
              tradingAvailable: trading?.available || 0,
              tradingLocked: trading?.locked || 0,
              tradingTotal: trading?.total || 0,
              assetId: asset.id,
              contractAddress: asset.contract_address,
              decimals: asset.decimals || 18
            });
          }
        } catch (e) {
          console.error(`Error fetching balance for ${asset.symbol}:`, e);
        }
      }

      return results;
    },
    enabled: !!userWallet,
    refetchInterval: 10000
  });

  // Set default asset
  useEffect(() => {
    if (assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].symbol);
    }
  }, [assets, selectedAsset]);

  const currentAsset = assets.find(a => a.symbol === selectedAsset);

  // Calculate available balance based on direction
  const availableBalance = direction === "to_trading" 
    ? (currentAsset?.onchainBalance || 0)
    : (currentAsset?.tradingAvailable || 0);

  // Sync on-chain deposits to trading balance
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-onchain-to-trading', {
        body: { assetSymbols: selectedAsset ? [selectedAsset] : undefined }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Synced ${data?.addedCount || 0} deposit(s) to trading balance`
      });

      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ['transfer-assets'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      refetchAssets();
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err.message || "Failed to sync balances",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle transfer
  const handleTransfer = async () => {
    if (!amount || !currentAsset) {
      toast({ title: "Invalid Transfer", description: "Please enter an amount", variant: "destructive" });
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
      if (direction === "to_trading") {
        // Sync on-chain balance to trading (detects deposits)
        const { data, error } = await supabase.functions.invoke('sync-onchain-to-trading', {
          body: { assetSymbols: [selectedAsset] }
        });

        if (error) throw error;

        // Check if the sync added the expected amount
        const addedResult = data?.results?.find((r: any) => r.symbol === selectedAsset);
        if (addedResult?.action === 'added' || addedResult?.action === 'none') {
          toast({
            title: "Transfer Complete",
            description: `${amountNum.toFixed(6)} ${selectedAsset} is now available for trading`
          });
          setShowSuccess(true);
        } else if (addedResult?.action === 'reduced') {
          toast({
            title: "Balance Synced",
            description: "Trading balance was adjusted to match on-chain balance"
          });
        } else {
          toast({
            title: "Sync Complete",
            description: "Balances are now synchronized"
          });
        }
      } else {
        // Trading → Wallet (withdrawal)
        const { error } = await supabase.functions.invoke('process-crypto-withdrawal', {
          body: {
            assetSymbol: selectedAsset,
            amount: amountNum,
            destinationAddress: userWallet
          }
        });

        if (error) throw error;

        toast({
          title: "Withdrawal Initiated",
          description: `${amountNum.toFixed(6)} ${selectedAsset} will be sent to your wallet`
        });
        setShowSuccess(true);
      }

      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ['transfer-assets'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    } catch (err: any) {
      toast({
        title: "Transfer Failed",
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
            title="Transfer Complete!"
            subtitle={direction === "to_trading" 
              ? "Funds are now available for trading" 
              : "Withdrawal initiated to your wallet"}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-card shadow-lg border border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Direction</span>
                  <span className="font-medium text-foreground">
                    {direction === "to_trading" ? "Wallet → Trading" : "Trading → Wallet"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">{amount} {selectedAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium text-primary">Free</span>
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
          className="flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/wallet")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Transfer Funds</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </motion.div>

        {/* Info Alert - Explains two-balance system */}
        <Alert className="bg-muted/30">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-1">
            <p><strong>On-Chain Wallet</strong>: Your actual crypto on the BSC blockchain.</p>
            <p><strong>Trading Balance</strong>: Funds credited for placing orders.</p>
            <p className="text-muted-foreground">Use "Deposit" to sync on-chain funds. Use "Withdraw" to send back to your wallet.</p>
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
          ) : !userWallet ? (
            <motion.div
              key="no-wallet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                <Info className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">No Wallet Connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please set up your BSC wallet first
              </p>
              <Button onClick={() => navigate("/app/settings")}>
                Go to Settings
              </Button>
            </motion.div>
          ) : assets.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                <ArrowDownToLine className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">No Assets Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Deposit crypto to your wallet first
              </p>
              <Button onClick={() => navigate("/app/wallet/deposit")}>
                Deposit Now
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
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
                      {assets.map((asset) => (
                        <SelectItem key={asset.symbol} value={asset.symbol}>
                          <div className="flex items-center gap-2">
                            <AssetLogo symbol={asset.symbol} logoUrl={asset.logoUrl} size="sm" />
                            <span>{asset.symbol}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Two-Column Balance Display - Clear separation */}
              {currentAsset && (
                <Card className="bg-card shadow-lg border border-border">
                  <CardContent className="p-4 space-y-4">
                    {/* Side-by-side balance display */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* On-Chain Wallet Balance */}
                      <div className="p-3 bg-muted/30 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground mb-1">On-Chain Wallet</div>
                        <div className="text-lg font-semibold font-mono">
                          {currentAsset.onchainBalance.toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">BSC Blockchain</div>
                      </div>
                      
                      {/* Trading Balance */}
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Trading Balance</div>
                        <div className="text-lg font-semibold font-mono text-primary">
                          {currentAsset.tradingAvailable.toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">Available for orders</div>
                      </div>
                    </div>
                    
                    {/* Trading breakdown if locked funds exist */}
                    {currentAsset.tradingLocked > 0.000001 && (
                      <div className="flex justify-between items-center px-1 text-sm">
                        <span className="text-muted-foreground">Locked in Orders</span>
                        <span className="font-mono font-medium text-amber-500">
                          {currentAsset.tradingLocked.toFixed(4)} {selectedAsset}
                        </span>
                      </div>
                    )}
                    
                    {/* Balance mismatch indicator */}
                    {Math.abs(currentAsset.onchainBalance - currentAsset.tradingTotal) > 0.0001 && (
                      <div className="p-2 bg-warning/10 border border-warning/20 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-warning-foreground font-medium">
                            {currentAsset.onchainBalance > currentAsset.tradingTotal 
                              ? "New deposits available to sync" 
                              : "Trading balance differs from on-chain"}
                          </span>
                          <span className="font-mono text-warning-foreground">
                            {currentAsset.onchainBalance > currentAsset.tradingTotal ? "+" : ""}
                            {(currentAsset.onchainBalance - currentAsset.tradingTotal).toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Direction Selection */}
              <Card className="bg-card shadow-lg border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground">Transfer Direction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={direction === "to_trading" ? "default" : "outline"}
                      onClick={() => setDirection("to_trading")}
                      className="flex items-center gap-2"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      Deposit
                    </Button>
                    <Button
                      variant={direction === "to_wallet" ? "default" : "outline"}
                      onClick={() => setDirection("to_wallet")}
                      className="flex items-center gap-2"
                    >
                      <ArrowUpFromLine className="w-4 h-4" />
                      Withdraw
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {direction === "to_trading" 
                      ? "Credit on-chain funds to trading balance" 
                      : "Send trading balance to your on-chain wallet"}
                  </p>
                </CardContent>
              </Card>

              {/* Amount */}
              <Card className="bg-card shadow-lg border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground">Amount</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      type="number"
                      step="any"
                      className="text-lg"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => setAmount(availableBalance.toFixed(6))}
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: <span className="font-medium text-foreground">{availableBalance.toFixed(6)}</span> {selectedAsset}
                  </p>
                </CardContent>
              </Card>

              {/* Transfer Button */}
              <Button 
                onClick={handleTransfer} 
                className="w-full" 
                size="lg"
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
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
                    {direction === "to_trading" ? "Deposit to Trading" : "Withdraw to Wallet"}
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TransferScreen;
