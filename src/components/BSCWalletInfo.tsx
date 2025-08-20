import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const BSCWalletInfo = () => {
  const { wallet, network, getBalance, switchNetwork } = useWeb3();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!wallet) return null;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    try {
      await getBalance();
      toast({
        title: "Balance Updated",
        description: "Your BSC balance has been refreshed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh balance",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewOnExplorer = () => {
    const explorerUrl = `${network.blockExplorerUrl}/address/${wallet.address}`;
    window.open(explorerUrl, '_blank');
  };

  const handleSwitchNetwork = () => {
    const isCurrentlyTestnet = network.chainId === 97;
    switchNetwork(!isCurrentlyTestnet);
  };

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            BSC Wallet
          </div>
          <Badge variant={wallet.network === 'mainnet' ? 'default' : 'secondary'}>
            {network.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Network:</span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${wallet.network === 'mainnet' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span>{network.name}</span>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Address:</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopyAddress}
              className="h-6 px-2"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <div className="font-mono text-xs break-all bg-muted p-2 rounded">
            {wallet.address}
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Balance:</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {wallet.balance ? `${parseFloat(wallet.balance).toFixed(4)} ${network.currency}` : 'Loading...'}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefreshBalance}
              disabled={isRefreshing}
              className="h-6 px-2"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleViewOnExplorer}
            className="flex-1"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Explorer
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSwitchNetwork}
            className="flex-1"
          >
            Switch to {wallet.network === 'mainnet' ? 'Testnet' : 'Mainnet'}
          </Button>
        </div>

        {/* Network Details */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <div className="flex justify-between mb-1">
            <span>Chain ID:</span>
            <span>{network.chainId}</span>
          </div>
          <div className="flex justify-between">
            <span>Currency:</span>
            <span>{network.currency}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BSCWalletInfo;