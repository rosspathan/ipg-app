import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionTable from "@/components/admin/transactions/TransactionTable";
import ApprovalQueue from "@/components/admin/transactions/ApprovalQueue";
import TransactionStats from "@/components/admin/transactions/TransactionStats";
import TransactionFilters from "@/components/admin/transactions/TransactionFilters";

interface TransactionStats {
  pending_deposits: number;
  pending_withdrawals: number;
  today_volume_inr: number;
  today_volume_bsk: number;
}

const TransactionControlCenter = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Count pending deposits
      const { count: pendingDeposits } = await supabase
        .from('fiat_deposits')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Count pending withdrawals
      const { count: pendingWithdrawals } = await supabase
        .from('fiat_withdrawals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Calculate today's INR volume
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: depositsToday } = await supabase
        .from('fiat_deposits')
        .select('amount')
        .eq('status', 'approved')
        .gte('created_at', today.toISOString());

      const { data: withdrawalsToday } = await supabase
        .from('fiat_withdrawals')
        .select('amount')
        .eq('status', 'approved')
        .gte('created_at', today.toISOString());

      const todayVolumeINR = 
        (depositsToday?.reduce((sum, d) => sum + Number(d.amount), 0) || 0) +
        (withdrawalsToday?.reduce((sum, w) => sum + Number(w.amount), 0) || 0);

      // Calculate today's BSK volume
      const { data: bskWithdrawals } = await supabase
        .from('bsk_withdrawal_requests')
        .select('amount_bsk')
        .eq('status', 'approved')
        .gte('created_at', today.toISOString());

      const todayVolumeBSK = bskWithdrawals?.reduce((sum, w) => sum + Number(w.amount_bsk), 0) || 0;

      setStats({
        pending_deposits: pendingDeposits || 0,
        pending_withdrawals: pendingWithdrawals || 0,
        today_volume_inr: todayVolumeINR,
        today_volume_bsk: todayVolumeBSK,
      });
    } catch (error) {
      console.error('Error loading transaction stats:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    loadStats();
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Transaction Control Center</h1>
          <p className="text-muted-foreground mt-1">
            Monitor, approve, and manage all platform transactions
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && <TransactionStats stats={stats} />}

      {/* Main Content Tabs */}
      <Tabs defaultValue="approval-queue" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="approval-queue">Approval Queue</TabsTrigger>
          <TabsTrigger value="all-transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="inr-transactions">INR</TabsTrigger>
          <TabsTrigger value="bsk-transactions">BSK</TabsTrigger>
        </TabsList>

        <TabsContent value="approval-queue" className="mt-6">
          <ApprovalQueue onApprove={handleRefresh} />
        </TabsContent>

        <TabsContent value="all-transactions" className="mt-6">
          <TransactionTable transactionType="all" />
        </TabsContent>

        <TabsContent value="inr-transactions" className="mt-6">
          <TransactionTable transactionType="inr" />
        </TabsContent>

        <TabsContent value="bsk-transactions" className="mt-6">
          <TransactionTable transactionType="bsk" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransactionControlCenter;
