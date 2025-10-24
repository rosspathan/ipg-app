import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useErc20OnchainBalance } from '@/hooks/useErc20OnchainBalance';
import { useUserBalance } from '@/hooks/useUserBalance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingDeposit {
  symbol: string;
  amount: number;
  network: string;
}

export function PendingDepositsAlert() {
  const [isSyncing, setIsSyncing] = useState(false);
  
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
        toast.info('No new deposits found. If your on-chain balance is older or came from a non-transfer source, contact support.');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Failed to sync: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingDeposits.length === 0) return null;

  return (
    <Alert className="bg-yellow-500/10 border-yellow-500/50 mb-4">
      <AlertCircle className="h-5 w-5 text-yellow-500" />
      <AlertDescription className="ml-2 flex items-center justify-between">
        <div>
          <p className="font-medium text-yellow-500">
            {pendingDeposits.length} Unsynced Deposit{pendingDeposits.length > 1 ? 's' : ''} Detected
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingDeposits.map(d => `${d.amount.toFixed(6)} ${d.symbol}`).join(', ')} found on blockchain but not credited yet.
          </p>
        </div>
        <Button 
          className="bg-yellow-500 hover:bg-yellow-600 text-black ml-4"
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
      </AlertDescription>
    </Alert>
  );
}
