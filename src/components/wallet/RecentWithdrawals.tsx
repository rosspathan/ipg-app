import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { CheckCircle2, Clock, Loader2, XCircle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import AssetLogo from "@/components/AssetLogo";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  tx_hash: string | null;
  to_address: string;
  created_at: string;
  fee: number | null;
  assets: {
    symbol: string;
    name: string;
    logo_url: string | null;
  } | null;
}

export function RecentWithdrawals({ limit = 5 }: { limit?: number }) {
  const { user } = useAuthUser();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWithdrawals = async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          id, 
          amount, 
          status, 
          tx_hash, 
          to_address,
          fee,
          created_at,
          assets (symbol, name, logo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (!error && data) {
        setWithdrawals(data as Withdrawal[]);
      }
      setLoading(false);
    };

    fetchWithdrawals();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('withdrawals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchWithdrawals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, limit]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'pending':
      case 'processing':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-primary';
      case 'pending':
      case 'processing':
        return 'text-amber-500';
      case 'failed':
      case 'rejected':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No recent withdrawals
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {withdrawals.map((withdrawal, index) => (
          <motion.div
            key={withdrawal.id}
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
              <div className="relative">
                <AssetLogo 
                  symbol={withdrawal.assets?.symbol || '?'} 
                  logoUrl={withdrawal.assets?.logo_url} 
                  size="sm" 
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                  <ArrowUpRight className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  -{withdrawal.amount} {withdrawal.assets?.symbol || ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  To: {formatAddress(withdrawal.to_address)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(withdrawal.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <div className="text-right flex items-center gap-2">
              {getStatusIcon(withdrawal.status)}
              <div>
                <p className={cn("text-xs font-medium capitalize", getStatusColor(withdrawal.status))}>
                  {withdrawal.status}
                </p>
                {withdrawal.fee && withdrawal.fee > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Fee: {withdrawal.fee}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
