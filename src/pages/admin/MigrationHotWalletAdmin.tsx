import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Copy, 
  Check, 
  AlertTriangle, 
  Wallet,
  ArrowLeft,
  Loader2,
  Fuel,
  Send,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function MigrationHotWalletAdmin() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch current migration wallet - scoped by label
  const { data: migrationWallet, isLoading } = useQuery({
    queryKey: ['migration-hot-wallet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_hot_wallet')
        .select('*')
        .eq('label', 'Migration Hot Wallet')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch BNB balance
  const { data: walletBalance } = useQuery({
    queryKey: ['migration-wallet-balance', migrationWallet?.address],
    queryFn: async () => {
      if (!migrationWallet?.address) return null;
      try {
        const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
        const balance = await provider.getBalance(migrationWallet.address);
        return {
          bnb: ethers.formatEther(balance),
          isLowGas: parseFloat(ethers.formatEther(balance)) < 0.05
        };
      } catch {
        return { bnb: '0', isLowGas: true };
      }
    },
    enabled: !!migrationWallet?.address
  });

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({ title: "Copied", description: `${field} copied to clipboard` });
    } catch {
      toast({ title: "Copy Failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              Migration Hot Wallet
            </h1>
            <p className="text-muted-foreground">
              View-only — Dedicated wallet for BSK on-chain migration transfers
            </p>
          </div>
        </div>

        {/* Locked Notice */}
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Wallet Creation Disabled</AlertTitle>
          <AlertDescription>
            Hot wallet creation is permanently disabled for security. Wallets can only be provisioned via direct database migrations. This prevents unauthorized wallet replacement attacks.
          </AlertDescription>
        </Alert>

        {/* Current Migration Wallet Status */}
        {migrationWallet ? (
          <Card className={walletBalance?.isLowGas ? "border-destructive" : "border-green-500/50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Active Migration Wallet
                <Badge variant="secondary" className="ml-2">View Only</Badge>
                {walletBalance?.isLowGas && (
                  <Badge variant="destructive" className="ml-2">Low Gas</Badge>
                )}
              </CardTitle>
              <CardDescription>Current migration hot wallet status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <div className="flex gap-2">
                  <Input value={migrationWallet.address} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(migrationWallet.address, 'Address')}>
                    {copiedField === 'Address' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {walletBalance && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Fuel className="h-4 w-4" /> BNB for Gas
                    </div>
                    <div className="text-2xl font-bold">{parseFloat(walletBalance.bnb).toFixed(4)} BNB</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Status</div>
                    <div className={`text-2xl font-bold ${walletBalance.isLowGas ? 'text-destructive' : 'text-green-500'}`}>
                      {walletBalance.isLowGas ? 'Low Gas' : 'Healthy'}
                    </div>
                  </div>
                </div>
              )}

              {walletBalance?.isLowGas && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Low Gas Warning</AlertTitle>
                  <AlertDescription>
                    Send BNB to <code className="bg-muted px-1 rounded">{migrationWallet.address}</code> for migration gas fees.
                  </AlertDescription>
                </Alert>
              )}

              <a
                href={`https://bscscan.com/address/${migrationWallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View on BscScan →
              </a>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Migration Wallet Configured</h3>
              <p className="text-muted-foreground text-sm">
                Contact the system administrator to provision a migration wallet via database migration.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Isolation Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Wallet Isolation Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Migration Wallet</strong> — Dedicated to BSK on-chain migration transfers only</li>
              <li>• <strong>Trading Wallet</strong> — Handles user deposits and withdrawals for trading</li>
              <li>• <strong>Staking Wallet</strong> — Isolated wallet for IPG staking deposits only</li>
              <li className="text-destructive">• Wallets are permanently isolated — no cross-wallet operations allowed</li>
              <li className="text-destructive">• New wallet creation is disabled — changes require database migration only</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
