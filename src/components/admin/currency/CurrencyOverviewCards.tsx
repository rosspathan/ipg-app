import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Users, Wallet, Lock } from "lucide-react";

interface CurrencyStats {
  bsk: {
    total_withdrawable: number;
    total_holding: number;
    total_supply: number;
    user_count: number;
  };
  inr: {
    total_balance: number;
    total_locked: number;
    total_deposited: number;
    total_withdrawn: number;
    user_count: number;
  };
  rate: {
    current_rate: number;
    last_updated: string;
  };
}

interface CurrencyOverviewCardsProps {
  stats: CurrencyStats;
}

const CurrencyOverviewCards = ({ stats }: CurrencyOverviewCardsProps) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* BSK Total Supply */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">BSK Total Supply</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.bsk.total_supply)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatNumber(stats.bsk.user_count)} users with BSK
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            <div>Withdrawable: {formatNumber(stats.bsk.total_withdrawable)}</div>
            <div>Holding: {formatNumber(stats.bsk.total_holding)}</div>
          </div>
        </CardContent>
      </Card>

      {/* BSK-INR Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">BSK to INR Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{formatNumber(stats.rate.current_rate)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            per BSK
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Updated: {formatDate(stats.rate.last_updated)}
          </p>
        </CardContent>
      </Card>

      {/* INR Total Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">INR Total Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{formatNumber(stats.inr.total_balance)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatNumber(stats.inr.user_count)} users with INR
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Locked: ₹{formatNumber(stats.inr.total_locked)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* INR Flow */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">INR Flow</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground">Total Deposited</div>
              <div className="text-lg font-bold text-green-600">
                ₹{formatNumber(stats.inr.total_deposited)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Withdrawn</div>
              <div className="text-lg font-bold text-red-600">
                ₹{formatNumber(stats.inr.total_withdrawn)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrencyOverviewCards;
