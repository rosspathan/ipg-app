import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ArrowDownLeft, ArrowUpRight, ExternalLink, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import { useCryptoTransactionHistory, TransactionFilter, StatusFilter, CryptoTransaction } from '@/hooks/useCryptoTransactionHistory';
import AssetLogo from '@/components/AssetLogo';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'completed':
    case 'credited':
      return { icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10', label: 'Completed' };
    case 'pending':
    case 'confirming':
    case 'processing':
      return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending' };
    case 'failed':
    case 'rejected':
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' };
    default:
      return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: status };
  }
};

const formatAddress = (address: string | null) => {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const getBscScanUrl = (txHash: string | null, network: string | null) => {
  if (!txHash) return null;
  if (network?.toLowerCase().includes('bsc') || network?.toLowerCase().includes('bep')) {
    return `https://bscscan.com/tx/${txHash}`;
  }
  return `https://etherscan.io/tx/${txHash}`;
};

function TransactionCard({ tx }: { tx: CryptoTransaction }) {
  const statusConfig = getStatusConfig(tx.status);
  const StatusIcon = statusConfig.icon;
  const explorerUrl = getBscScanUrl(tx.tx_hash, tx.network);
  const isIncoming = tx.transaction_type === 'deposit' || tx.transaction_type === 'transfer_in';
  const isTransfer = tx.transaction_type === 'transfer_in' || tx.transaction_type === 'transfer_out';

  const getTypeLabel = () => {
    switch (tx.transaction_type) {
      case 'deposit': return 'Deposit';
      case 'withdrawal': return 'Withdrawal';
      case 'transfer_in': return 'Received';
      case 'transfer_out': return 'Sent';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="bg-card hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Icon + Asset Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative">
                <AssetLogo symbol={tx.symbol} logoUrl={tx.logo_url} size="md" />
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                  isIncoming ? "bg-primary" : "bg-amber-500"
                )}>
                  {isIncoming 
                    ? <ArrowDownLeft className="w-3 h-3 text-primary-foreground" />
                    : <ArrowUpRight className="w-3 h-3 text-white" />
                  }
                </div>
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("font-semibold", isIncoming ? "text-primary" : "text-amber-500")}>
                    {isIncoming ? '+' : '-'}{tx.amount} {tx.symbol}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {getTypeLabel()} • {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                </p>
                {isTransfer && tx.counterparty && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {tx.transaction_type === 'transfer_in' ? 'From' : 'To'}: {tx.counterparty}
                  </p>
                )}
                {tx.to_address && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    To: {formatAddress(tx.to_address)}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Status + Actions */}
            <div className="text-right flex flex-col items-end gap-1">
              <Badge className={cn("text-xs font-medium", statusConfig.bg, statusConfig.color, "border-0")}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              
              {/* Confirmation progress for pending deposits */}
              {tx.transaction_type === 'deposit' && tx.status === 'confirming' && tx.confirmations !== null && (
                <p className="text-xs text-muted-foreground">
                  {tx.confirmations}/{tx.required_confirmations} confirms
                </p>
              )}

              {/* Fee for withdrawals/transfers */}
              {tx.fee && tx.fee > 0 && (
                <p className="text-xs text-muted-foreground">
                  Fee: {tx.fee} {tx.symbol}
                </p>
              )}

              {/* Explorer link */}
              {explorerUrl && tx.tx_hash && !isTransfer && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                  View TX
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const CryptoHistoryPage = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TransactionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { transactions, loading, refetch } = useCryptoTransactionHistory({
    transactionType: typeFilter,
    status: statusFilter,
    limit: 100
  });

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/wallet")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
              <p className="text-sm text-muted-foreground">
                All your crypto deposits, withdrawals & transfers
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Type filter */}
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionFilter)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposit">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawal">Sent</TabsTrigger>
              <TabsTrigger value="transfer">Transfers</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Status filter */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
              <TabsTrigger value="failed" className="text-xs">Failed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Transaction List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No transactions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {typeFilter !== 'all' || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Your crypto transactions will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {transactions.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoHistoryPage;
