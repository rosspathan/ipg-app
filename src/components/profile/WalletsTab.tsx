import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, Shield, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/hooks/useAuthUser";
import QRCode from "qrcode";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getStoredEvmAddress, ensureWalletAddressOnboarded, getExplorerUrl, formatAddress } from "@/lib/wallet/evmAddress";

export const WalletsTab = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string>('');

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

  // Generate QR code for wallet address
  useEffect(() => {
    if (walletAddress) {
      QRCode.toDataURL(walletAddress, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(setQrCode)
        .catch(console.error);
    }
  }, [walletAddress]);

  const copyToClipboard = async () => {
    if (!walletAddress) return;
    
    try {
      await navigator.clipboard.writeText(walletAddress);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No wallet found. Please create your EVM wallet to receive deposits.
          </AlertDescription>
        </Alert>
        <Button
          onClick={async () => {
            try {
              const addr = await ensureWalletAddressOnboarded();
              setWalletAddress(addr);
              toast({ title: "Wallet Created", description: "Your EVM address is ready" });
            } catch (e) {
              toast({ title: "Wallet setup required", description: "Please complete wallet onboarding in Security", variant: "destructive" });
            }
          }}
        >
          Create Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main BEP20 Wallet Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                My BEP20 Wallet
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Generated from your 12-word recovery phrase
              </p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              BNB Smart Chain
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* QR Code */}
          {qrCode && (
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border-2 border-border shadow-sm">
                <img 
                  src={qrCode} 
                  alt="Wallet Address QR Code" 
                  className="w-64 h-64"
                  data-testid="wallet-qr"
                />
              </div>
            </div>
          )}

          {/* Wallet Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Wallet Address
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/50 rounded-lg p-3 border border-border">
                <p className="font-mono text-sm break-all" data-testid="wallet-evm-address">
                  {formatAddress(walletAddress)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="shrink-0"
                data-testid="wallet-copy"
                aria-live="polite"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Network Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Network</p>
              <p className="font-medium">BNB Smart Chain</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Standard</p>
              <p className="font-medium">BEP20</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>This is your primary wallet address generated from your recovery phrase</p>
          </div>
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>Never share your 12-word recovery phrase with anyone</p>
          </div>
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>Always verify the address before sending funds</p>
          </div>
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>Use the QR code to share your address securely</p>
          </div>
        </CardContent>
      </Card>

      {/* Compatible Networks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compatible Networks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Your BEP20 address is compatible with the following networks:
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-primary/5">BNB Smart Chain (BEP20)</Badge>
              <Badge variant="outline" className="bg-primary/5">Ethereum (ERC20)</Badge>
            </div>
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This address format is compatible with both BEP20 and ERC20 tokens. However, always ensure you're using the correct network when receiving or sending funds.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
