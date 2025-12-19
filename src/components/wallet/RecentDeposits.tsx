import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface Deposit {
  id: string;
  asset_id: string;
  amount: number;
  status: string;
  tx_hash: string;
  confirmations: number;
  created_at: string;
}

export function RecentDeposits({ assetId }: { assetId?: string }) {
  const { user } = useAuthUser();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDeposits = async () => {
      const baseQuery = supabase
        .from('deposits')
        .select('id, asset_id, amount, status, tx_hash, confirmations, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data, error } = assetId 
        ? await baseQuery.eq('asset_id', assetId)
        : await baseQuery;
      
      if (!error && data) {
        setDeposits(data as Deposit[]);
      }
      setLoading(false);
    };

    fetchDeposits();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('deposits-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposits',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDeposits(prev => [payload.new as Deposit, ...prev].slice(0, 5));
          } else if (payload.eventType === 'UPDATE') {
            setDeposits(prev => 
              prev.map(d => d.id === payload.new.id ? payload.new as Deposit : d)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, assetId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'credited':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'pending':
      case 'confirming':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'credited':
        return 'text-primary';
      case 'pending':
      case 'confirming':
        return 'text-amber-500';
      case 'failed':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No recent deposits
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {deposits.map((deposit, index) => (
          <motion.div
            key={deposit.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              "bg-muted/30 hover:bg-muted/50 transition-colors"
            )}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(deposit.status)}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {deposit.amount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(deposit.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className={cn("text-xs font-medium capitalize", getStatusColor(deposit.status))}>
                {deposit.status}
              </p>
              {deposit.status === 'confirming' && (
                <p className="text-xs text-muted-foreground">
                  {deposit.confirmations}/12 confirms
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
