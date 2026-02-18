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
import { useHotWalletAddress } from "@/hooks/useTradingBalances";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { transferERC20 } from "@/lib/wallet/onchainTransfer";
import { getStoredWallet, setWalletStorageUserId, storeWallet } from "@/utils/walletStorage";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { useEncryptedWalletBackup } from "@/hooks/useEncryptedWalletBackup";
import PinEntryDialog from "@/components/profile/PinEntryDialog";

type TransferDirection = "to_trading" | "to_wallet";
type TransferDestination = "trading" | "staking";

interface AssetBalance {
  symbol: string;
  name: string;
  logoUrl?: string;
  tradingAvailable: number;
  tradingLocked: number;
  tradingTotal: number;
  walletBalance: number; // from onchain_balances
  assetId: string;
}

const TransferScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { wallet, refreshWallet } = useWeb3();
  const { retrieveBackup, backupStatus, checkBackupExists } = useEncryptedWalletBackup();
  const { data: dynamicHotWalletAddress } = useHotWalletAddress();
  
  const [selectedAsset, setSelectedAsset] = useState("");
  const [destination, setDestination] = useState<TransferDestination>("trading");
  const [direction, setDirection] = useState<TransferDirection>("to_trading");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);

  // Check if encrypted backup exists on mount
  useEffect(() => {
    checkBackupExists();
  }, [checkBackupExists]);

  // Auto-sync on-chain balances to DB when user wants to transfer to trading
  useEffect(() => {
    if (direction !== "to_trading") return;
    
    const syncOnchainBalances = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setIsSyncing(true);
      try {
        await supabase.functions.invoke('sync-bep20-balances', {
          body: { userIds: [user.id] }
        });
        // Refetch after sync so onchain_balances DB table is fresh
        refetchTrading();
      } catch (err) {
        console.warn('[TransferScreen] sync-bep20-balances failed:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    syncOnchainBalances();
  }, [direction]);

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

      // Also fetch onchain_balances (wallet balance) for to_trading transfers
      const { data: onchainBalances } = await supabase
        .from('onchain_balances')
        .select('asset_id, balance')
        .eq('user_id', user.id);

      const tradingMap = new Map((tradingBalances || []).map(b => [b.asset_id, b]));
      const onchainMap = new Map((onchainBalances || []).map(b => [b.asset_id, b]));

      const results: AssetBalance[] = [];
      for (const asset of dbAssets) {
        const trading = tradingMap.get(asset.id);
        const onchain = onchainMap.get(asset.id);
        results.push({
          symbol: asset.symbol,
          name: asset.name,
          logoUrl: asset.logo_url,
          tradingAvailable: trading?.available || 0,
          tradingLocked: trading?.locked || 0,
          tradingTotal: trading?.total || 0,
          walletBalance: onchain?.balance || 0,
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
  const tradingAvailable = currentTradingAsset?.tradingAvailable || 0;
  const walletBalance = currentTradingAsset?.walletBalance || 0;
  // Use wallet balance for to_trading, trading balance for to_wallet
  const availableBalance = direction === "to_trading" ? walletBalance : tradingAvailable;

  // Robust private key resolution — mirrors WithdrawScreen logic
  const resolvePrivateKey = async (): Promise<string | null> => {
    const deriveFromSeed = (seedPhrase: string): string | null => {
      try {
        return ethers.Wallet.fromPhrase(seedPhrase.trim()).privateKey;
      } catch { return null; }
    };

    // 1) Web3 context
    if (wallet?.privateKey && wallet.privateKey.length > 0) return wallet.privateKey;
    if (wallet?.seedPhrase) {
      const derived = deriveFromSeed(wallet.seedPhrase);
      if (derived) return derived;
    }

    // 2) User-scoped storage
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const stored = getStoredWallet(user.id);
        if (stored?.privateKey) return stored.privateKey;
        if (stored?.seedPhrase) {
          const derived = deriveFromSeed(stored.seedPhrase);
          if (derived) return derived;
        }
      }
    } catch {}

    // 3) Unscoped storage fallback
    const storedAny = getStoredWallet();
    if (storedAny?.privateKey) return storedAny.privateKey;
    if (storedAny?.seedPhrase) {
      const derived = deriveFromSeed(storedAny.seedPhrase);
      if (derived) return derived;
    }

    // 4) Legacy ipg_wallet_data
    try {
      const raw = localStorage.getItem("ipg_wallet_data");
      if (raw) {
        const parsed = JSON.parse(atob(raw));
        if (parsed?.privateKey) return parsed.privateKey;
        const seed = parsed?.seedPhrase || parsed?.mnemonic;
        if (seed) {
          const derived = deriveFromSeed(seed);
          if (derived) return derived;
        }
      }
    } catch {}

    return null;
  };

  // Unlock from encrypted server backup via PIN
  const unlockFromBackupAndTransfer = async (pin: string): Promise<boolean> => {
    try {
      const phrase = await retrieveBackup(pin);
      if (!phrase) return false;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
      const derivedWallet = ethers.Wallet.fromPhrase(normalized);

      // Persist locally for future use
      setWalletStorageUserId(user.id);
      storeWallet({
        address: derivedWallet.address,
        seedPhrase: normalized,
        privateKey: "",
        network: "mainnet",
        balance: "0",
      }, user.id);
      await refreshWallet();

      // Now retry the transfer with the derived key
      await executeTransfer(derivedWallet.privateKey);
      return true;
    } catch (e: any) {
      toast({ title: "Unlock Failed", description: e.message || "Invalid PIN", variant: "destructive" });
      return false;
    }
  };

  // Execute on-chain transfer with a given private key
  const executeTransfer = async (privateKey: string) => {
    const amountNum = parseFloat(amount);
    if (!currentTradingAsset) return;

    // Original Trading Hot Wallet address (dedicated for trading deposits only)
    const hotWalletAddress = dynamicHotWalletAddress;
    if (!hotWalletAddress) {
      throw new Error("Platform deposit address not available. Please try again.");
    }

    // Get contract address for the asset
    const { data: assetData } = await supabase
      .from('assets')
      .select('contract_address, decimals')
      .eq('id', currentTradingAsset.assetId)
      .single();

    if (!assetData?.contract_address) {
      throw new Error("Contract address not found for this asset.");
    }

    toast({
      title: "Sending Transaction",
      description: `Broadcasting ${amountNum} ${selectedAsset} to trading hot wallet...`,
    });

    const result = await transferERC20(
      privateKey,
      assetData.contract_address,
      hotWalletAddress,
      amountNum.toString(),
      assetData.decimals || 18
    );

    if (!result.success) {
      throw new Error(result.error || "On-chain transfer failed");
    }

    toast({
      title: "Transfer Sent!",
      description: `TX: ${result.txHash?.slice(0, 10)}... — Crediting your trading balance...`,
    });

    // Immediately credit trading balance via RPC (debit onchain, credit trading)
    const { data: creditResult, error: creditError } = await supabase.functions.invoke('internal-balance-transfer', {
      body: {
        asset_id: currentTradingAsset.assetId,
        amount: amountNum,
        direction: "to_trading",
      }
    });

    if (creditError || !creditResult?.success) {
      console.warn('[TransferScreen] RPC credit failed, deposit monitor will handle it:', creditResult?.error || creditError?.message);
      toast({
        title: "Balance Update Pending",
        description: "Your trading balance will be credited automatically once the transaction confirms on-chain.",
      });
    } else {
      toast({
        title: "Trading Balance Updated",
        description: `${amountNum} ${selectedAsset} credited to your trading balance.`,
      });
    }

    // Sync on-chain balances to reflect the new state
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.functions.invoke('sync-bep20-balances', {
          body: { userIds: [user.id] }
        });
      }
    } catch (syncErr) {
      console.warn('[TransferScreen] Post-transfer sync failed:', syncErr);
    }

    // Invalidate all balance queries immediately
    queryClient.invalidateQueries({ queryKey: ['transfer-assets-custodial'] });
    queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
    queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    queryClient.invalidateQueries({ queryKey: ['onchain-balances-all'] });

    setShowSuccess(true);
  };

  // Transfer handler — on-chain for "to_trading", withdrawal request for "to_wallet"
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

    if (amountNum > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: direction === "to_trading"
          ? `Wallet balance: ${walletBalance.toFixed(6)} ${selectedAsset}`
          : `Trading available: ${tradingAvailable.toFixed(6)} ${selectedAsset}`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setTransferError(null);

    try {
      if (direction === "to_trading") {
        // === ON-CHAIN TRANSFER to hot wallet ===
        const privateKey = await resolvePrivateKey();
        if (!privateKey) {
          // If encrypted backup exists, prompt for PIN
          if (backupStatus.exists) {
            setShowPinDialog(true);
            setIsProcessing(false);
            return;
          }
          throw new Error("Wallet private key not found. Please re-import your wallet.");
        }

        await executeTransfer(privateKey);

      } else {
        // === WITHDRAWAL REQUEST — hot wallet sends tokens back ===
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Get user's wallet address — try local storage first, then DB profile
        let userAddress = getStoredWallet()?.address;
        if (!userAddress) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_address, bsc_wallet_address')
            .eq('user_id', user.id)
            .maybeSingle();
          userAddress = profile?.bsc_wallet_address || profile?.wallet_address || null;
        }
        if (!userAddress) throw new Error("No wallet address found. Please re-import your wallet in Settings.");

        // Get asset details for withdrawal fee
        const { data: assetData } = await supabase
          .from('assets')
          .select('withdraw_fee, network')
          .eq('id', currentTradingAsset.assetId)
          .single();

        const fee = assetData?.withdraw_fee || 0;
        const netAmount = amountNum - fee;

        if (netAmount <= 0) {
          throw new Error(`Amount too small. Minimum withdrawal must cover ${fee} ${selectedAsset} fee.`);
        }

        // Debit trading balance first via the existing RPC
        const { data: debitResult, error: debitError } = await supabase.functions.invoke('internal-balance-transfer', {
          body: {
            asset_id: currentTradingAsset.assetId,
            amount: amountNum,
            direction: "to_wallet",
          }
        });

        if (debitError || !debitResult?.success) {
          throw new Error(debitResult?.error || debitError?.message || "Failed to debit trading balance");
        }

        // Create withdrawal request for the hot wallet to process
        const { error: withdrawalError } = await supabase
          .from('withdrawals')
          .insert({
            user_id: user.id,
            asset_id: currentTradingAsset.assetId,
            amount: amountNum,
            fee: fee,
            net_amount: netAmount,
            to_address: userAddress,
            network: assetData?.network || 'BEP20',
            status: 'processing',
          });

        if (withdrawalError) {
          throw new Error("Failed to create withdrawal request: " + withdrawalError.message);
        }

        toast({
          title: "Withdrawal Submitted",
          description: `${netAmount.toFixed(6)} ${selectedAsset} will be sent to your wallet shortly.`,
        });

        setShowSuccess(true);
      }

      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ['transfer-assets-custodial'] });
      queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['onchain-balances-all'] });

      // Trigger on-chain balance sync after a short delay to reflect withdrawal
      if (direction === "to_wallet") {
        setTimeout(async () => {
          try {
            await supabase.functions.invoke('sync-bep20-balances');
            queryClient.invalidateQueries({ queryKey: ['onchain-balances-all'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
            queryClient.invalidateQueries({ queryKey: ['transfer-assets-custodial'] });
          } catch (e) {
            console.warn('Post-withdrawal sync failed:', e);
          }
        }, 5000);
      }
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
              direction === "to_trading" ? (
                <p><strong>On-Chain Transfer</strong>: Tokens are sent from your wallet to the platform hot wallet on BSC. Trading balance is credited once the transaction confirms. Gas fees apply.</p>
              ) : (
                <p><strong>Hot Wallet Withdrawal</strong>: Tokens are sent from the platform hot wallet back to your wallet on BSC.</p>
              )
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
                                  ({direction === "to_trading" 
                                    ? `${asset.walletBalance.toFixed(4)} in wallet`
                                    : `${asset.tradingAvailable.toFixed(4)} available`})
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
                            onClick={() => setAmount(availableBalance.toString())}
                            disabled={availableBalance <= 0}
                          >
                            MAX
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {direction === "to_trading" ? "Wallet" : "Trading"} balance: {isSyncing ? "syncing..." : `${availableBalance.toFixed(6)} ${selectedAsset}`}
                        </p>
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
                      parseFloat(amount) > availableBalance
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

      {/* PIN Entry Dialog for encrypted backup unlock */}
      <PinEntryDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSubmit={async (pin) => {
          const success = await unlockFromBackupAndTransfer(pin);
          if (success) setShowPinDialog(false);
          return success;
        }}
        title="Unlock Wallet"
        description="Enter your PIN to decrypt your wallet and sign the transaction."
      />
    </div>
  );
};

export default TransferScreen;
