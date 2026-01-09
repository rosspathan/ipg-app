import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CustodialWithdrawal {
  id: string;
  amount: number;
  to_address: string;
  status: string;
  tx_hash: string | null;
  created_at: string;
  processed_at: string | null;
  asset: {
    symbol: string;
    name: string;
  } | null;
}

export function CustodialWithdrawalHistory() {
  const { user } = useAuthUser();

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['custodial-withdrawals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('custodial_withdrawals')
        .select(`
          id,
          amount,
          to_address,
          status,
          tx_hash,
          created_at,
          processed_at,
          asset:asset_id(symbol, name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []) as unknown as CustodialWithdrawal[];
    },
    enabled: !!user,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "outline",
      completed: "default",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!withdrawals || withdrawals.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Withdrawals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {withdrawals.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(w.status)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {Number(w.amount).toFixed(4)} {w.asset?.symbol || 'TOKEN'}
                  </span>
                  {getStatusBadge(w.status)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
            
            {w.tx_hash && (
              <a
                href={`https://bscscan.com/tx/${w.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View TX
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default CustodialWithdrawalHistory;
