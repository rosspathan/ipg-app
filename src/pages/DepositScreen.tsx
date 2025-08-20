import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, QrCode } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const DepositScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [selectedNetwork, setSelectedNetwork] = useState("Bitcoin");

  const assets = [
    { symbol: "BTC", name: "Bitcoin", networks: ["Bitcoin"] },
    { symbol: "ETH", name: "Ethereum", networks: ["Ethereum", "BSC"] },
    { symbol: "USDT", name: "Tether", networks: ["Ethereum", "BSC", "Tron"] },
    { symbol: "USDC", name: "USD Coin", networks: ["Ethereum", "BSC"] }
  ];

  const depositInfo = {
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    minDeposit: "0.0001 BTC",
    confirmations: "1",
    fee: "Free"
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(depositInfo.address);
    toast({
      title: "Address Copied",
      description: "Deposit address has been copied to clipboard",
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
            {/* QR Code Placeholder */}
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="w-24 h-24 text-muted-foreground" />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono break-all">{depositInfo.address}</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyAddress}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
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
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              Only send {selectedAsset} to this address via {selectedNetwork} network. 
              Sending other assets or using wrong network may result in permanent loss.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DepositScreen;