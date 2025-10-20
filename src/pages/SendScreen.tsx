import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { supabase } from "@/integrations/supabase/client";
import { useSensitiveAction } from "@/hooks/useSensitiveAction";

const SendScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { balances, loading, error, refetch } = useWalletBalances();
  const { executeWithUnlock } = useSensitiveAction();
  
  const [selectedAsset, setSelectedAsset] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Filter assets with available balance > 0
  const availableAssets = balances.filter(b => b.available > 0);
  
  // Set default selected asset when balances load
  if (!selectedAsset && availableAssets.length > 0) {
    setSelectedAsset(availableAssets[0].symbol);
  }

  const currentAsset = balances.find(b => b.symbol === selectedAsset);
  
  // Calculate fee (0.1% or minimum 0.0001)
  const calculateFee = () => {
    if (!amount || !currentAsset) return 0;
    const amt = parseFloat(amount);
    if (isNaN(amt)) return 0;
    return Math.max(amt * 0.001, 0.0001);
  };

  const fee = calculateFee();
  const netAmount = parseFloat(amount || "0") - fee;

  const handleSend = async () => {
    if (!recipient || !amount || !selectedAsset) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    if (!currentAsset || transferAmount > currentAsset.available) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${currentAsset?.available || 0} ${selectedAsset} available`,
        variant: "destructive"
      });
      return;
    }

    // Execute with PIN/biometric verification
    await executeWithUnlock(async () => {
      setTransferring(true);
      try {
        const { data, error } = await supabase.functions.invoke('process-internal-transfer', {
          body: {
            asset_symbol: selectedAsset,
            recipient_identifier: recipient,
            amount: transferAmount
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        console.log('Transfer successful:', data);
        setSuccessData(data);
        setShowSuccess(true);
        
        // Refresh balances
        setTimeout(() => refetch(), 500);
      } catch (err: any) {
        console.error('Transfer failed:', err);
        toast({
          title: "Transfer Failed",
          description: err.message || "Please try again",
          variant: "destructive"
        });
      } finally {
        setTransferring(false);
      }
    });
  };

  if (showSuccess && successData) {
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
                <span className="font-medium">{successData.recipient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{successData.amount} {selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-medium">{successData.fee.toFixed(8)} {selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Received</span>
                <span className="font-medium text-green-600">{successData.net_amount.toFixed(8)} {selectedAsset}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-medium font-mono text-sm">{successData.transaction_id}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
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
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/wallet")} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Send to User</h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // No assets available
  if (availableAssets.length === 0) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/wallet")} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Send to User</h1>
          </div>
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-muted-foreground">You don't have any assets available to send.</p>
              <Button onClick={() => navigate("/app/wallet")} variant="outline">
                Back to Wallet
              </Button>
            </CardContent>
          </Card>
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
            onClick={() => navigate("/app/wallet")}
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
                {availableAssets.map((asset) => (
                  <SelectItem key={asset.symbol} value={asset.symbol}>
                    <div className="flex items-center space-x-2">
                      {asset.logo_url && (
                        <img src={asset.logo_url} alt={asset.symbol} className="w-5 h-5 rounded-full" />
                      )}
                      <span>{asset.symbol} - {asset.name}</span>
                    </div>
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
                onClick={() => setAmount(currentAsset?.available.toString() || "")}
              >
                Max
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Available: {currentAsset?.available.toFixed(8)} {selectedAsset}
            </p>
            {fee > 0 && (
              <p className="text-xs text-muted-foreground">
                Fee: {fee.toFixed(8)} {selectedAsset} • You'll send: {netAmount.toFixed(8)} {selectedAsset}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Fee Information */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Transfer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="font-medium text-green-600">0.1% (min 0.0001 {selectedAsset})</span>
            </div>
            {fee > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Fee</span>
                  <span className="font-medium">{fee.toFixed(8)} {selectedAsset}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground font-medium">Recipient Receives</span>
                  <span className="font-bold text-green-600">{netAmount.toFixed(8)} {selectedAsset}</span>
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Internal transfers are processed instantly
            </p>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSend} 
          className="w-full" 
          size="lg"
          disabled={transferring || !currentAsset || !amount || !recipient}
        >
          {transferring ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send with PIN/Biometric
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SendScreen;