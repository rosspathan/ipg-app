import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, QrCode } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/contexts/Web3Context";
import QRCode from "qrcode";

const DepositScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { wallet, network } = useWeb3();
  const [selectedAsset, setSelectedAsset] = useState("BNB");
  const [selectedNetwork, setSelectedNetwork] = useState("BSC");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const assets = [
    { symbol: "BNB", name: "Binance Coin", networks: ["BSC"] },
    { symbol: "ETH", name: "Ethereum", networks: ["BSC"] },
    { symbol: "USDT", name: "Tether", networks: ["BSC"] },
    { symbol: "USDC", name: "USD Coin", networks: ["BSC"] },
    { symbol: "BUSD", name: "Binance USD", networks: ["BSC"] }
  ];

  useEffect(() => {
    if (wallet?.address) {
      QRCode.toDataURL(wallet.address, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeDataUrl).catch(console.error);
    }
  }, [wallet?.address]);

  const depositInfo = {
    address: wallet?.address || "Connect wallet to see address",
    minDeposit: selectedAsset === "BNB" ? "0.001 BNB" : "0.01 " + selectedAsset,
    confirmations: "12",
    fee: "Free"
  };

  const copyAddress = () => {
    if (!wallet?.address) {
      toast({
        title: "No Wallet Connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }
    
    navigator.clipboard.writeText(wallet.address);
    toast({
      title: "Address Copied",
      description: "Your BSC wallet address has been copied to clipboard",
    });
  };

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
          <h1 className="text-2xl font-bold text-foreground">Deposit</h1>
        </div>

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
                      {asset.symbol} - {asset.name}
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
                  {assets
                    .find(a => a.symbol === selectedAsset)
                    ?.networks.map((network) => (
                      <SelectItem key={network} value={network}>
                        {network}
                      </SelectItem>
                    ))}
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
                {qrCodeDataUrl && wallet?.address ? (
                  <div className="text-center space-y-2">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="BSC Wallet Address QR Code" 
                      className="w-48 h-48 mx-auto"
                    />
                    <p className="text-xs text-muted-foreground">Scan to get BSC wallet address</p>
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-24 h-24 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Connect wallet to generate QR</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">BSC Wallet Address</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono break-all">
                    {wallet?.address || "Connect wallet to see address"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={copyAddress}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {wallet?.address && (
                <p className="text-xs text-muted-foreground">
                  Network: {network.name} ({network.chainId})
                </p>
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
              Only send BEP20 tokens to this BSC address. Make sure you're using the Binance Smart Chain (BSC) network. 
              Sending tokens from other networks or wrong addresses may result in permanent loss.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DepositScreen;