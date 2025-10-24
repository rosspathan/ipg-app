import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface TransactionStats {
  pending_deposits_count: number;
  pending_deposits_amount: number;
  pending_withdrawals_count: number;
  pending_withdrawals_amount: number;
  approved_today_count: number;
  fees_collected_today: number;
  fees_collected_month: number;
}

export const AdminTransactionDashboard = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['transaction-stats', refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_transaction_stats');
      if (error) throw error;
      return data as unknown as TransactionStats;
    },
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (statsLoading || !stats) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats.pending_deposits_count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{stats.pending_deposits_amount.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.pending_withdrawals_count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{stats.pending_withdrawals_amount.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.approved_today_count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Transactions processed
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fees Collected</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₹{stats.fees_collected_today.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{stats.fees_collected_month.toLocaleString()} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction Management</CardTitle>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="deposits" className="flex-1">
                Deposits
                {stats.pending_deposits_count > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {stats.pending_deposits_count}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex-1">
                Withdrawals
                {stats.pending_withdrawals_count > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                    {stats.pending_withdrawals_count}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-accent/20">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-warning" />
                        Action Required
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Pending Deposits:</span>
                          <span className="font-semibold text-warning">
                            {stats.pending_deposits_count}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pending Withdrawals:</span>
                          <span className="font-semibold text-destructive">
                            {stats.pending_withdrawals_count}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-accent/20">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Revenue
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Today's Fees:</span>
                          <span className="font-semibold text-primary">
                            ₹{stats.fees_collected_today.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Month:</span>
                          <span className="font-semibold text-primary">
                            ₹{stats.fees_collected_month.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-center text-sm text-muted-foreground py-4">
                  Use the tabs above to review and manage pending transactions
                </div>
              </div>
            </TabsContent>

            <TabsContent value="deposits" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">Navigate to specific deposit management sections:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '#inr-deposits'}>
                    INR Deposits
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '#crypto-inr'}>
                    Crypto→INR Deposits
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="withdrawals" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">Navigate to specific withdrawal management sections:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '#inr-withdrawals'}>
                    INR Withdrawals
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
