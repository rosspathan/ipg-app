import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Coins } from "lucide-react";

interface UserTransactionHistoryProps {
  userId: string;
}

export function UserTransactionHistory({ userId }: UserTransactionHistoryProps) {
  const isMobile = useIsMobile();
  
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["user-transactions", userId],
    queryFn: async () => {
      const [deposits, withdrawals, trades, bskTransactions] = await Promise.all([
        supabase
          .from("fiat_deposits")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("fiat_withdrawals")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("trades")
          .select("*")
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .order("trade_time", { ascending: false })
          .limit(50),
        supabase
          .from("unified_bsk_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      return {
        deposits: deposits.data || [],
        withdrawals: withdrawals.data || [],
        trades: trades.data || [],
        bskTransactions: bskTransactions.data || [],
      };
    },
  });

  if (isLoading) {
    return (
      <CleanCard padding="md">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </CleanCard>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getBSKTypeColor = (isCredit: boolean) => {
    return isCredit ? "default" : "secondary";
  };

  const formatBSKType = (type: string, subtype: string | null) => {
    if (subtype) {
      return subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-4">
      {/* BSK History Section */}
      <CleanCard padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-4 h-4 text-[hsl(47_100%_50%)]" />
          <h3 className="font-semibold text-[hsl(0_0%_98%)]">BSK History</h3>
          <Badge variant="outline" className="ml-auto">
            {transactions?.bskTransactions.length || 0} transactions
          </Badge>
        </div>
        {transactions?.bskTransactions.length === 0 ? (
          <div className="text-center py-6 text-[hsl(240_10%_70%)]">
            No BSK transactions found
          </div>
        ) : isMobile ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {transactions?.bskTransactions.map((tx: any) => (
              <div key={tx.id} className="p-3 bg-[hsl(220_13%_10%)] border border-[hsl(220_13%_14%/0.4)] rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Date</span>
                  <span className="text-sm text-[hsl(0_0%_98%)]">{format(new Date(tx.created_at), "PPp")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Type</span>
                  <Badge variant={getBSKTypeColor(tx.is_credit)}>
                    {formatBSKType(tx.transaction_type, tx.transaction_subtype)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Amount</span>
                  <span className={`text-sm font-medium ${tx.is_credit ? 'text-[hsl(142_76%_50%)]' : 'text-[hsl(0_84%_60%)]'}`}>
                    {tx.is_credit ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()} BSK
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Balance Type</span>
                  <span className="text-sm text-[hsl(0_0%_98%)]">{tx.balance_type || 'withdrawable'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Status</span>
                  <Badge variant={getStatusColor(tx.status || 'completed')}>{tx.status || 'completed'}</Badge>
                </div>
                {tx.reference_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[hsl(240_10%_70%)]">Reference</span>
                    <span className="text-xs font-mono text-[hsl(0_0%_98%)] truncate max-w-[150px]">{tx.reference_id}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-[hsl(220_13%_10%)]">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.bskTransactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(tx.created_at), "PPp")}</TableCell>
                    <TableCell>
                      <Badge variant={getBSKTypeColor(tx.is_credit)}>
                        {formatBSKType(tx.transaction_type, tx.transaction_subtype)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-medium ${tx.is_credit ? 'text-[hsl(142_76%_50%)]' : 'text-[hsl(0_84%_60%)]'}`}>
                      {tx.is_credit ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()} BSK
                    </TableCell>
                    <TableCell>{tx.balance_type || 'withdrawable'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(tx.status || 'completed')}>{tx.status || 'completed'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">{tx.reference_id || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CleanCard>

      <CleanCard padding="md">
        <h3 className="font-semibold text-[hsl(0_0%_98%)] mb-3">Deposits</h3>
        {isMobile ? (
          <div className="space-y-2">
            {transactions?.deposits.map((deposit: any) => (
              <div key={deposit.id} className="p-3 bg-[hsl(220_13%_10%)] border border-[hsl(220_13%_14%/0.4)] rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Date</span>
                  <span className="text-sm text-[hsl(0_0%_98%)]">{format(new Date(deposit.created_at), "PPp")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Amount</span>
                  <span className="text-sm font-medium text-[hsl(0_0%_98%)]">₹{deposit.amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Method</span>
                  <span className="text-sm text-[hsl(0_0%_98%)]">{deposit.method}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Status</span>
                  <Badge variant={getStatusColor(deposit.status)}>{deposit.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.deposits.map((deposit: any) => (
                  <TableRow key={deposit.id}>
                    <TableCell>{format(new Date(deposit.created_at), "PPp")}</TableCell>
                    <TableCell>₹{deposit.amount}</TableCell>
                    <TableCell>{deposit.method}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(deposit.status)}>{deposit.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{deposit.reference}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CleanCard>

      <CleanCard padding="md">
        <h3 className="font-semibold text-[hsl(0_0%_98%)] mb-3">Withdrawals</h3>
        {isMobile ? (
          <div className="space-y-2">
            {transactions?.withdrawals.map((withdrawal: any) => (
              <div key={withdrawal.id} className="p-3 bg-[hsl(220_13%_10%)] border border-[hsl(220_13%_14%/0.4)] rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Date</span>
                  <span className="text-sm text-[hsl(0_0%_98%)]">{format(new Date(withdrawal.created_at), "PPp")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Amount</span>
                  <span className="text-sm font-medium text-[hsl(0_0%_98%)]">₹{withdrawal.amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Currency</span>
                  <span className="text-sm text-[hsl(0_0%_98%)]">{withdrawal.currency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Status</span>
                  <Badge variant={getStatusColor(withdrawal.status)}>{withdrawal.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.withdrawals.map((withdrawal: any) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>{format(new Date(withdrawal.created_at), "PPp")}</TableCell>
                    <TableCell>₹{withdrawal.amount}</TableCell>
                    <TableCell>{withdrawal.currency}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(withdrawal.status)}>{withdrawal.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{withdrawal.reference_id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CleanCard>

      <CleanCard padding="md">
        <h3 className="font-semibold text-[hsl(0_0%_98%)] mb-3">Trading History</h3>
        {isMobile ? (
          <div className="space-y-2">
            {transactions?.trades.map((trade: any) => (
              <div key={trade.id} className="p-3 bg-[hsl(220_13%_10%)] border border-[hsl(220_13%_14%/0.4)] rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Date</span>
                  <span className="text-sm text-[hsl(0_0%_98%)]">{format(new Date(trade.trade_time), "PPp")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Symbol</span>
                  <span className="text-sm text-[hsl(0_0%_98%)]">{trade.symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Type</span>
                  <Badge variant={trade.buyer_id === userId ? "default" : "secondary"}>
                    {trade.buyer_id === userId ? "BUY" : "SELL"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Quantity</span>
                  <span className="text-sm text-[hsl(0_0%_98%)]">{parseFloat(trade.quantity).toFixed(6)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Total</span>
                  <span className="text-sm font-medium text-[hsl(0_0%_98%)]">₹{parseFloat(trade.total_value).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.trades.map((trade: any) => (
                  <TableRow key={trade.id}>
                    <TableCell>{format(new Date(trade.trade_time), "PPp")}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={trade.buyer_id === userId ? "default" : "secondary"}>
                        {trade.buyer_id === userId ? "BUY" : "SELL"}
                      </Badge>
                    </TableCell>
                    <TableCell>{parseFloat(trade.quantity).toFixed(6)}</TableCell>
                    <TableCell>₹{parseFloat(trade.price).toFixed(2)}</TableCell>
                    <TableCell>₹{parseFloat(trade.total_value).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CleanCard>
    </div>
  );
}