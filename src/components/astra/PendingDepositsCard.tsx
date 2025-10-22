import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { AstraCard } from "./AstraCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AssetLogo from "@/components/AssetLogo";

interface PendingDeposit {
  id: string;
  amount: number;
  tx_hash: string;
  confirmations: number;
  required_confirmations: number;
  status: string;
  created_at: string;
  assets: {
    symbol: string;
    name: string;
    logo_url: string | null;
  };
}

export function PendingDepositsCard() {
  const { user } = useAuthUser();
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const fetchPendingDeposits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('id, amount, tx_hash, confirmations, required_confirmations, status, created_at, assets(symbol, name, logo_url)')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching pending deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDeposits();

    // Real-time subscription for deposit updates
    const channel = supabase
      .channel('pending-deposits')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deposits',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchPendingDeposits();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleRefresh = async (depositId: string) => {
    setRefreshing(depositId);
    try {
      await supabase.functions.invoke('monitor-deposit', {
        body: { deposit_id: depositId }
      });
      
      toast({
        title: "Refreshing",
        description: "Checking confirmation status...",
      });

      // Refetch after a short delay
      setTimeout(() => {
        fetchPendingDeposits();
        setRefreshing(null);
      }, 2000);
    } catch (error: any) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not check status. Please try again.",
        variant: "destructive"
      });
      setRefreshing(null);
    }
  };

  if (loading) {
    return (
      <AstraCard className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AstraCard>
    );
  }

  if (deposits.length === 0) {
    return null; // Don't show card if no pending deposits
  }

  return (
    <AstraCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-sm">Pending Deposits</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchPendingDeposits()}
          className="h-7 px-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3">
        {deposits.map((deposit) => {
          const progress = (deposit.confirmations / deposit.required_confirmations) * 100;
          const isComplete = deposit.confirmations >= deposit.required_confirmations;

          return (
            <div
              key={deposit.id}
              className="p-3 bg-muted/40 rounded-lg border border-border/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AssetLogo 
                    symbol={deposit.assets.symbol} 
                    logoUrl={deposit.assets.logo_url} 
                    size="sm" 
                  />
                  <div>
                    <p className="font-semibold text-sm">
                      {deposit.amount} {deposit.assets.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {deposit.tx_hash.slice(0, 10)}...{deposit.tx_hash.slice(-6)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRefresh(deposit.id)}
                  disabled={refreshing === deposit.id || isComplete}
                  className="h-7 px-2"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing === deposit.id ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {isComplete ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Confirmed
                      </span>
                    ) : (
                      `${deposit.confirmations}/${deposit.required_confirmations} confirmations`
                    )}
                  </span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isComplete ? 'bg-success' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              {deposit.status === 'failed' && (
                <p className="text-xs text-destructive">
                  Verification failed. Please contact support.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Deposits are credited automatically after {deposits[0]?.required_confirmations || 12} confirmations (~3-5 minutes)
      </p>
    </AstraCard>
  );
}
