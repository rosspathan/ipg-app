import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, ExternalLink, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WalletInfo {
  wallet_address: string;
  balances: Record<string, string>;
  explorer_url: string;
}

export function AdminWalletCard() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchWalletInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-wallet-info');
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      setWalletInfo(data);
    } catch (err: any) {
      console.error('Error fetching admin wallet info:', err);
      toast.error('Failed to fetch admin wallet info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletInfo();
  }, []);

  const copyAddress = () => {
    if (walletInfo?.wallet_address) {
      navigator.clipboard.writeText(walletInfo.wallet_address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Admin Wallet (BSC)
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={fetchWalletInfo}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !walletInfo ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        ) : walletInfo ? (
          <>
            {/* Wallet Address */}
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <code className="text-sm font-mono flex-1">
                {shortenAddress(walletInfo.wallet_address)}
              </code>
              <Button variant="ghost" size="icon" onClick={copyAddress} className="h-8 w-8">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(walletInfo.explorer_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(walletInfo.balances).map(([symbol, balance]) => (
                <div key={symbol} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="font-medium text-sm">{symbol}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatBalance(balance)}
                  </span>
                </div>
              ))}
            </div>

            {/* Full address (small) */}
            <p className="text-xs text-muted-foreground break-all font-mono">
              {walletInfo.wallet_address}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Failed to load wallet info</p>
        )}
      </CardContent>
    </Card>
  );
}
