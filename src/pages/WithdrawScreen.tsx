import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, ScanLine, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import INRWithdrawScreen from "./INRWithdrawScreen";
import { QRScanner } from "@/components/scanner/QRScanner";
import { useUserBalance } from "@/hooks/useUserBalance";
import { supabase } from "@/integrations/supabase/client";

const WithdrawScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Fetch real user balances
  const { data: balances, isLoading, error } = useUserBalance();

  // Filter assets with balance > 0 and add network info
  const assets = balances?.filter(asset => asset.balance > 0).map(asset => ({
    symbol: asset.symbol,
    name: asset.name,
    balance: asset.balance.toString(),
    available: asset.available,
    logo_url: asset.logo_url,
    // Default networks based on asset type
    networks: asset.symbol === 'BTC' ? ['Bitcoin'] :
              asset.symbol === 'ETH' ? ['Ethereum', 'BSC'] :
              asset.symbol === 'USDT' ? ['Ethereum', 'BSC', 'Tron'] :
              asset.symbol === 'USDC' ? ['Ethereum', 'BSC'] :
              ['Ethereum'] // default
  })) || [];

  // Set initial selected asset when balances load
  useEffect(() => {
    if (assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].symbol);
      setSelectedNetwork(assets[0].networks[0]);
    }
  }, [assets, selectedAsset]);

  const feeInfo = {
    networkFee: "0.0005 BTC",
    platformFee: "0.0001 BTC",
    totalFee: "0.0006 BTC"
  };

  const currentAsset = assets.find(a => a.symbol === selectedAsset);
  const netAmount = amount ? (parseFloat(amount) - 0.0006).toFixed(8) : "0";

  const handleWithdraw = () => {
    if (!address || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    setShowConfirmation(true);
  };

  const confirmWithdraw = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: {
          asset_symbol: selectedAsset,
          network: selectedNetwork,
          to_address: address,
          amount: amount
        }
      });

      if (error) throw error;

      toast({
        title: "Withdrawal Submitted",
        description: data.message || "Your withdrawal request has been submitted successfully",
      });
      
      navigate("/app/wallet");
    } catch (error: any) {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive"
      });
      setShowConfirmation(false);
    }
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <div className="text-center space-y-4">
            <Shield className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Confirm Withdrawal</h1>
            <p className="text-muted-foreground">Please confirm your withdrawal details</p>
          </div>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Asset</span>
                <span className="font-medium">{selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{selectedNetwork}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To Address</span>
                <span className="font-medium font-mono text-sm">{address.slice(0, 8)}...{address.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{amount} {selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Fee</span>
                <span className="font-medium">{feeInfo.totalFee}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Net Amount</span>
                <span className="font-semibold">{netAmount} {selectedAsset}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button onClick={confirmWithdraw} className="w-full" size="lg">
              Confirm with PIN/Biometric
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmation(false)} 
              className="w-full" 
              size="lg"
            >
              Cancel
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/wallet")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Withdraw</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app/history/withdrawals")}
          >
            History
          </Button>
        </div>

        {/* Tabs for Crypto and INR */}
        <Tabs defaultValue="crypto" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
            <TabsTrigger value="inr">INR (Bank/UPI)</TabsTrigger>
          </TabsList>

          <TabsContent value="crypto" className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <Card className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-8 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <p className="text-muted-foreground">Loading balances...</p>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-6">
                  <p className="text-destructive">Failed to load balances. Please try again.</p>
                </CardContent>
              </Card>
            )}

            {/* No Assets Available */}
            {!isLoading && !error && assets.length === 0 && (
              <Card className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-2">No crypto assets available for withdrawal</p>
                  <p className="text-sm text-muted-foreground">Your crypto balances are currently zero.</p>
                </CardContent>
              </Card>
            )}

            {/* Withdrawal Form - Only show if assets available */}
            {!isLoading && !error && assets.length > 0 && (
              <>

        {/* Asset Selection */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Select Asset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Asset
              </label>
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
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Network
              </label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentAsset?.networks.map((network) => (
                    <SelectItem key={network} value={network}>
                      {network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Details */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Withdrawal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Recipient Address
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter recipient address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowScanner(true)}
                  className="shrink-0"
                  aria-label="Scan QR Code"
                >
                  <ScanLine className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Amount
              </label>
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
              <p className="text-xs text-muted-foreground mt-1">
                Available: {currentAsset?.balance} {selectedAsset}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fee Breakdown */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Fee Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span className="font-medium">{feeInfo.networkFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="font-medium">{feeInfo.platformFee}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">Total Fee</span>
              <span className="font-semibold">{feeInfo.totalFee}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold text-primary">Net Amount</span>
              <span className="font-semibold text-primary">{netAmount} {selectedAsset}</span>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleWithdraw} className="w-full" size="lg">
          Withdraw
        </Button>
              </>
            )}
              </TabsContent>

              <TabsContent value="inr">
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">INR Withdrawals</h3>
                  <p className="text-muted-foreground mb-4">
                    Withdraw your funds directly to your Indian bank account or UPI.
                  </p>
                  <Button 
                    onClick={() => navigate('/app-legacy/withdraw/inr')}
                    className="w-full"
                  >
                    Start INR Withdrawal
                  </Button>
                </div>
              </TabsContent>
        </Tabs>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(scannedAddress) => {
          setAddress(scannedAddress);
          toast({
            title: "Address Scanned",
            description: "Wallet address has been populated",
          });
        }}
      />
    </div>
  );
};

export default WithdrawScreen;