import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const SendScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const assets = [
    { symbol: "BTC", name: "Bitcoin", balance: "0.00234567" },
    { symbol: "ETH", name: "Ethereum", balance: "1.45" },
    { symbol: "USDT", name: "Tether", balance: "1250.00" },
    { symbol: "USDC", name: "USD Coin", balance: "500.00" }
  ];

  const transferFee = "0.001 BTC";
  const transactionId = "TXN" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const currentAsset = assets.find(a => a.symbol === selectedAsset);

  const handleSend = () => {
    if (!recipient || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Simulate PIN/biometric confirmation and instant success
    setTimeout(() => {
      setShowSuccess(true);
    }, 1000);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Transfer Successful!</h1>
            <p className="text-muted-foreground">Your transfer has been completed</p>
          </div>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">{recipient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{amount} {selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-medium">{transferFee}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Transaction ID</span>
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
          <h1 className="text-2xl font-bold text-foreground">Send to User</h1>
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

        {/* Recipient Information */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Recipient</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Username, Email, Phone, or Referral Code"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter the recipient's username, email, phone number, or referral code
            </p>
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
            <CardTitle className="text-lg">Transfer Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="font-medium text-green-600">{transferFee}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Internal transfers are processed instantly
            </p>
          </CardContent>
        </Card>

        <Button onClick={handleSend} className="w-full" size="lg">
          <Send className="w-4 h-4 mr-2" />
          Send with PIN/Biometric
        </Button>
      </div>
    </div>
  );
};

export default SendScreen;