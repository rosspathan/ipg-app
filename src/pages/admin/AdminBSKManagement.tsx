import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminBSKManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<string | null>(null);
  const [processingNotes, setProcessingNotes] = useState("");

  // Fetch pending withdrawals - using withdrawals table with asset filter for BSK
  const { data: withdrawals, isLoading: loadingWithdrawals } = useQuery({
    queryKey: ['admin-bsk-withdrawals'],
    queryFn: async () => {
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
        .eq('asset_id', assets.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(w => w.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      // Merge profiles into withdrawals
      return data?.map(w => ({
        ...w,
        profiles: profiles?.find(p => p.user_id === w.user_id)
      })) || [];
    }
  });

  // Fetch BSK statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-bsk-stats'],
    queryFn: async () => {
      const { data: balances } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, holding_balance');
      
      // Get BSK withdrawals
      const { data: bskAsset } = await supabase
        .from('assets')
        .select('id')
        .eq('symbol', 'BSK')
        .single();

      let pendingAmount = 0;
      if (bskAsset) {
        const { data: pendingWithdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('asset_id', bskAsset.id)
          .eq('status', 'pending');
        
        if (pendingWithdrawals && Array.isArray(pendingWithdrawals)) {
          pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
        }
      }

      const totalWithdrawable = balances?.reduce((sum, b) => sum + Number(b.withdrawable_balance), 0) || 0;
      const totalHolding = balances?.reduce((sum, b) => sum + Number(b.holding_balance), 0) || 0;

      return {
        totalWithdrawable,
        totalHolding,
        pendingWithdrawals: pendingAmount,
        totalUsers: balances?.length || 0
      };
    }
  });

  // Process withdrawal mutation
  const processWithdrawalMutation = useMutation({
    mutationFn: async ({ id, action, txHash }: { id: string; action: 'approve' | 'reject'; txHash?: string }) => {
      const updates: any = {
        status: action === 'approve' ? 'completed' : 'rejected',
        processed_at: new Date().toISOString(),
        admin_notes: processingNotes
      };

      if (action === 'approve' && txHash) {
        updates.tx_hash = txHash;
      }

      const { error } = await supabase
        .from('withdrawals')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bsk-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bsk-stats'] });
      setSelectedWithdrawal(null);
      setProcessingNotes("");
      toast({
        title: "Withdrawal processed",
        description: "The withdrawal has been updated successfully"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "outline", icon: Clock, color: "text-yellow-500" },
      completed: { variant: "default", icon: CheckCircle, color: "text-green-500" },
      rejected: { variant: "destructive", icon: XCircle, color: "text-red-500" }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">BSK Management</h1>
          <p className="text-muted-foreground">Manage BSK withdrawals and system balances</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawable</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWithdrawable.toLocaleString()} BSK</div>
            <p className="text-xs text-muted-foreground">{stats?.totalUsers} users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Holding</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalHolding.toLocaleString()} BSK</div>
            <p className="text-xs text-muted-foreground">Locked balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingWithdrawals.toLocaleString()} BSK</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((stats?.totalWithdrawable || 0) + (stats?.totalHolding || 0)).toLocaleString()} BSK
            </div>
            <p className="text-xs text-muted-foreground">All balances</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals Management */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            {['pending', 'completed', 'rejected'].map(status => (
              <TabsContent key={status} value={status} className="space-y-4">
                {loadingWithdrawals ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {withdrawals
                      ?.filter(w => w.status === status)
                      .map(withdrawal => (
                        <Card key={withdrawal.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {withdrawal.profiles?.full_name || 'Unknown User'}
                                  </span>
                                  {getStatusBadge(withdrawal.status)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {withdrawal.profiles?.email}
                                </div>
                                <div className="text-2xl font-bold">
                                  {Number(withdrawal.amount).toLocaleString()} BSK
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Fee: {Number(withdrawal.fee).toLocaleString()} BSK • 
                                  Net: {Number(withdrawal.net_amount).toLocaleString()} BSK
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  To: {withdrawal.to_address?.slice(0, 6)}...{withdrawal.to_address?.slice(-4)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(withdrawal.created_at), { addSuffix: true })}
                                </div>
                                {withdrawal.tx_hash && (
                                  <div className="text-xs">
                                    TX: <code className="bg-muted px-2 py-1 rounded">{withdrawal.tx_hash}</code>
                                  </div>
                                )}
                              </div>

                              {status === 'pending' && (
                                <div className="space-y-2">
                                  {selectedWithdrawal === withdrawal.id ? (
                                    <div className="space-y-2 w-64">
                                      <Textarea
                                        placeholder="Processing notes..."
                                        value={processingNotes}
                                        onChange={(e) => setProcessingNotes(e.target.value)}
                                        className="h-20"
                                      />
                                      <Input
                                        placeholder="TX Hash (for approval)"
                                        id={`tx-${withdrawal.id}`}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            const txInput = document.getElementById(`tx-${withdrawal.id}`) as HTMLInputElement;
                                            processWithdrawalMutation.mutate({
                                              id: withdrawal.id,
                                              action: 'approve',
                                              txHash: txInput?.value
                                            });
                                          }}
                                          disabled={processWithdrawalMutation.isPending}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() =>
                                            processWithdrawalMutation.mutate({
                                              id: withdrawal.id,
                                              action: 'reject'
                                            })
                                          }
                                          disabled={processWithdrawalMutation.isPending}
                                        >
                                          <XCircle className="h-4 w-4 mr-1" />
                                          Reject
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setSelectedWithdrawal(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => setSelectedWithdrawal(withdrawal.id)}
                                    >
                                      Process
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    {withdrawals?.filter(w => w.status === status).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No {status} withdrawals
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
