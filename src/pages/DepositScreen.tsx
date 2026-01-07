import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, QrCode, ExternalLink, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCatalog } from "@/hooks/useCatalog";
import { useDepositTracking } from "@/hooks/useDepositTracking";
import AssetLogo from "@/components/AssetLogo";
import QRCode from "qrcode";
import INRDepositScreen from "./INRDepositScreen";
import { copyToClipboard } from "@/utils/clipboard";
import { getStoredEvmAddress, ensureWalletAddressOnboarded, getExplorerUrl, formatAddress } from "@/lib/wallet/evmAddress";
import { useUsernameBackfill } from "@/hooks/useUsernameBackfill";
import { useDisplayName } from "@/hooks/useDisplayName";
import { supabase } from "@/integrations/supabase/client";
import { RecentDeposits } from "@/components/wallet/RecentDeposits";
import { motion, AnimatePresence } from "framer-motion";

const DepositScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const displayName = useDisplayName();
  const { assetsList, loading: assetsLoading } = useCatalog();
  const { recordDeposit, loading: depositLoading } = useDepositTracking();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [txHash, setTxHash] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRecorded, setDepositRecorded] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  useUsernameBackfill(); // Backfill username if missing

  // Fetch wallet address from profiles table
  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const addr = await getStoredEvmAddress(user.id);
        if (addr) setWalletAddress(addr);
      } catch (error) {
        console.error('Error fetching wallet address:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletAddress();
  }, [user]);

  // Filter assets that have deposit enabled
  const depositableAssets = assetsList.filter(asset => 
    asset.deposit_enabled && asset.is_active
  );

  // Set default selections when assets load
  useEffect(() => {
    if (depositableAssets.length > 0 && !selectedAsset) {
      const defaultAsset = depositableAssets.find(a => a.symbol === "USDT") || depositableAssets[0];
      setSelectedAsset(defaultAsset.symbol);
      setSelectedNetwork(defaultAsset.network);
    }
  }, [depositableAssets, selectedAsset]);

  const currentAsset = depositableAssets.find(asset => asset.symbol === selectedAsset);

  // Generate QR code when wallet address is available
  useEffect(() => {
    if (walletAddress) {
      QRCode.toDataURL(walletAddress, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeDataUrl).catch(console.error);
    }
  }, [walletAddress]);

  // Debug marker with masked data
  useEffect(() => {
    console.info('CLEAN_SLATE_APPLIED');
    if (user?.email && walletAddress) {
      const maskedEmail = user.email.slice(0, 2) + '***@' + user.email.split('@')[1];
      const maskedAddr = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'none';
      console.info('USR_WALLET_PATCH_OK', { username: displayName, email: maskedEmail, evm: maskedAddr });
    }
  }, [user?.email, walletAddress, displayName]);

  const depositInfo = {
    address: walletAddress || "No wallet found",
    minDeposit: currentAsset ? `${currentAsset.min_withdraw_amount} ${currentAsset.symbol}` : "N/A",
    confirmations: "12",
    fee: currentAsset ? `${currentAsset.withdraw_fee} ${currentAsset.symbol}` : "Free"
  };

  if (loading || assetsLoading) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/wallet")} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Deposit</h1>
          </div>
          <div className="flex justify-center items-center min-h-[200px]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading assets...</p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const copyAddress = async () => {
    if (!walletAddress) {
      toast({
        title: "No Wallet Found",
        description: "Please create a wallet first",
        variant: "destructive"
      });
      return;
    }
    
    const success = await copyToClipboard(walletAddress);
    
    if (success) {
      toast({
        title: "Address Copied",
        description: "Your BEP20 wallet address has been copied to clipboard",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  const handleRecordDeposit = async () => {
    if (!txHash || txHash.length < 10) {
      toast({
        title: "Invalid Transaction Hash",
        description: "Please enter a valid transaction hash",
        variant: "destructive"
      });
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive"
      });
      return;
    }

    const minDeposit = currentAsset?.min_withdraw_amount || 0;
    if (parseFloat(depositAmount) < minDeposit) {
      toast({
        title: "Amount Too Low",
        description: `Minimum deposit is ${minDeposit} ${selectedAsset}`,
        variant: "destructive"
      });
      return;
    }

    try {
      await recordDeposit({
        asset_symbol: selectedAsset,
        amount: parseFloat(depositAmount),
        tx_hash: txHash,
        network: selectedNetwork
      });
      
      setDepositRecorded(true);
      setTxHash("");
      setDepositAmount("");
      
      toast({
        title: "Deposit Tracking Started",
        description: "We're monitoring your transaction on-chain. Balance will update after 12 confirmations.",
      });
      
      // Reset after 5 seconds
      setTimeout(() => {
        setDepositRecorded(false);
      }, 5000);
    } catch (error) {
      console.error('Record deposit error:', error);
    }
  };

  const handleDiscoverDeposits = async () => {
    if (!user) return;

    setDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke('discover-deposits', {
        body: { 
          symbol: selectedAsset, 
          network: selectedNetwork,
          lookbackHours: 48 
        }
      });

      if (error) throw error;

      if (data.created > 0) {
        toast({
          title: "Deposits Found!",
          description: `Found ${data.created} deposit(s). Starting confirmation monitoring...`,
        });

        // Trigger monitor-deposit for each created deposit
        for (const dep of data.deposits || []) {
          try {
            await supabase.functions.invoke('monitor-deposit', {
              body: { deposit_id: dep.deposit_id }
            });
          } catch (err) {
            console.warn('Monitor trigger failed:', err);
          }
        }
      } else {
        toast({
          title: "No New Deposits",
          description: `No untracked ${selectedAsset} deposits found in the past 48 hours.`,
        });
      }
    } catch (error: any) {
      console.error('Discover deposits error:', error);
      toast({
        title: "Discovery Failed",
        description: error.message || "Could not search for deposits. Please try recording manually.",
        variant: "destructive"
      });
    } finally {
      setDiscovering(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-foreground">Deposit</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app/history/crypto")}
          >
            History
          </Button>
        </motion.div>

        {/* Tabs for Crypto and INR */}
        <Tabs defaultValue="crypto" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
            <TabsTrigger value="inr">INR (Bank/UPI)</TabsTrigger>
          </TabsList>

          <TabsContent value="crypto" className="space-y-6">

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
                  {depositableAssets.map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      <div className="flex items-center gap-2">
                        <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                        {asset.symbol} - {asset.name}
                      </div>
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
                  <SelectItem key={currentAsset?.network || "BSC"} value={currentAsset?.network || "BSC"}>
                    {currentAsset?.network || "BSC"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Deposit Address */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Deposit Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg">
                {qrCodeDataUrl && walletAddress ? (
                  <div className="text-center space-y-2">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="BEP20 Wallet Address QR Code" 
                      className="w-48 h-48 mx-auto"
                      data-testid="deposit-qr"
                    />
                    <p className="text-xs text-muted-foreground">Scan to get BSC/ERC20 address</p>
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-24 h-24 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No wallet found</p>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={async () => {
                          try {
                            const addr = await ensureWalletAddressOnboarded();
                            setWalletAddress(addr);
                            toast({ title: "Address ready", description: "Your EVM address is now available" });
                          } catch (e) {
                            toast({ title: "Setup required", description: "Please complete wallet onboarding in Security", variant: "destructive" });
                          }
                        }}
                      >
                        Generate Address
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {selectedNetwork === 'BEP20' || selectedNetwork === 'BSC' ? 'BEP20' : 'ERC20'} Wallet Address
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono break-all" data-testid="deposit-evm-address">
                    {walletAddress ? formatAddress(walletAddress) : "No wallet found. Please create a wallet first."}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyAddress} 
                  disabled={!walletAddress}
                  data-testid="deposit-copy"
                  aria-live="polite"
                  aria-label="Copy address to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {walletAddress && (
                <div className="flex items-center gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Network: {selectedNetwork === 'BEP20' || selectedNetwork === 'BSC' ? 'Binance Smart Chain (56)' : 'Ethereum (1)'}
                  </p>
                  <a
                    href={getExplorerUrl(walletAddress, selectedNetwork === 'BEP20' || selectedNetwork === 'BSC' ? 'bsc' : 'ethereum')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline underline-offset-2 flex items-center gap-1 hover:text-primary"
                    data-testid="deposit-explorer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Explorer
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deposit Information */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Deposit Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minimum Deposit</span>
              <span className="font-medium">{depositInfo.minDeposit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required Confirmations</span>
              <span className="font-medium">{depositInfo.confirmations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposit Fee</span>
              <span className="font-medium text-green-600">{depositInfo.fee}</span>
            </div>
          </CardContent>
        </Card>

        {/* Auto-discover button */}
        <Card className="bg-card shadow-lg border border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Track Your Deposit
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your transaction details or let us find it automatically
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleDiscoverDeposits}
                disabled={discovering || !walletAddress}
                variant="outline"
                className="w-full group"
              >
                {discovering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching blockchain...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                    Find my deposit automatically
                  </>
                )}
              </Button>
            </motion.div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Deposit Amount <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                step="any"
                placeholder={`Amount in ${selectedAsset}`}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                disabled={depositLoading || depositRecorded}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the exact amount you deposited (min: {depositInfo.minDeposit})
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Transaction Hash <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                disabled={depositLoading || depositRecorded}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your transaction hash to track deposit confirmation
              </p>
            </div>
            <Button 
              onClick={handleRecordDeposit}
              disabled={depositLoading || !txHash || !depositAmount || depositRecorded}
              className="w-full"
            >
              {depositLoading ? "Recording..." : depositRecorded ? "Deposit Recorded ✓" : "Record Deposit"}
            </Button>
            {depositRecorded && (
              <div className="flex items-center gap-2 text-sm text-success bg-success/10 p-3 rounded-lg">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>Deposit recorded! Balance will be credited automatically after 12 confirmations (~3-5 minutes).</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warning */}
        <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {selectedNetwork === 'BEP20' || selectedNetwork === 'BSC' 
                ? 'Only send BEP20 tokens to this address using Binance Smart Chain (BSC) network.' 
                : 'Only send ERC20 tokens to this address using Ethereum network.'}
              {' '}Sending tokens from wrong networks may result in permanent loss.
            </p>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="inr">
            <INRDepositScreen />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DepositScreen;