import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Wifi, QrCode, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface WalletConnectScreenProps {
  onWalletConnected: (wallet: any) => void;
  onBack: () => void;
}

const WalletConnectScreen: React.FC<WalletConnectScreenProps> = ({ onWalletConnected, onBack }) => {
  const [wcUri, setWcUri] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!wcUri.trim()) {
      setError('Please enter a WalletConnect URI');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Simulate WalletConnect connection
      // In production, implement actual WalletConnect v2 integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful connection
      const mockWallet = {
        address: '0x' + Math.random().toString(16).substring(2, 42),
        privateKey: null, // WalletConnect doesn't expose private keys
        mnemonic: null,
        qrCode: '',
        isWalletConnect: true,
        wcUri: wcUri.trim()
      };

      toast({
        title: "Wallet Connected",
        description: "Successfully connected via WalletConnect"
      });

      onWalletConnected(mockWallet);
    } catch (error) {
      console.error('WalletConnect error:', error);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleScanQR = () => {
    toast({
      title: "QR Scanner",
      description: "QR code scanning will be available in the mobile app"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-primary-foreground hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-lg font-semibold text-primary-foreground">Connect Wallet</h1>
        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Info Card */}
          <Card className="bg-card/90 backdrop-blur">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Wifi className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">WalletConnect</CardTitle>
              <CardDescription>
                Connect your existing wallet using WalletConnect protocol
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Connection Form */}
          <Card className="bg-card/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Connection Details</CardTitle>
              <CardDescription>
                Enter the WalletConnect URI from your wallet app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">WalletConnect URI</label>
                <Input
                  placeholder="wc:..."
                  value={wcUri}
                  onChange={(e) => {
                    setWcUri(e.target.value);
                    setError('');
                  }}
                  className="font-mono text-sm"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleScanQR}
                  variant="outline"
                  className="flex-1"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan QR
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-card/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">How to Connect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Open your wallet app</p>
                  <p className="text-sm text-muted-foreground">
                    Use MetaMask, Trust Wallet, or any WalletConnect compatible wallet
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Find WalletConnect</p>
                  <p className="text-sm text-muted-foreground">
                    Look for "WalletConnect" or "Scan QR" option
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Copy & Paste URI</p>
                  <p className="text-sm text-muted-foreground">
                    Copy the connection URI and paste it above
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alternative Options */}
          <div className="text-center space-y-3">
            <p className="text-primary-foreground/60 text-sm">Don't have a wallet yet?</p>
            <Button
              variant="outline"
              onClick={() => onBack()}
              className="text-primary-foreground border-white/20 hover:bg-white/10"
            >
              Create New Wallet Instead
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectScreen;