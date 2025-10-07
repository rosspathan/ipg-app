import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, QrCode, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCatalog } from "@/hooks/useCatalog";
import AssetLogo from "@/components/AssetLogo";
import QRCode from "qrcode";
import INRDepositScreen from "./INRDepositScreen";
import { copyToClipboard } from "@/utils/clipboard";
import { getStoredEvmAddress, ensureWalletAddressOnboarded, getExplorerUrl, formatAddress } from "@/lib/wallet/evmAddress";

const DepositScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const { assetsList, loading: assetsLoading } = useCatalog();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

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
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading assets...</p>
            </div>
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
          <h1 className="text-2xl font-bold text-foreground">Deposit</h1>
        </div>

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
        <div data-testid="dev-ribbon" className="fixed top-1 right-1 z-50 text-[10px] px-2 py-1 rounded bg-emerald-600/80 text-white">
          USERNAME+WALLET PATCH
        </div>
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