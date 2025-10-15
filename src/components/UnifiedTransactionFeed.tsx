import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Gift, 
  Users, 
  Eye,
  Coins,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'bonus' | 'referral' | 'ad_reward' | 'transfer';
  amount: number;
  asset: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  metadata?: any;
}

export const UnifiedTransactionFeed: React.FC = () => {
  const { user } = useAuthUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposits' | 'rewards'>('all');

  const fetchTransactions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch various transaction types and unify them
      const [bonusRes, referralRes, adRewardRes] = await Promise.all([
        // Bonus ledger (BSK earnings)
        supabase
          .from('bonus_ledger')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        
        // Referral events (commission earnings)
        supabase
          .from('referral_events')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        
        // Ad click rewards
        supabase
          .from('ad_clicks')
          .select('*')
          .eq('user_id', user.id)
          .eq('rewarded', true)
          .order('started_at', { ascending: false })
          .limit(20)
      ]);

      const unified: Transaction[] = [];

      // Process bonus ledger entries
      if (bonusRes.data) {
        bonusRes.data.forEach(bonus => {
          unified.push({
            id: `bonus_${bonus.id}`,
            type: 'bonus',
            amount: bonus.amount_bsk,
            asset: 'BSK',
            timestamp: bonus.created_at,
            status: 'completed',
            description: `BSK Bonus - ${bonus.type}`,
            metadata: bonus.meta_json
          });
        });
      }

      // Process referral events
      if (referralRes.data) {
        referralRes.data.forEach(ref => {
          unified.push({
            id: `ref_${ref.id}`,
            type: 'referral',
            amount: ref.amount_bonus,
            asset: 'BSK',
            timestamp: ref.created_at,
            status: 'completed',
            description: `Referral Commission - Level ${ref.level}`,
            metadata: { action: ref.action }
          });
        });
      }

      // Process ad rewards
      if (adRewardRes.data) {
        adRewardRes.data.forEach(ad => {
          unified.push({
            id: `ad_${ad.id}`,
            type: 'ad_reward',
            amount: ad.reward_bsk || 0,
            asset: 'BSK',
            timestamp: ad.completed_at || ad.started_at,
            status: 'completed',
            description: 'Ad Viewing Reward',
            metadata: { subscription_tier: ad.subscription_tier }
          });
        });
      }

      // Sort by timestamp descending
      unified.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setTransactions(unified);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Real-time subscription for new transactions
    const channel = supabase
      .channel('transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bonus_ledger',
          filter: `user_id=eq.${user?.id}`
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return <ArrowDownCircle className="h-5 w-5 text-success" />;
      case 'withdrawal': return <ArrowUpCircle className="h-5 w-5 text-destructive" />;
      case 'bonus': return <Gift className="h-5 w-5 text-accent" />;
      case 'referral': return <Users className="h-5 w-5 text-primary" />;
      case 'ad_reward': return <Eye className="h-5 w-5 text-warning" />;
      case 'trade': return <TrendingUp className="h-5 w-5 text-info" />;
      default: return <Coins className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-success/20 text-success">Completed</Badge>;
      case 'pending': return <Badge variant="secondary" className="bg-warning/20 text-warning">Pending</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'deposits') return ['deposit', 'transfer'].includes(tx.type);
    if (filter === 'rewards') return ['bonus', 'referral', 'ad_reward'].includes(tx.type);
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/30 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Transaction History
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTransactions}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'deposits' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('deposits')}
          >
            Deposits
          </Button>
          <Button
            variant={filter === 'rewards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('rewards')}
          >
            Rewards
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No transactions yet</p>
            <p className="text-sm mt-1">Start earning rewards to see your history</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background/50">
                      {getIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={cn(
                      "font-semibold",
                      tx.type === 'withdrawal' ? 'text-destructive' : 'text-success'
                    )}>
                      {tx.type === 'withdrawal' ? '-' : '+'}
                      {tx.amount.toFixed(2)} {tx.asset}
                    </p>
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
