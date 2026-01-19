import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Loader2, RefreshCw, Search, Filter,
  Clock, ArrowDownLeft, ArrowUpRight, X
} from "lucide-react";
import { 
  useOnchainTransactionHistory, 
  useOnchainTokens,
  OnchainTransaction,
  DirectionFilter,
  StatusFilter
} from '@/hooks/useOnchainTransactionHistory';
import { OnchainTransactionItem } from '@/components/history/OnchainTransactionItem';
import { OnchainTransactionDetailSheet } from '@/components/history/OnchainTransactionDetailSheet';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import AssetLogo from '@/components/AssetLogo';

// Group transactions by date
function groupTransactionsByDate(transactions: OnchainTransaction[]) {
  const groups: { [key: string]: OnchainTransaction[] } = {};
  
  transactions.forEach(tx => {
    const displayDate = format(new Date(tx.created_at), 'MMMM d, yyyy');
    if (!groups[displayDate]) {
      groups[displayDate] = [];
    }
    groups[displayDate].push(tx);
  });
  
  return groups;
}

const OnchainHistoryPage = () => {
  const navigate = useNavigate();
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tokenFilter, setTokenFilter] = useState<string>('');
  const [searchHash, setSearchHash] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<OnchainTransaction | null>(null);

  const { 
    transactions, 
    isLoading, 
    isIndexing, 
    refetch, 
    indexTransactions 
  } = useOnchainTransactionHistory({
    direction: directionFilter,
    status: statusFilter,
    tokenSymbol: tokenFilter || undefined,
    searchHash: searchHash || undefined,
    limit: 100
  });

  const { data: tokens = [] } = useOnchainTokens();
  const groupedTransactions = groupTransactionsByDate(transactions);
  const hasActiveFilters = directionFilter !== 'all' || statusFilter !== 'all' || tokenFilter || searchHash;

  const clearFilters = () => {
    setDirectionFilter('all');
    setStatusFilter('all');
    setTokenFilter('');
    setSearchHash('');
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
            <h1 className="text-lg font-bold text-foreground">On-chain History</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn("h-9 w-9", hasActiveFilters && "text-primary")}
            >
              <Filter className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => indexTransactions()}
              disabled={isLoading || isIndexing}
              className="h-9 w-9"
            >
              <RefreshCw className={cn("w-5 h-5", (isLoading || isIndexing) && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Direction Filter Pills */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {(['all', 'RECEIVE', 'SEND'] as DirectionFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setDirectionFilter(filter)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  directionFilter === filter 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {filter === 'RECEIVE' && <ArrowDownLeft className="w-3.5 h-3.5" />}
                {filter === 'SEND' && <ArrowUpRight className="w-3.5 h-3.5" />}
                {filter === 'all' ? 'All' : filter === 'RECEIVE' ? 'Received' : 'Sent'}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="px-4 pb-3 space-y-3">
            {/* Search by hash */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by transaction hash..."
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
                className="pl-9 font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              {/* Token filter */}
              <Select value={tokenFilter} onValueChange={setTokenFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="All tokens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tokens</SelectItem>
                  {tokens.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      <div className="flex items-center gap-2">
                        <AssetLogo symbol={token.symbol} logoUrl={token.logo_url} size="sm" />
                        {token.symbol}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full text-muted-foreground"
              >
                <X className="w-4 h-4 mr-2" />
                Clear all filters
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Indexing indicator */}
      {isIndexing && (
        <div className="px-4 py-2 bg-primary/10 text-primary text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Syncing blockchain data...
        </div>
      )}

      {/* Transaction List */}
      <div className="px-2 py-2">
        {isLoading && !isIndexing ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Clock className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">
              {hasActiveFilters ? 'No matching transactions' : 'No On-chain Transactions'}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {hasActiveFilters 
                ? 'Try adjusting your filters'
                : 'Your BEP-20 token transfers will appear here'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedTransactions).map(([date, txs]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="sticky top-[120px] z-5 px-4 py-2 bg-background/95 backdrop-blur-sm">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {date}
                    </p>
                  </div>
                  {/* Transactions for this date */}
                  <div className="space-y-0.5">
                    {txs.map((tx) => (
                      <OnchainTransactionItem 
                        key={tx.id} 
                        tx={tx} 
                        onClick={() => setSelectedTransaction(tx)} 
                      />
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Transaction Detail Sheet */}
      <OnchainTransactionDetailSheet
        transaction={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </div>
  );
};

export default OnchainHistoryPage;
