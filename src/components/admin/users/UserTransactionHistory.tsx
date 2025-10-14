import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface UserTransactionHistoryProps {
  userId: string;
}

export function UserTransactionHistory({ userId }: UserTransactionHistoryProps) {
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
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
      <Card>
        <CardHeader>
          <CardTitle>Deposits</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trading History</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
