import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, TrendingUp, Wallet } from "lucide-react";

interface TransactionStatsProps {
  stats: {
    pending_deposits: number;
    pending_withdrawals: number;
    today_volume_inr: number;
    today_volume_bsk: number;
  };
}

const TransactionStats = ({ stats }: TransactionStatsProps) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending_deposits}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Awaiting approval
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending_withdrawals}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Awaiting approval
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's INR Volume</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{formatNumber(stats.today_volume_inr)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Approved transactions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's BSK Volume</CardTitle>
          <Wallet className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.today_volume_bsk)} BSK</div>
          <p className="text-xs text-muted-foreground mt-1">
            Withdrawn today
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionStats;
