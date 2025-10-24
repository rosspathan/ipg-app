import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Loader2, Search } from 'lucide-react';
import { useErc20OnchainBalance } from '@/hooks/useErc20OnchainBalance';
import { useUserBalance } from '@/hooks/useUserBalance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PendingDeposit {
  symbol: string;
  amount: number;
  network: string;
}

export function PendingDepositsAlert() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Fetch database balances
  const { data: balances, refetch: refetchBalances } = useUserBalance(undefined, true);
  
  // Fetch on-chain balances for supported assets
  const { balance: usdtOnchain } = useErc20OnchainBalance('USDT', 'bsc');
  const { balance: bnbOnchain } = useErc20OnchainBalance('BNB', 'bsc');

  const usdtOnchainNum = Number(usdtOnchain || 0);
  const bnbOnchainNum = Number(bnbOnchain || 0);

  // Detect pending deposits
  const pendingDeposits: PendingDeposit[] = [];
  
  const usdtBalance = Number(balances?.find(b => b.symbol === 'USDT')?.balance || 0);
  const bnbBalance = Number(balances?.find(b => b.symbol === 'BNB')?.balance || 0);

  if (usdtOnchainNum > usdtBalance + 0.000001) {
    pendingDeposits.push({
      symbol: 'USDT',
      amount: usdtOnchainNum - usdtBalance,
      network: 'bsc'
    });
  }

  if (bnbOnchainNum > bnbBalance + 0.000001) {
    pendingDeposits.push({
      symbol: 'BNB',
      amount: bnbOnchainNum - bnbBalance,
      network: 'bsc'
    });
  }

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      toast.info('Scanning recent deposits (7 days)...');

      let totalCreated = 0;

      // First pass: 7-day lookback
      for (const deposit of pendingDeposits) {
        const { data, error } = await supabase.functions.invoke('discover-deposits', {
          body: {
            symbol: deposit.symbol,
            network: deposit.network,
            lookbackHours: 168, // 7 days
          },
        });
        if (error) throw error;
        const created = Number(data?.created ?? (Array.isArray(data?.deposits) ? data.deposits.length : 0) ?? 0);
        totalCreated += created;
      }

      // If nothing found, try a deeper scan (30 days)
      if (totalCreated === 0) {
        toast.info('No new deposits in 7 days. Running deep scan (30 days)...');
        for (const deposit of pendingDeposits) {
          const { data, error } = await supabase.functions.invoke('discover-deposits', {
            body: {
              symbol: deposit.symbol,
              network: deposit.network,
              lookbackHours: 720, // 30 days
            },
          });
          if (error) throw error;
          const created = Number(data?.created ?? (Array.isArray(data?.deposits) ? data.deposits.length : 0) ?? 0);
          totalCreated += created;
        }
      }

      if (totalCreated > 0) {
        toast.success(`Credited ${totalCreated} new deposit${totalCreated > 1 ? 's' : ''}`);
        await refetchBalances();
      } else {
        toast.warning('No deposits found in last 30 days. Try manual verification with your transaction hash.');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Failed to sync: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualVerification = async () => {
    if (!txHash || !txHash.startsWith('0x')) {
      toast.error('Please enter a valid transaction hash (starts with 0x)');
      return;
    }

    setIsVerifying(true);
    try {
      toast.info('Verifying transaction...');
      
      const { data, error } = await supabase.functions.invoke('verify-transaction', {
        body: { txHash: txHash.trim() }
      });

      if (error) throw error;

      if (data.success && data.found) {
        toast.success(data.message || `Credited ${data.amount} ${data.symbol}`);
        await refetchBalances();
        setDialogOpen(false);
        setTxHash('');
      } else if (data.alreadyExists) {
        toast.info('This transaction is already credited to your account');
        setDialogOpen(false);
      } else {
        toast.error(data.message || 'Transaction not found or invalid');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  if (pendingDeposits.length === 0) return null;

  return (
    <Alert className="bg-yellow-500/10 border-yellow-500/50 mb-4">
      <AlertCircle className="h-5 w-5 text-yellow-500" />
      <AlertDescription className="ml-2 flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-yellow-500">
            {pendingDeposits.length} Unsynced Deposit{pendingDeposits.length > 1 ? 's' : ''} Detected
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingDeposits.map(d => `${d.amount.toFixed(6)} ${d.symbol}`).join(', ')} found on blockchain but not credited yet.
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <Button 
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
            onClick={handleSyncAll}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync All
              </>
            )}
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-yellow-500/50">
                <Search className="w-4 h-4 mr-2" />
                Manual Verify
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verify Specific Transaction</DialogTitle>
                <DialogDescription>
                  Enter your transaction hash to manually verify and credit your deposit
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction Hash</label>
                  <Input
                    placeholder="0x..."
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    disabled={isVerifying}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your BscScan transaction hash (starts with 0x)
                  </p>
                </div>
                <Button 
                  onClick={handleManualVerification}
                  disabled={isVerifying || !txHash}
                  className="w-full"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Credit'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </AlertDescription>
    </Alert>
  );
}
