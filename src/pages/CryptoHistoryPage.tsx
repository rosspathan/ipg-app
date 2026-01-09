import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Loader2, ArrowDownLeft, ArrowUpRight, ExternalLink, 
  CheckCircle2, Clock, XCircle, RefreshCw, Search, Plus
} from "lucide-react";
import { useCryptoTransactionHistory, TransactionFilter, StatusFilter, CryptoTransaction } from '@/hooks/useCryptoTransactionHistory';
import AssetLogo from '@/components/AssetLogo';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

// Trust Wallet-like Transaction Item
function TrustWalletTransactionItem({ tx }: { tx: CryptoTransaction }) {
  const statusConfig = getStatusConfig(tx.status);
  const StatusIcon = statusConfig.icon;
  const explorerUrl = getBscScanUrl(tx.tx_hash, tx.network);
  const isIncoming = tx.transaction_type === 'deposit' || tx.transaction_type === 'transfer_in';
  const isTransfer = tx.transaction_type === 'transfer_in' || tx.transaction_type === 'transfer_out';

  const getTypeLabel = () => {
    switch (tx.transaction_type) {
      case 'deposit': return 'Received';
      case 'withdrawal': return 'Sent';
      case 'transfer_in': return 'Received';
      case 'transfer_out': return 'Sent';
    }
  };

  const getSubtitle = () => {
    if (isTransfer && tx.counterparty) {
      return tx.transaction_type === 'transfer_in' 
        ? `From ${tx.counterparty}` 
        : `To ${tx.counterparty}`;
    }
    if (tx.to_address) {
      return `To ${formatAddress(tx.to_address)}`;
    }
    if (tx.tx_hash) {
      return formatAddress(tx.tx_hash);
    }
    return tx.network || 'BSC';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="group"
    >
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer rounded-xl"
        onClick={() => explorerUrl && window.open(explorerUrl, '_blank')}
      >
        {/* Asset Icon with Direction Badge */}
        <div className="relative flex-shrink-0">
          <AssetLogo symbol={tx.symbol} logoUrl={tx.logo_url} size="md" />
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-background",
            isIncoming ? "bg-primary" : "bg-orange-500"
          )}>
            {isIncoming 
              ? <ArrowDownLeft className="w-2.5 h-2.5 text-primary-foreground" />
              : <ArrowUpRight className="w-2.5 h-2.5 text-white" />
            }
          </div>
        </div>
        
        {/* Transaction Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{getTypeLabel()}</span>
            {tx.status !== 'completed' && tx.status !== 'credited' && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", statusConfig.color, "border-current")}>
                {statusConfig.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {getSubtitle()}
          </p>
        </div>

        {/* Amount & Time */}
        <div className="text-right flex-shrink-0">
          <p className={cn(
            "font-semibold text-sm",
            isIncoming ? "text-primary" : "text-foreground"
          )}>
            {isIncoming ? '+' : '-'}{tx.amount.toFixed(tx.amount < 1 ? 6 : 2)} {tx.symbol}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* External Link Icon */}
        {explorerUrl && (
          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );
}

// Group transactions by date
function groupTransactionsByDate(transactions: CryptoTransaction[]) {
  const groups: { [key: string]: CryptoTransaction[] } = {};
  
  transactions.forEach(tx => {
    const date = format(new Date(tx.created_at), 'yyyy-MM-dd');
    const displayDate = format(new Date(tx.created_at), 'MMMM d, yyyy');
    
    if (!groups[displayDate]) {
      groups[displayDate] = [];
    }
    groups[displayDate].push(tx);
  });
  
  return groups;
}

const CryptoHistoryPage = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TransactionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const { transactions, loading, refetch } = useCryptoTransactionHistory({
    transactionType: typeFilter,
    status: statusFilter,
    limit: 100
  });

  const groupedTransactions = groupTransactionsByDate(transactions);

  const handleManualVerification = async () => {
    if (!txHash || !txHash.startsWith('0x')) {
      toast.error('Please enter a valid transaction hash (starts with 0x)');
      return;
    }

    setIsVerifying(true);
    try {
      toast.info('Verifying transaction on BSC...');
      
      const { data, error } = await supabase.functions.invoke('verify-transaction', {
        body: { txHash: txHash.trim() }
      });

      if (error) throw error;

      if (data.success && data.found) {
        toast.success(data.message || `Credited ${data.amount} ${data.symbol}`);
        await refetch();
        setShowVerifyDialog(false);
        setTxHash('');
      } else if (data.alreadyExists) {
        toast.info('This transaction is already credited to your account');
        setShowVerifyDialog(false);
      } else {
        toast.error(data.message || 'Transaction not found. Make sure it was sent to your wallet.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Trust Wallet Style */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/app/wallet")}
              className="h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Transactions</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVerifyDialog(true)}
              className="h-9 w-9"
              title="Add missing transaction"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={loading}
              className="h-9 w-9"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Filters - Pill Style */}
        <div className="px-4 pb-3 space-y-2">
          {/* Type filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'deposit', 'withdrawal', 'transfer'] as TransactionFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTypeFilter(filter)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  typeFilter === filter 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {filter === 'all' ? 'All' : filter === 'deposit' ? 'Received' : filter === 'withdrawal' ? 'Sent' : 'Transfers'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="px-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Clock className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">No Transactions</p>
            <p className="text-sm text-muted-foreground mb-6">
              {typeFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Your crypto transactions will appear here'}
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowVerifyDialog(true)}
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              Verify a Transaction
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedTransactions).map(([date, txs]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="sticky top-[88px] z-5 px-4 py-2 bg-background/95 backdrop-blur-sm">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{date}</p>
                  </div>
                  {/* Transactions for this date */}
                  <div className="space-y-0.5">
                    {txs.map((tx) => (
                      <TrustWalletTransactionItem key={tx.id} tx={tx} />
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Verify Transaction Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Transaction</DialogTitle>
            <DialogDescription>
              Can't see your deposit? Enter the BSCScan transaction hash to verify and credit it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Transaction Hash</label>
              <Input
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                disabled={isVerifying}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Paste your BSCScan transaction hash (starts with 0x). The transaction must be sent to your wallet address.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowVerifyDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleManualVerification}
                disabled={isVerifying || !txHash}
                className="flex-1"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Credit'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CryptoHistoryPage;
