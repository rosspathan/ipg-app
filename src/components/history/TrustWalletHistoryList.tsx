import { useState } from "react";
import { TrustWalletHistoryItem, TrustWalletTransaction } from "./TrustWalletHistoryItem";
import { TransactionDetailSheet } from "./TransactionDetailSheet";
import { Button } from "@/components/ui/button";
import { ChevronDown, Filter, Loader2 } from "lucide-react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TrustWalletHistoryListProps {
  transactions: TrustWalletTransaction[];
  isLoading?: boolean;
  showFilters?: boolean;
  filterComponent?: React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

function groupTransactionsByDate(transactions: TrustWalletTransaction[]) {
  const groups = {
    today: [] as TrustWalletTransaction[],
    yesterday: [] as TrustWalletTransaction[],
    thisWeek: [] as TrustWalletTransaction[],
    older: {} as Record<string, TrustWalletTransaction[]>,
  };

  transactions.forEach(tx => {
    const date = new Date(tx.created_at);
    if (isToday(date)) {
      groups.today.push(tx);
    } else if (isYesterday(date)) {
      groups.yesterday.push(tx);
    } else if (isThisWeek(date)) {
      groups.thisWeek.push(tx);
    } else {
      const monthYear = format(date, 'MMMM yyyy');
      if (!groups.older[monthYear]) {
        groups.older[monthYear] = [];
      }
      groups.older[monthYear].push(tx);
    }
  });

  return groups;
}

export function TrustWalletHistoryList({
  transactions,
  isLoading = false,
  showFilters = false,
  filterComponent,
  onLoadMore,
  hasMore = false,
}: TrustWalletHistoryListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<TrustWalletTransaction | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Filter className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your transaction history will appear here once you start using the platform.
        </p>
      </div>
    );
  }

  const groups = groupTransactionsByDate(transactions);

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && filterComponent && (
        <Collapsible open={showFilterPanel} onOpenChange={setShowFilterPanel}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            {filterComponent}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Transaction List */}
      <div className="bg-card rounded-lg border divide-y">
        {/* Today */}
        {groups.today.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">Today</p>
            </div>
            {groups.today.map(tx => (
              <TrustWalletHistoryItem
                key={tx.id}
                transaction={tx}
                onClick={() => setSelectedTransaction(tx)}
              />
            ))}
          </div>
        )}

        {/* Yesterday */}
        {groups.yesterday.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">Yesterday</p>
            </div>
            {groups.yesterday.map(tx => (
              <TrustWalletHistoryItem
                key={tx.id}
                transaction={tx}
                onClick={() => setSelectedTransaction(tx)}
              />
            ))}
          </div>
        )}

        {/* This Week */}
        {groups.thisWeek.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">This Week</p>
            </div>
            {groups.thisWeek.map(tx => (
              <TrustWalletHistoryItem
                key={tx.id}
                transaction={tx}
                onClick={() => setSelectedTransaction(tx)}
              />
            ))}
          </div>
        )}

        {/* Older (grouped by month) */}
        {Object.entries(groups.older).map(([monthYear, txs]) => (
          <div key={monthYear}>
            <div className="px-4 py-2 bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">{monthYear}</p>
            </div>
            {txs.map(tx => (
              <TrustWalletHistoryItem
                key={tx.id}
                transaction={tx}
                onClick={() => setSelectedTransaction(tx)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            'Load More'
          )}
        </Button>
      )}

      {/* Detail Sheet */}
      <TransactionDetailSheet
        transaction={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </div>
  );
}
