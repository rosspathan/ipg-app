import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BacklinkBar } from '@/components/programs-pro/BacklinkBar';
import { 
  Wallet, 
  Copy, 
  Check, 
  ArrowDown,
  Info,
  RefreshCw,
  ExternalLink,
  QrCode,
  Loader2
} from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { useCryptoStakingAccount } from '@/hooks/useCryptoStakingAccount';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

export default function StakingDepositScreen() {
  const { navigate } = useNavigation();
  const { user } = useSession();
  const { depositAddress, availableBalance, stakingFee, isLoading, refetchAccount } = useCryptoStakingAccount();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isCheckingDeposit, setIsCheckingDeposit] = useState(false);
  const [userWalletAddress, setUserWalletAddress] = useState<string | null>(null);

  // Fetch user's wallet address from profiles
  useEffect(() => {
    const fetchWallet = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('bsc_wallet_address, wallet_address')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserWalletAddress(data.bsc_wallet_address || data.wallet_address || null);
      }
    };
    
    fetchWallet();
  }, [user?.id]);

  const copyToClipboard = async () => {
    if (!depositAddress) return;
    
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Deposit address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const checkForDeposit = async () => {
    setIsCheckingDeposit(true);
    try {
      // Call edge function to check for new deposits
      const { data, error } = await supabase.functions.invoke('staking-deposit-monitor', {
        body: { user_id: user?.id }
      });
      
      if (error) throw error;
      
      refetchAccount();
      
      if (data?.deposited) {
        toast({
          title: "Deposit Found!",
          description: `${data.amount} IPG has been credited to your staking account.`,
        });
      } else {
        toast({
          title: "No New Deposits",
          description: "No new deposits detected. Deposits may take a few minutes.",
        });
      }
    } catch (error: any) {
      console.error('Error checking deposits:', error);
      toast({
        title: "Check Failed",
        description: error.message || "Could not check for deposits",
        variant: "destructive",
      });
    } finally {
      setIsCheckingDeposit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!depositAddress) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="px-4 py-6 space-y-6">
          <BacklinkBar programName="Fund Staking" parentRoute="/app/staking" />
          
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-6 text-center">
              <Info className="h-12 w-12 text-warning mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Deposits Not Available</h3>
              <p className="text-sm text-muted-foreground">
                Staking deposits are not configured yet. Please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 py-6 space-y-6">
        <BacklinkBar programName="Fund Staking Account" parentRoute="/app/staking" />

        {/* Current Balance Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staking Account Balance</p>
                <p className="text-xl font-bold text-foreground">{availableBalance.toFixed(4)} IPG</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Alert className="border-info/30 bg-info/5">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-sm">
            Send IPG tokens from your personal wallet to the deposit address below. 
            Your staking account will be credited automatically (usually within 1-5 minutes).
          </AlertDescription>
        </Alert>

        {/* Deposit Address Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-primary" />
              Deposit Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Badge variant="secondary">BEP-20 / BSC</Badge>
                IPG Token Only
              </Label>
              <div className="flex gap-2">
                <Input 
                  value={depositAddress} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* QR Code Toggle */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowQR(!showQR)}
            >
              <QrCode className="h-4 w-4 mr-2" />
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </Button>

            {showQR && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG 
                  value={depositAddress} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
            )}

            <a
              href={`https://bscscan.com/address/${depositAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View on BscScan <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        {/* User's Wallet Info */}
        {userWalletAddress && (
          <Card className="border-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Your Wallet Address:</p>
              <p className="font-mono text-xs break-all">{userWalletAddress}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Deposits from this address will be automatically detected.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Check for Deposits */}
        <Button
          onClick={checkForDeposit}
          disabled={isCheckingDeposit}
          className="w-full"
          variant="outline"
        >
          {isCheckingDeposit ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for New Deposits
            </>
          )}
        </Button>

        {/* Important Notes */}
        <Card className="border-muted/30 bg-muted/5">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">Important:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Only send <strong>IPG tokens</strong> on <strong>BSC network</strong></li>
              <li>• Deposits are typically credited within 1-5 minutes</li>
              <li>• A {stakingFee}% fee is applied when you stake (not on deposit)</li>
              <li>• Minimum stake amount depends on the plan you choose</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
