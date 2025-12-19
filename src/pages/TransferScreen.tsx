import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { SuccessAnimation } from "@/components/wallet/SuccessAnimation";
import { BalanceCardSkeleton } from "@/components/wallet/SkeletonLoader";
import { motion, AnimatePresence } from "framer-motion";
import AssetLogo from "@/components/AssetLogo";

const TransferScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { balances, loading: balancesLoading } = useWalletBalances();
  
  const [selectedAsset, setSelectedAsset] = useState("");
  const [fromWallet, setFromWallet] = useState("main");
  const [toWallet, setToWallet] = useState("trading");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter to crypto assets only (balance is a number in AssetBalance interface)
  const cryptoAssets = balances.filter(b => 
    b.symbol !== 'INR' && 
    b.symbol !== 'BSK' &&
    b.balance > 0
  );

  // Set default asset when balances load
  useEffect(() => {
    if (cryptoAssets.length > 0 && !selectedAsset) {
      setSelectedAsset(cryptoAssets[0].symbol);
    }
  }, [cryptoAssets, selectedAsset]);

  const wallets = [
    { id: "main", name: "Main Wallet", description: "Your primary wallet" },
    { id: "trading", name: "Trading Wallet", description: "For active trading" },
    { id: "savings", name: "Savings Wallet", description: "Long-term storage" }
  ];

  const transferFee = "Free";
  const transactionId = "INT" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const currentAsset = cryptoAssets.find(a => a.symbol === selectedAsset);
  const availableBalance = currentAsset ? currentAsset.balance : 0;

  const handleTransfer = async () => {
    if (!amount || fromWallet === toWallet) {
      toast({
        title: "Invalid Transfer",
        description: "Please check your transfer details",
        variant: "destructive"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0 || amountNum > availableBalance) {
      toast({
        title: "Invalid Amount",
        description: amountNum > availableBalance 
          ? `Insufficient balance. You have ${availableBalance} ${selectedAsset}` 
          : "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate instant transfer (internal transfers are instant)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsProcessing(false);
    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <SuccessAnimation
            title="Transfer Complete!"
            subtitle="Your internal transfer was successful"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-card shadow-lg border border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium text-foreground">{wallets.find(w => w.id === fromWallet)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium text-foreground">{wallets.find(w => w.id === toWallet)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">{amount} {selectedAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium text-primary">{transferFee}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Reference ID</span>
                  <span className="font-medium font-mono text-sm text-foreground">{transactionId}</span>
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
              onClick={() => navigate("/app/wallet/history")} 
              className="w-full" 
              size="lg"
            >
              View History
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
          <h1 className="text-2xl font-bold text-foreground">Internal Transfer</h1>
        </motion.div>

        <AnimatePresence mode="wait">
          {balancesLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <BalanceCardSkeleton />
              <BalanceCardSkeleton />
              <BalanceCardSkeleton />
            </motion.div>
          ) : cryptoAssets.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                <ArrowRightLeft className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">No Assets to Transfer</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Deposit crypto first to use internal transfers
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
              className="space-y-6"
            >
              {/* Asset Selection */}
              <Card className="bg-card shadow-lg border border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Select Asset</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoAssets.map((asset) => (
                        <SelectItem key={asset.symbol} value={asset.symbol}>
                          <div className="flex items-center gap-2">
                            <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                            <span>{asset.symbol}</span>
                            <span className="text-muted-foreground">
                              - Balance: {asset.balance.toFixed(6)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Wallet Selection */}
              <Card className="bg-card shadow-lg border border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Transfer Between Wallets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      From Wallet
                    </label>
                    <Select value={fromWallet} onValueChange={setFromWallet}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-center">
                    <motion.div
                      animate={{ rotate: [0, 180, 360] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="p-2 rounded-full bg-muted"
                    >
                      <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      To Wallet
                    </label>
                    <Select value={toWallet} onValueChange={setToWallet}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.filter(w => w.id !== fromWallet).map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Amount */}
              <Card className="bg-card shadow-lg border border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Amount</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      onClick={() => setAmount(availableBalance.toString())}
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: <span className="font-medium text-foreground">{availableBalance.toFixed(8)}</span> {selectedAsset}
                  </p>
                </CardContent>
              </Card>

              {/* Fee Information */}
              <Card className="bg-card shadow-lg border border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Transfer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transfer Fee</span>
                    <span className="font-medium text-primary">{transferFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Time</span>
                    <span className="font-medium text-foreground">Instant</span>
                  </div>
                </CardContent>
              </Card>

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
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Transfer Now
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
