import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const TransferScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [fromWallet, setFromWallet] = useState("main");
  const [toWallet, setToWallet] = useState("trading");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const assets = [
    { symbol: "BTC", name: "Bitcoin", balance: "0.00234567" },
    { symbol: "ETH", name: "Ethereum", balance: "1.45" },
    { symbol: "USDT", name: "Tether", balance: "1250.00" },
    { symbol: "USDC", name: "USD Coin", balance: "500.00" }
  ];

  const wallets = [
    { id: "main", name: "Main Wallet", description: "Your primary wallet" },
    { id: "trading", name: "Trading Wallet", description: "For active trading" },
    { id: "savings", name: "Savings Wallet", description: "Long-term storage" }
  ];

  const transferFee = "Free";
  const transactionId = "INT" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const currentAsset = assets.find(a => a.symbol === selectedAsset);

  const handleTransfer = () => {
    if (!amount || fromWallet === toWallet) {
      toast({
        title: "Invalid Transfer",
        description: "Please check your transfer details",
        variant: "destructive"
      });
      return;
    }

    // Simulate instant transfer
    setTimeout(() => {
      setShowSuccess(true);
    }, 500);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Transfer Complete!</h1>
            <p className="text-muted-foreground">Your internal transfer was successful</p>
          </div>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium">{wallets.find(w => w.id === fromWallet)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">{wallets.find(w => w.id === toWallet)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{amount} {selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-medium text-green-600">{transferFee}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Reference ID</span>
                <span className="font-medium font-mono text-sm">{transactionId}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button onClick={() => navigate("/wallet-home")} className="w-full" size="lg">
              Back to Wallet
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/history")} 
              className="w-full" 
              size="lg"
            >
              View History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/wallet-home")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Internal Transfer</h1>
        </div>

        {/* Asset Selection */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Select Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.symbol} value={asset.symbol}>
                    {asset.symbol} - Balance: {asset.balance}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Wallet Selection */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Transfer Between Wallets</CardTitle>
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
              <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />
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
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                step="any"
              />
              <Button 
                variant="outline" 
                onClick={() => setAmount(currentAsset?.balance || "")}
              >
                Max
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Available: {currentAsset?.balance} {selectedAsset}
            </p>
          </CardContent>
        </Card>

        {/* Fee Information */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Transfer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transfer Fee</span>
              <span className="font-medium text-green-600">{transferFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Time</span>
              <span className="font-medium">Instant</span>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleTransfer} className="w-full" size="lg">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Transfer Now
        </Button>
      </div>
    </div>
  );
};

export default TransferScreen;