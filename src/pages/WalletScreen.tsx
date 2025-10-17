import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, TrendingUp, Clock, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function WalletScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch BSK balance
  const { data: bskBalance, isLoading: loadingBalance } = useQuery({
    queryKey: ['user-bsk-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_bsk_balances')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch transaction history
  const { data: transactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ['user-bsk-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('bonus_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch withdrawals - filter by BSK asset
  const { data: withdrawals, isLoading: loadingWithdrawals } = useQuery({
    queryKey: ['user-bsk-withdrawals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get BSK asset ID first
      const { data: assets } = await supabase
        .from('assets')
        .select('id')
        .eq('symbol', 'BSK')
        .single();

      if (!assets) return [];
      
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_id', assets.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const getTransactionIcon = (type: string) => {
    if (type.includes('withdrawal')) return ArrowUpRight;
    if (type.includes('deposit') || type.includes('bonus')) return ArrowDownLeft;
    return TrendingUp;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "outline", className: "border-yellow-500 text-yellow-500" },
      completed: { variant: "default", className: "bg-green-500" },
      rejected: { variant: "destructive", className: "" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  if (loadingBalance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Wallet</h1>
          <p className="text-muted-foreground">Manage your BSK balance and transactions</p>
        </div>
        <Button onClick={() => navigate('/app/withdraw')}>
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Withdraw BSK
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Withdrawable Balance</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(bskBalance?.withdrawable_balance || 0).toLocaleString()} BSK
            </div>
            <p className="text-xs text-muted-foreground">Available to withdraw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Holding Balance</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(bskBalance?.holding_balance || 0).toLocaleString()} BSK
            </div>
            <p className="text-xs text-muted-foreground">Locked/vesting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(Number(bskBalance?.withdrawable_balance || 0) + Number(bskBalance?.holding_balance || 0)).toLocaleString()} BSK
            </div>
            <p className="text-xs text-muted-foreground">All balances combined</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {loadingTransactions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : transactions && transactions.length > 0 ? (
                transactions.map((tx) => {
                  const Icon = getTransactionIcon(tx.type);
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{tx.type.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {tx.type.includes('withdrawal') ? '-' : '+'}{Number(tx.amount_bsk).toLocaleString()} BSK
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              )}
            </TabsContent>

            <TabsContent value="withdrawals" className="space-y-3">
              {loadingWithdrawals ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : withdrawals && withdrawals.length > 0 ? (
                withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Withdrawal</p>
                        <p className="text-sm text-muted-foreground">
                          To: {withdrawal.to_address?.slice(0, 6)}...{withdrawal.to_address?.slice(-4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(withdrawal.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-lg">-{Number(withdrawal.amount).toLocaleString()} BSK</p>
                      <p className="text-xs text-muted-foreground">
                        Fee: {Number(withdrawal.fee).toLocaleString()} BSK
                      </p>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No withdrawals yet
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
