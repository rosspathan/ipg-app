import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Loader2, RefreshCw, Search, Filter,
  Clock, ArrowDownLeft, ArrowUpRight, X, AlertCircle, Wallet
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
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
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
} from "@/components/ui/collapsible";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
  const [showDebug, setShowDebug] = useState(false);

  const { 
    transactions, 
    isLoading, 
    indexingStatus, 
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

  const handleRetry = () => {
    indexTransactions(true);
  };

  // Determine what state to show
  const hasError = indexingStatus.lastError && !indexingStatus.isIndexing;
  const isNoWallet = indexingStatus.lastResult?.error_code === 'NO_WALLET_ADDRESS';
  const showLoading = isLoading && transactions.length === 0 && !hasError;
  const showSyncing = indexingStatus.isIndexing && transactions.length === 0;

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
              onClick={() => indexTransactions(true)}
              disabled={isLoading || indexingStatus.isIndexing}
              className="h-9 w-9"
            >
              <RefreshCw className={cn("w-5 h-5", (isLoading || indexingStatus.isIndexing) && "animate-spin")} />
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

      {/* Syncing indicator (only when loading data) */}
      {indexingStatus.isIndexing && transactions.length > 0 && (
        <div className="px-4 py-2 bg-primary/10 text-primary text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Syncing blockchain data...
        </div>
      )}

      {/* Last sync status bar */}
      {indexingStatus.lastIndexedAt && !indexingStatus.isIndexing && (
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="w-full px-4 py-1.5 bg-muted/50 text-xs text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors"
        >
          <Clock className="w-3 h-3" />
          Last sync: {formatDistanceToNow(indexingStatus.lastIndexedAt, { addSuffix: true })}
          {indexingStatus.lastResult?.provider && ` via ${indexingStatus.lastResult.provider}`}
        </button>
      )}

      {/* Debug panel (dev mode) */}
      {showDebug && indexingStatus.lastResult && (
        <div className="mx-4 mt-2 p-3 bg-muted rounded-lg text-xs font-mono">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Debug Info</span>
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowDebug(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1 text-muted-foreground">
            <p>Provider: {indexingStatus.lastResult.provider || 'unknown'}</p>
            <p>Wallet: {indexingStatus.lastResult.wallet || 'N/A'}</p>
            <p>Indexed: {indexingStatus.lastResult.indexed || 0}</p>
            <p>Created: {indexingStatus.lastResult.created || 0}</p>
            <p>Skipped: {indexingStatus.lastResult.skipped || 0}</p>
            <p>Duration: {indexingStatus.lastResult.duration_ms || 0}ms</p>
            {indexingStatus.lastError && (
              <p className="text-destructive">Error: {indexingStatus.lastError}</p>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="px-2 py-2">
        {/* No Wallet Address Error */}
        {isNoWallet && (
          <div className="px-2 py-8">
            <Alert variant="destructive" className="border-none bg-destructive/10">
              <Wallet className="h-5 w-5" />
              <AlertTitle>No Wallet Connected</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-3">
                  You need to set up a BSC wallet address to view your on-chain transaction history.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/app/wallet')}
                  className="gap-2"
                >
                  Set Up Wallet
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error State (non-wallet errors) */}
        {hasError && !isNoWallet && (
          <div className="px-2 py-8">
            <Alert variant="destructive" className="border-none bg-destructive/10">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Sync Error</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-3">{indexingStatus.lastError}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRetry}
                  disabled={indexingStatus.isIndexing}
                  className="gap-2"
                >
                  {indexingStatus.isIndexing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Loading State */}
        {showLoading && !hasError && !isNoWallet && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading transactions...</p>
          </div>
        )}

        {/* Syncing State (first load) */}
        {showSyncing && !hasError && !isNoWallet && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Syncing blockchain data...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
            </div>
          </div>
        )}

        {/* Empty State (after successful load) */}
        {!showLoading && !showSyncing && !hasError && !isNoWallet && transactions.length === 0 && (
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
            <div className="flex flex-col gap-2 items-center">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => indexTransactions(true)}
                disabled={indexingStatus.isIndexing}
                className="gap-2 text-muted-foreground"
              >
                <RefreshCw className={cn("w-4 h-4", indexingStatus.isIndexing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* Transaction List */}
        {transactions.length > 0 && (
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
