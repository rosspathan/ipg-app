import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, ExternalLink, Download, TrendingDown, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCustodialWithdrawals, useProcessCustodialWithdrawal } from "@/hooks/useCustodialWithdrawals";
import { useHotWalletStatus } from "@/hooks/useHotWalletStatus";

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  asset: string;
  to_address?: string;
  tx_hash?: string;
  admin_notes?: string;
  profiles?: {
    email: string;
    full_name: string;
  } | null;
}

export default function UnifiedWithdrawalManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch INR withdrawals
  const { data: fiatWithdrawals, isLoading: loadingFiat } = useQuery({
    queryKey: ['admin-fiat-withdrawals', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('fiat_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const withdrawalsWithProfiles = await Promise.all(
        (data || []).map(async (w): Promise<Withdrawal> => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', w.user_id)
            .maybeSingle();
          
          return {
            id: w.id,
            user_id: w.user_id,
            amount: Number(w.amount),
            status: w.status,
            created_at: w.created_at,
            asset: 'INR',
            tx_hash: w.reference_id,
            admin_notes: w.admin_notes,
            profiles: profile
          };
        })
      );
      
      return withdrawalsWithProfiles;
    }
  });

  // Fetch crypto withdrawals
  const { data: cryptoWithdrawals, isLoading: loadingCrypto } = useQuery({
    queryKey: ['admin-crypto-withdrawals', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('withdrawals')
        .select('*, assets:asset_id(symbol)')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const withdrawalsWithProfiles = await Promise.all(
        (data || []).map(async (w: any): Promise<Withdrawal> => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', w.user_id)
            .maybeSingle();
          
          return {
            id: w.id,
            user_id: w.user_id,
            amount: Number(w.amount),
            status: w.status,
            created_at: w.created_at,
            asset: w.assets?.symbol || 'CRYPTO',
            to_address: w.to_address,
            tx_hash: w.tx_hash,
            admin_notes: w.admin_notes,
            profiles: profile
          };
        })
      );
      
      return withdrawalsWithProfiles;
    }
  });

  // Fetch BSK withdrawals
  const { data: bskWithdrawals, isLoading: loadingBSK } = useQuery({
    queryKey: ['admin-bsk-withdrawals', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('bsk_withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const withdrawalsWithProfiles = await Promise.all(
        (data || []).map(async (w): Promise<Withdrawal> => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', w.user_id)
            .maybeSingle();
          
          return {
            id: w.id,
            user_id: w.user_id,
            amount: Number(w.amount_bsk),
            status: w.status,
            created_at: w.created_at,
            asset: 'BSK',
            to_address: w.crypto_address,
            admin_notes: w.admin_notes,
            profiles: profile
          };
        })
      );
      
      return withdrawalsWithProfiles;
    }
  });

  // Fetch custodial withdrawals
  const { data: custodialWithdrawals, isLoading: loadingCustodial } = useCustodialWithdrawals(activeTab);
  const { mutate: processCustodial, isPending: processingCustodial } = useProcessCustodialWithdrawal();
  const { data: hotWalletStatus } = useHotWalletStatus();

  // Process withdrawal mutation
  const processWithdrawal = useMutation({
    mutationFn: async ({ id, action, table, hash, notes }: {
      id: string;
      action: 'approve' | 'reject';
      table: 'fiat_withdrawals' | 'withdrawals' | 'bsk_withdrawal_requests';
      hash?: string;
      notes?: string;
    }) => {
      const updateData: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_notes: notes,
        processed_at: new Date().toISOString()
      };

      if (hash && table !== 'fiat_withdrawals') {
        updateData.tx_hash = hash;
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fiat-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-crypto-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bsk-withdrawals'] });
      setSelectedId(null);
      setTxHash("");
      setAdminNotes("");
      toast({
        title: "Success",
        description: "Withdrawal processed successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Map custodial withdrawals to Withdrawal interface
  const mappedCustodialWithdrawals: Withdrawal[] = (custodialWithdrawals || []).map((w) => ({
    id: w.id,
    user_id: w.user_id,
    amount: Number(w.amount),
    status: w.status,
    created_at: w.created_at,
    asset: `CUSTODIAL-${w.asset?.symbol || 'TOKEN'}`,
    to_address: w.to_address,
    tx_hash: w.tx_hash || undefined,
    profiles: w.profile ? { email: w.profile.email, full_name: w.profile.full_name } : null,
  }));

  // Calculate stats
  const allWithdrawals: Withdrawal[] = [
    ...(fiatWithdrawals || []),
    ...(cryptoWithdrawals || []),
    ...(bskWithdrawals || []),
    ...mappedCustodialWithdrawals,
  ];

  const pendingCount = allWithdrawals.filter(w => w.status === 'pending').length;
  const pendingVolume = allWithdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const isLoading = loadingFiat || loadingCrypto || loadingBSK || loadingCustodial;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      completed: "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getExplorerUrl = (asset: string, txHash?: string) => {
    if (!txHash) return null;
    const explorers: Record<string, string> = {
      BTC: `https://blockchair.com/bitcoin/transaction/${txHash}`,
      ETH: `https://etherscan.io/tx/${txHash}`,
      BNB: `https://bscscan.com/tx/${txHash}`,
      TRX: `https://tronscan.org/#/transaction/${txHash}`
    };
    return explorers[asset] || null;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Asset', 'Amount', 'Status', 'Address', 'TX Hash'];
    const rows = allWithdrawals.map(w => [
      new Date(w.created_at).toLocaleString(),
      w.profiles?.email || w.user_id,
      w.asset,
      w.amount,
      w.status,
      w.to_address || '',
      w.tx_hash || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdrawals-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Unified Withdrawal Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all withdrawal requests across INR, Crypto, and BSK
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Hot Wallet Status Banner */}
      {hotWalletStatus && (
        <Card className={hotWalletStatus.isLowGas ? "border-destructive" : "border-green-500/50"}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Wallet className={`h-5 w-5 ${hotWalletStatus.isLowGas ? 'text-destructive' : 'text-green-500'}`} />
              <div>
                <div className="text-sm font-medium">Hot Wallet</div>
                <code className="text-xs text-muted-foreground">{hotWalletStatus.address.slice(0, 10)}...{hotWalletStatus.address.slice(-8)}</code>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold">{parseFloat(hotWalletStatus.bnbBalance).toFixed(4)} BNB</div>
              <div className="text-xs text-muted-foreground">${hotWalletStatus.bnbBalanceUsd.toFixed(2)} USD</div>
              {hotWalletStatus.isLowGas && (
                <Badge variant="destructive" className="mt-1">Low Gas!</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{pendingVolume.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Processed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {allWithdrawals.filter(w => 
                new Date(w.created_at).toDateString() === new Date().toDateString() &&
                (w.status === 'approved' || w.status === 'completed')
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custodial Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {mappedCustodialWithdrawals.filter(w => w.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allWithdrawals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No {activeTab} withdrawals found
                        </TableCell>
                      </TableRow>
                    ) : (
                      allWithdrawals.map((withdrawal) => (
                        <TableRow key={`${withdrawal.asset}-${withdrawal.id}`}>
                          <TableCell className="text-sm">
                            {formatDistanceToNow(new Date(withdrawal.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {withdrawal.profiles?.full_name || 'Unknown'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {withdrawal.profiles?.email || withdrawal.user_id.slice(0, 8)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{withdrawal.asset}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {Number(withdrawal.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                          <TableCell>
                            {withdrawal.status === 'pending' ? (
                              selectedId === withdrawal.id ? (
                                <div className="space-y-2 min-w-[200px]">
                                  {withdrawal.asset !== 'INR' && (
                                    <Input
                                      placeholder="TX Hash"
                                      value={txHash}
                                      onChange={(e) => setTxHash(e.target.value)}
                                      className="text-sm"
                                    />
                                  )}
                                  <Textarea
                                    placeholder="Admin notes (optional)"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    className="text-sm min-h-[60px]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => processWithdrawal.mutate({
                                        id: withdrawal.id,
                                        action: 'approve',
                                        table: withdrawal.asset === 'INR' ? 'fiat_withdrawals' :
                                               withdrawal.asset === 'BSK' ? 'bsk_withdrawal_requests' :
                                               'withdrawals',
                                        hash: txHash,
                                        notes: adminNotes
                                      })}
                                      disabled={processWithdrawal.isPending}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => processWithdrawal.mutate({
                                        id: withdrawal.id,
                                        action: 'reject',
                                        table: withdrawal.asset === 'INR' ? 'fiat_withdrawals' :
                                               withdrawal.asset === 'BSK' ? 'bsk_withdrawal_requests' :
                                               'withdrawals',
                                        notes: adminNotes
                                      })}
                                      disabled={processWithdrawal.isPending}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setSelectedId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : withdrawal.asset.startsWith('CUSTODIAL-') ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => processCustodial({ withdrawalId: withdrawal.id })}
                                  disabled={processingCustodial}
                                >
                                  {processingCustodial ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Process Auto'
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedId(withdrawal.id)}
                                >
                                  Process
                                </Button>
                              )
                            ) : (
                              <div className="space-y-1">
                                {withdrawal.tx_hash && (
                                  <a
                                    href={getExplorerUrl(withdrawal.asset, withdrawal.tx_hash) || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    View TX
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {withdrawal.admin_notes && (
                                  <p className="text-xs text-muted-foreground">
                                    {withdrawal.admin_notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
