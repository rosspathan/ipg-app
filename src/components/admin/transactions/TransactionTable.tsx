import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Eye, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TransactionTableProps {
  transactionType: 'all' | 'inr' | 'bsk';
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  type: string;
  method?: string;
  reference?: string;
  profiles?: {
    email: string;
    full_name: string;
  } | null;
}

const TransactionTable = ({ transactionType }: TransactionTableProps) => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadTransactions();
  }, [transactionType, statusFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      let allTransactions: Transaction[] = [];

      if (transactionType === 'all' || transactionType === 'inr') {
        // Load INR deposits
        let depositsQuery = supabase
          .from('fiat_deposits')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (statusFilter !== 'all') {
          depositsQuery = depositsQuery.eq('status', statusFilter);
        }

        const { data: deposits } = await depositsQuery;

        if (deposits) {
          const depositsWithProfiles = await Promise.all(
            deposits.map(async (d) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('user_id', d.user_id)
                .maybeSingle();

              return {
                id: d.id,
                user_id: d.user_id,
                amount: Number(d.amount),
                status: d.status,
                created_at: d.created_at,
                type: 'INR Deposit',
                method: d.method,
                reference: d.reference,
                profiles: profile,
              };
            })
          );
          allTransactions.push(...depositsWithProfiles);
        }

        // Load INR withdrawals
        let withdrawalsQuery = supabase
          .from('fiat_withdrawals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (statusFilter !== 'all') {
          withdrawalsQuery = withdrawalsQuery.eq('status', statusFilter);
        }

        const { data: withdrawals } = await withdrawalsQuery;

        if (withdrawals) {
          const withdrawalsWithProfiles = await Promise.all(
            withdrawals.map(async (w) => {
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
                type: 'INR Withdrawal',
                method: w.currency || 'INR',
                reference: w.reference_id,
                profiles: profile,
              };
            })
          );
          allTransactions.push(...withdrawalsWithProfiles);
        }
      }

      if (transactionType === 'all' || transactionType === 'bsk') {
        // Load BSK withdrawals
        let bskWithdrawQuery = supabase
          .from('bsk_withdrawal_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(25);

        if (statusFilter !== 'all') {
          bskWithdrawQuery = bskWithdrawQuery.eq('status', statusFilter);
        }

        const { data: bskWithdrawals } = await bskWithdrawQuery;

        if (bskWithdrawals) {
          const bskWithProfiles = await Promise.all(
            bskWithdrawals.map(async (b) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('user_id', b.user_id)
                .maybeSingle();

              return {
                id: b.id,
                user_id: b.user_id,
                amount: Number(b.amount_bsk),
                status: b.status,
                created_at: b.created_at,
                type: 'BSK Withdrawal',
                method: b.withdrawal_type,
                reference: b.crypto_address || b.account_number,
                profiles: profile,
              };
            })
          );
          allTransactions.push(...bskWithProfiles);
        }
        
        // Load BSK purchases (from manual purchase requests)
        let purchasesQuery = supabase
          .from('bsk_manual_purchase_requests')
          .select('*')
          .order('created_at', { ascending: false})
          .limit(25);

        if (statusFilter !== 'all') {
          purchasesQuery = purchasesQuery.eq('status', statusFilter === 'approved' ? 'approved' : statusFilter);
        }

        const { data: purchases } = await purchasesQuery;

        if (purchases) {
          const purchasesWithProfiles = await Promise.all(
            purchases.map(async (p) => {
              return {
                id: p.id,
                user_id: p.user_id,
                amount: Number(p.total_received),
                status: p.status,
                created_at: p.created_at,
                type: 'BSK Purchase',
                method: p.payment_method,
                reference: p.transaction_hash || p.utr_number || '',
                profiles: {
                  email: p.email,
                  full_name: '',
                },
              };
            })
          );
          allTransactions.push(...purchasesWithProfiles);
        }
        
        // Load admin manual operations (credits/debits)
        let adminOpsQuery = supabase
          .from('bonus_ledger')
          .select('*')
          .in('type', ['admin_credit', 'admin_debit', 'manual_credit', 'manual_debit'])
          .order('created_at', { ascending: false })
          .limit(25);

        const { data: adminOps } = await adminOpsQuery;

        if (adminOps) {
          const adminOpsWithProfiles = await Promise.all(
            adminOps.map(async (op) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('user_id', op.user_id)
                .maybeSingle();

              return {
                id: op.id,
                user_id: op.user_id,
                amount: Number(op.amount_bsk),
                status: 'completed',
                created_at: op.created_at,
                type: op.type === 'admin_credit' || op.type === 'manual_credit' ? 'Admin Credit' : 'Admin Debit',
                method: 'Manual',
                reference: (op.meta_json as any)?.admin_notes || '',
                profiles: profile,
              };
            })
          );
          allTransactions.push(...adminOpsWithProfiles);
        }
      }

      // Sort by date
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      tx.profiles?.email?.toLowerCase().includes(search) ||
      tx.profiles?.full_name?.toLowerCase().includes(search) ||
      tx.reference?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      completed: "default",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>
            {transactionType === 'all' ? 'All Transactions' : 
             transactionType === 'inr' ? 'INR Transactions' : 'BSK Transactions'}
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadTransactions} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{tx.profiles?.full_name || 'N/A'}</div>
                        <div className="text-muted-foreground text-xs">{tx.profiles?.email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tx.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {tx.type.includes('BSK') ? 
                        `${tx.amount.toLocaleString('en-IN')} BSK` :
                        `₹${tx.amount.toLocaleString('en-IN')}`
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell className="text-sm">{tx.method || 'N/A'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {tx.reference || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionTable;
