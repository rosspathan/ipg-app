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

interface UserTransactionHistoryProps {
  userId: string;
}

export function UserTransactionHistory({ userId }: UserTransactionHistoryProps) {
  const isMobile = useIsMobile();
  
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["user-transactions", userId],
    queryFn: async () => {
      const [deposits, withdrawals, trades] = await Promise.all([
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
      ]);

      return {
        deposits: deposits.data || [],
        withdrawals: withdrawals.data || [],
        trades: trades.data || [],
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

  return (
    <div className="space-y-4">
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
