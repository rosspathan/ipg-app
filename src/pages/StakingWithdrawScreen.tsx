import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BacklinkBar } from '@/components/programs-pro/BacklinkBar';
import { 
  Wallet, 
  ArrowUp,
  AlertTriangle,
  Info,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { useCryptoStakingAccount } from '@/hooks/useCryptoStakingAccount';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function StakingWithdrawScreen() {
  const { navigate } = useNavigation();
  const { user } = useSession();
  const { availableBalance, unstakingFee, isLoading, refetchAccount } = useCryptoStakingAccount();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
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

  const withdrawAmount = parseFloat(amount) || 0;
  const feeAmount = withdrawAmount * (unstakingFee / 100);
  const netAmount = withdrawAmount - feeAmount;

  const handleMaxAmount = () => {
    setAmount(availableBalance.toString());
  };

  const handleWithdraw = async () => {
    setShowConfirmation(false);
    setIsWithdrawing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-staking-withdrawal', {
        body: { amount: withdrawAmount }
      });
      
      if (error) throw error;
      
      setWithdrawSuccess(true);
      refetchAccount();
      
      toast({
        title: "Withdrawal Submitted",
        description: `${netAmount.toFixed(4)} IPG will be sent to your wallet.`,
      });
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Could not process withdrawal",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (withdrawSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="px-4 py-6 space-y-6">
          <BacklinkBar programName="Withdrawal" parentRoute="/app/staking" />
          
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-xl mb-2">Withdrawal Submitted!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your withdrawal of {netAmount.toFixed(4)} IPG has been submitted. 
                It will be processed and sent to your wallet shortly.
              </p>
              <Button onClick={() => navigate('/app/staking')}>
                Back to Staking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 py-6 space-y-6">
        <BacklinkBar programName="Withdraw to Wallet" parentRoute="/app/staking" />

        {/* Available Balance Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available to Withdraw</p>
                  <p className="text-xl font-bold text-foreground">{availableBalance.toFixed(4)} IPG</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning if low balance */}
        {availableBalance < 1 && (
          <Alert className="border-warning/30 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              You need at least 1 IPG to make a withdrawal.
            </AlertDescription>
          </Alert>
        )}

        {/* Withdrawal Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-primary" />
              Withdraw IPG
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Amount to Withdraw</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  max={availableBalance}
                  step="0.0001"
                />
                <Button variant="outline" onClick={handleMaxAmount}>
                  Max
                </Button>
              </div>
            </div>

            {/* Fee Breakdown */}
            {withdrawAmount > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Withdrawal Amount</span>
                  <span>{withdrawAmount.toFixed(4)} IPG</span>
                </div>
                <div className="flex justify-between text-sm text-destructive">
                  <span>Fee ({unstakingFee}%)</span>
                  <span>-{feeAmount.toFixed(4)} IPG</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>You Receive</span>
                  <span className="text-primary">{netAmount.toFixed(4)} IPG</span>
                </div>
              </div>
            )}

            {/* Destination */}
            {userWalletAddress && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Destination Wallet</Label>
                <Input 
                  value={userWalletAddress} 
                  readOnly 
                  className="font-mono text-xs"
                />
              </div>
            )}

            <Button
              onClick={() => setShowConfirmation(true)}
              disabled={withdrawAmount < 1 || withdrawAmount > availableBalance || isWithdrawing}
              className="w-full"
              size="lg"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Withdraw {netAmount > 0 ? `${netAmount.toFixed(4)} IPG` : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-muted/30 bg-muted/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Withdrawal Info</p>
                <p>• Withdrawals are processed within a few minutes</p>
                <p>• A {unstakingFee}% fee is deducted from all withdrawals</p>
                <p>• IPG will be sent to your registered wallet on BSC</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Withdrawal</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to withdraw from your staking account:</p>
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Amount:</span>
                    <span>{withdrawAmount.toFixed(4)} IPG</span>
                  </div>
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Fee:</span>
                    <span>-{feeAmount.toFixed(4)} IPG</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-semibold">
                    <span>You Receive:</span>
                    <span>{netAmount.toFixed(4)} IPG</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw}>
              Confirm Withdrawal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
