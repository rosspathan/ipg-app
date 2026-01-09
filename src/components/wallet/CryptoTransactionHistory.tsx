import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { 
  CheckCircle2, Clock, Loader2, XCircle, 
  ArrowDownLeft, ArrowUpRight, Users 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import AssetLogo from "@/components/AssetLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CryptoTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
  amount: number;
  fee?: number;
  status: string;
  tx_hash?: string | null;
  address?: string;
  counterparty?: string;
  created_at: string;
  asset: {
    symbol: string;
    name: string;
    logo_url: string | null;
  } | null;
}

type FilterType = 'all' | 'deposits' | 'withdrawals' | 'transfers';

export function CryptoTransactionHistory() {
  const { user } = useAuthUser();
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!user) return;
    
    const fetchAllTransactions = async () => {
      setLoading(true);
      const allTxs: CryptoTransaction[] = [];

      // Fetch deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select(`
          id, amount, status, tx_hash, created_at,
          assets (symbol, name, logo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (deposits) {
        deposits.forEach((d: any) => {
          allTxs.push({
            id: d.id,
            type: 'deposit',
            amount: d.amount,
            status: d.status,
            tx_hash: d.tx_hash,
            created_at: d.created_at,
            asset: d.assets
          });
        });
      }

      // Fetch withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select(`
          id, amount, fee, status, tx_hash, to_address, created_at,
          assets (symbol, name, logo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (withdrawals) {
        withdrawals.forEach((w: any) => {
          allTxs.push({
            id: w.id,
            type: 'withdrawal',
            amount: w.amount,
            fee: w.fee,
            status: w.status,
            tx_hash: w.tx_hash,
            address: w.to_address,
            created_at: w.created_at,
            asset: w.assets
          });
        });
      }

      // Fetch internal transfers (sent by user)
      const { data: sentTransfers } = await supabase
        .from('crypto_internal_transfers')
        .select(`
          id, amount, fee, status, transaction_ref, created_at,
          recipient:profiles!crypto_internal_transfers_recipient_id_fkey (username, full_name),
          assets (symbol, name, logo_url)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (sentTransfers) {
        sentTransfers.forEach((t: any) => {
          const recipientName = t.recipient?.full_name || t.recipient?.username || 'User';
          allTxs.push({
            id: t.id,
            type: 'transfer_out',
            amount: t.amount,
            fee: t.fee,
            status: t.status,
            tx_hash: t.transaction_ref,
            counterparty: recipientName,
            created_at: t.created_at,
            asset: t.assets
          });
        });
      }

      // Fetch internal transfers (received by user)
      const { data: receivedTransfers } = await supabase
        .from('crypto_internal_transfers')
        .select(`
          id, amount, fee, net_amount, status, transaction_ref, created_at,
          sender:profiles!crypto_internal_transfers_sender_id_fkey (username, full_name),
          assets (symbol, name, logo_url)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (receivedTransfers) {
        receivedTransfers.forEach((t: any) => {
          const senderName = t.sender?.full_name || t.sender?.username || 'User';
          allTxs.push({
            id: `${t.id}_recv`,
            type: 'transfer_in',
            amount: t.net_amount || t.amount,
            status: t.status,
            tx_hash: t.transaction_ref,
            counterparty: senderName,
            created_at: t.created_at,
            asset: t.assets
          });
        });
      }

      // Sort by date descending
      allTxs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setTransactions(allTxs);
      setLoading(false);
    };

    fetchAllTransactions();

    // Subscribe to realtime updates
    const depositChannel = supabase
      .channel('crypto-deposits-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits', filter: `user_id=eq.${user.id}` }, () => fetchAllTransactions())
      .subscribe();

    const withdrawalChannel = supabase
      .channel('crypto-withdrawals-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `user_id=eq.${user.id}` }, () => fetchAllTransactions())
      .subscribe();

    const transferChannel = supabase
      .channel('crypto-transfers-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crypto_internal_transfers' }, () => fetchAllTransactions())
      .subscribe();

    return () => {
      supabase.removeChannel(depositChannel);
      supabase.removeChannel(withdrawalChannel);
      supabase.removeChannel(transferChannel);
    };
  }, [user]);

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    if (filter === 'deposits') return transactions.filter(t => t.type === 'deposit');
    if (filter === 'withdrawals') return transactions.filter(t => t.type === 'withdrawal');
    if (filter === 'transfers') return transactions.filter(t => t.type === 'transfer_in' || t.type === 'transfer_out');
    return transactions;
  }, [transactions, filter]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, CryptoTransaction[]> = {};
    
    filteredTransactions.forEach(tx => {
      const date = format(new Date(tx.created_at), 'MMM d, yyyy');
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    
    return groups;
  }, [filteredTransactions]);

  const getTypeIcon = (type: CryptoTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-3 h-3 text-primary-foreground" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-3 h-3 text-white" />;
      case 'transfer_in':
        return <ArrowDownLeft className="w-3 h-3 text-primary-foreground" />;
      case 'transfer_out':
        return <ArrowUpRight className="w-3 h-3 text-white" />;
    }
  };

  const getTypeBgColor = (type: CryptoTransaction['type']) => {
    switch (type) {
      case 'deposit':
      case 'transfer_in':
        return 'bg-primary';
      case 'withdrawal':
      case 'transfer_out':
        return 'bg-amber-500';
    }
  };

  const getTypeLabel = (type: CryptoTransaction['type']) => {
    switch (type) {
      case 'deposit': return 'Deposit';
      case 'withdrawal': return 'Withdrawal';
      case 'transfer_in': return 'Received';
      case 'transfer_out': return 'Sent';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'credited':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'pending':
      case 'confirming':
      case 'processing':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getAmountColor = (type: CryptoTransaction['type']) => {
    return type === 'deposit' || type === 'transfer_in' 
      ? 'text-primary' 
      : 'text-amber-500';
  };

  const formatAddress = (address?: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transaction History</CardTitle>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="mt-2">
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="deposits" className="text-xs">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs">Sent</TabsTrigger>
            <TabsTrigger value="transfers" className="text-xs">Transfers</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No transactions found
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedTransactions).map(([date, txs]) => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
                  <div className="space-y-2">
                    {txs.map((tx, index) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          "bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <AssetLogo 
                              symbol={tx.asset?.symbol || '?'} 
                              logoUrl={tx.asset?.logo_url} 
                              size="sm" 
                            />
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center",
                              getTypeBgColor(tx.type)
                            )}>
                              {getTypeIcon(tx.type)}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {getTypeLabel(tx.type)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {tx.counterparty 
                                ? `${tx.type === 'transfer_in' ? 'From' : 'To'}: ${tx.counterparty}`
                                : tx.address 
                                  ? `To: ${formatAddress(tx.address)}`
                                  : formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className={cn("text-sm font-semibold", getAmountColor(tx.type))}>
                              {tx.type === 'deposit' || tx.type === 'transfer_in' ? '+' : '-'}
                              {tx.amount.toFixed(4)} {tx.asset?.symbol || ''}
                            </p>
                            <div className="flex items-center justify-end gap-1">
                              {getStatusIcon(tx.status)}
                              <span className="text-xs text-muted-foreground capitalize">
                                {tx.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
