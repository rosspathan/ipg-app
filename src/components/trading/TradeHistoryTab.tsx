import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  buyer_id: string;
  seller_id: string;
  buyer_fee: number;
  seller_fee: number;
  created_at: string;
}

interface TradeHistoryTabProps {
  symbol?: string;
}

export function TradeHistoryTab({ symbol }: TradeHistoryTabProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      let query = supabase
        .from('trades')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setTrades(data);
      }
      
      setLoading(false);
    };

    fetchTrades();
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No trade history
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        const isBuyer = trade.buyer_id === userId;
        const side = isBuyer ? 'buy' : 'sell';
        const fee = isBuyer ? trade.buyer_fee : trade.seller_fee;
        const total = trade.price * trade.quantity;
        const [base, quote] = trade.symbol.split('/');

        return (
          <div
            key={trade.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-full",
                side === 'buy' ? "bg-emerald-500/20" : "bg-destructive/20"
              )}>
                {side === 'buy' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-semibold uppercase",
                    side === 'buy' ? "text-emerald-400" : "text-destructive"
                  )}>
                    {side}
                  </span>
                  <span className="text-sm font-medium text-foreground">{trade.symbol}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(trade.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-mono text-foreground">
                {trade.quantity.toFixed(6)} {base}
              </div>
              <div className="text-xs text-muted-foreground">
                @ ${trade.price.toFixed(2)} · Fee: {fee.toFixed(4)} {quote}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
