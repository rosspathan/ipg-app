import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, ScanLine, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import INRWithdrawScreen from "./INRWithdrawScreen";
import { QRScanner } from "@/components/scanner/QRScanner";
import { useUserBalance } from "@/hooks/useUserBalance";
import { supabase } from "@/integrations/supabase/client";
import { validateCryptoAddress } from "@/lib/validation/cryptoAddressValidator";
import { useWithdrawalFees } from "@/hooks/useWithdrawalFees";
import { useOpenOrdersCheck } from "@/hooks/useOpenOrdersCheck";

const WithdrawScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cleanupRanRef = useRef(false);
  
  // Check for pre-selected asset from URL params
  const searchParams = new URLSearchParams(window.location.search)
  const preSelectedAsset = searchParams.get('asset')
  
  const [selectedAsset, setSelectedAsset] = useState(preSelectedAsset || "");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    error?: string;
  }>({ isValid: false });

  // Fetch real user balances - showAllAssets to display all withdrawal-enabled assets
  const { data: balances, isLoading, error } = useUserBalance(undefined, true);
  
  // Get dynamic withdrawal fees
  const { fees: withdrawalFees, loading: feesLoading } = useWithdrawalFees(selectedAsset, selectedNetwork);

  // Check for open orders that might lock funds
  const { data: openOrdersData } = useOpenOrdersCheck(selectedAsset);

  // Filter assets - hide dust balances below threshold
  const MIN_WITHDRAWAL_BALANCE = 0.001;

  // Auto-cleanup duplicated test balances (same number across many assets)
  useEffect(() => {
    if (cleanupRanRef.current) return;
    if (isLoading || error || !balances?.length) return;

    const nonDust = balances
      .filter((b) => (b.available ?? 0) >= MIN_WITHDRAWAL_BALANCE)
      .filter((b) => b.symbol !== 'INR');

    if (nonDust.length < 5) return;

    const buckets = new Map<
      string,
      { value: number; count: number; symbols: Set<string> }
    >();

    for (const b of nonDust) {
      const raw = Number(b.available ?? 0);
      const rounded = Math.round(raw * 1e8) / 1e8; // normalize floating point noise
      const key = rounded.toFixed(8);

      const existing = buckets.get(key) ?? {
        value: rounded,
        count: 0,
        symbols: new Set<string>(),
      };

      existing.count += 1;
      existing.symbols.add(b.symbol);
      buckets.set(key, existing);
    }

    let mode: { value: number; count: number; symbols: Set<string> } | null = null;
    for (const v of buckets.values()) {
      if (!mode || v.count > mode.count) mode = v;
    }

    // Only trigger when it's clearly a duplicated/test pattern across many different assets
    if (!mode || mode.count < 5 || mode.symbols.size < 5) return;

    cleanupRanRef.current = true;

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('cleanup-fake-balances', {
          body: { value: mode!.value },
        });

        if (fnError) throw fnError;

        const deletedCount = (data as any)?.deleted_count ?? 0;
        if (deletedCount > 0) {
          toast({
            title: 'Removed fake balances',
            description: `Cleaned ${deletedCount} duplicated balance entries.`,
          });
          queryClient.invalidateQueries({ queryKey: ['user-balance'] });
        }
      } catch (e: any) {
        cleanupRanRef.current = false; // allow retry
        console.error('[WithdrawScreen] cleanup-fake-balances failed', e);
        toast({
          title: 'Failed to clean balances',
          description: e?.message ?? 'Please refresh and try again.',
          variant: 'destructive',
        });
      }
    })();
  }, [balances, isLoading, error, toast, queryClient]);

  const assets = (balances || [])
    .filter(asset => 
      asset.symbol !== 'BSK' && 
      asset.symbol !== 'INR' &&
      asset.network !== 'fiat' &&
      asset.network !== 'FIAT' &&
      asset.available >= MIN_WITHDRAWAL_BALANCE // Only show meaningful balances
    )
    .map(asset => ({
      symbol: asset.symbol,
      name: asset.name,
      balance: asset.available.toString(),
      available: asset.available,
      locked: asset.locked,
      logo_url: asset.logo_url,
      withdraw_fee: asset.withdraw_fee,
      // Use actual network from database, fallback to array for compatibility
      networks: asset.network ? [asset.network] : ['BEP20'],
    }))
    // Sort: assets with balance first (highest first), then alphabetically for zero balances
    .sort((a, b) => {
      if (a.available > 0 && b.available <= 0) return -1;
      if (a.available <= 0 && b.available > 0) return 1;
      if (a.available > 0 && b.available > 0) return b.available - a.available;
      return a.symbol.localeCompare(b.symbol);
    });

  // Set initial selected asset when balances load
  useEffect(() => {
    if (assets.length > 0) {
      // If pre-selected asset exists in URL, use it
      if (preSelectedAsset) {
        const preSelected = assets.find(a => a.symbol === preSelectedAsset)
        if (preSelected) {
          setSelectedAsset(preSelected.symbol)
          setSelectedNetwork(preSelected.networks[0])
          return
        }
      }
      
      // Otherwise use first asset
      if (!selectedAsset) {
        setSelectedAsset(assets[0].symbol);
        setSelectedNetwork(assets[0].networks[0]);
      }
    }
  }, [assets, selectedAsset, preSelectedAsset]);

  // Validate address whenever it changes
  useEffect(() => {
    if (!address || !selectedNetwork) {
      setAddressValidation({ isValid: false });
      return;
    }

    const validation = validateCryptoAddress(address, selectedNetwork);
    setAddressValidation({
      isValid: validation.isValid,
      error: validation.error
    });
  }, [address, selectedNetwork]);

  const currentAsset = assets.find(a => a.symbol === selectedAsset);
  const netAmount = amount && withdrawalFees 
    ? (parseFloat(amount) - withdrawalFees.totalFee).toFixed(8) 
    : "0";

  const handleWithdraw = () => {
    if (!address || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!addressValidation.isValid) {
      toast({
        title: "Invalid Address",
        description: addressValidation.error || "Please enter a valid wallet address",
        variant: "destructive"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    const availableBalance = currentAsset?.available || 0;
    
    if (availableBalance === 0) {
      toast({
        title: "No Balance",
        description: `You have 0 ${selectedAsset}. Please deposit first.`,
        variant: "destructive"
      });
      return;
    }
    
    if (amountNum > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${availableBalance} ${selectedAsset} available`,
        variant: "destructive"
      });
      return;
    }

    setShowConfirmation(true);
  };

  const confirmWithdraw = async () => {
    setIsProcessing(true);
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
        title: "Withdrawal Processing",
        description: `Your ${amount} ${selectedAsset} is being sent to ${address}. Check transaction history for status.`,
      });
      
      navigate("/app/wallet");
    } catch (error: any) {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive"
      });
      setShowConfirmation(false);
    } finally {
      setIsProcessing(false);
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
                <span className="font-medium">{withdrawalFees?.totalFee.toFixed(8)} {selectedAsset}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Net Amount</span>
                <span className="font-semibold">{netAmount} {selectedAsset}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={confirmWithdraw} 
              className="w-full" 
              size="lg"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm with PIN/Biometric'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmation(false)} 
              className="w-full" 
              size="lg"
              disabled={isProcessing}
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

            {/* Empty state */}
            {!isLoading && !error && assets.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Withdrawal Assets Available</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  No crypto assets are currently enabled for withdrawal. Please contact support to enable crypto withdrawals.
                </p>
              </div>
            )}

            {/* Withdrawal Form - Only show if assets available */}
            {!isLoading && !error && assets.length > 0 && (
              <>
                {/* Open Orders Warning */}
                {openOrdersData?.hasOpenOrders && openOrdersData.totalLockedByAsset[selectedAsset] > 0 && (
                  <Alert className="bg-warning/10 border-warning/30">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning-foreground">
                      <strong>Funds Locked in Orders:</strong> You have {openOrdersData.openOrdersCount} open order(s) 
                      locking {openOrdersData.totalLockedByAsset[selectedAsset]?.toFixed(4)} {selectedAsset}. 
                      Cancel orders to unlock funds for withdrawal.
                    </AlertDescription>
                  </Alert>
                )}

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
                  className={`font-mono flex-1 ${
                    address && !addressValidation.isValid 
                      ? 'border-destructive focus-visible:ring-destructive' 
                      : address && addressValidation.isValid 
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : ''
                  }`}
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
              {address && addressValidation.error && (
                <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                  <XCircle className="w-3 h-3" />
                  {addressValidation.error}
                </div>
              )}
              {address && addressValidation.isValid && (
                <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Valid {selectedNetwork} address
                </div>
              )}
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
            {feesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Calculating fees...</span>
              </div>
            ) : withdrawalFees ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="font-medium">{withdrawalFees.networkFee} {selectedAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-medium">{withdrawalFees.platformFee} {selectedAsset}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold">Total Fee</span>
                  <span className="font-semibold">{withdrawalFees.totalFee.toFixed(8)} {selectedAsset}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold text-primary">Net Amount</span>
                  <span className="font-semibold text-primary">
                    {amount && (parseFloat(amount) - withdrawalFees.totalFee).toFixed(8)} {selectedAsset}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ⏱️ Estimated Time: {withdrawalFees.estimatedTime}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select asset and network to see fees</p>
            )}
          </CardContent>
        </Card>

        <Button 
          onClick={handleWithdraw} 
          className="w-full" 
          size="lg"
          disabled={!addressValidation.isValid || !amount || parseFloat(amount) <= 0}
        >
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