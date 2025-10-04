import { useState } from "react";
import { Search, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTradingPairs, type TradingPair } from "@/hooks/useTradingPairs";

interface PairSelectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPair: string;
  onSelectPair: (symbol: string) => void;
}

export function PairSelectorSheet({ open, onOpenChange, currentPair, onSelectPair }: PairSelectorSheetProps) {
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["BNB ORIGINAL/USDT", "BSK/USDT", "IPG/USDT"]);
  const [selectedQuote, setSelectedQuote] = useState<string>("USDT");
  
  const { data: allPairs = [], isLoading } = useTradingPairs();

  const filteredPairs = allPairs.filter(pair =>
    (pair.symbol.toLowerCase().includes(search.toLowerCase()) ||
    pair.baseAsset.toLowerCase().includes(search.toLowerCase())) &&
    pair.quoteAsset === selectedQuote
  );

  const favoritePairs = filteredPairs.filter(pair => favorites.includes(pair.symbol));
  const otherPairs = filteredPairs.filter(pair => !favorites.includes(pair.symbol));
  
  // Get unique quote currencies
  const quoteCurrencies = Array.from(new Set(allPairs.map(p => p.quoteAsset))).sort();

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const handleSelectPair = (symbol: string) => {
    onSelectPair(symbol);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <SheetTitle className="text-base">Select Trading Pair</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border/50">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pairs..."
              className="pl-10 h-10 bg-muted/30 border-border/50"
            />
          </div>
          
          {/* Quote Currency Tabs */}
          <Tabs value={selectedQuote} onValueChange={setSelectedQuote} className="w-full">
            <TabsList className="w-full grid grid-cols-5 h-9">
              {quoteCurrencies.map((quote) => (
                <TabsTrigger key={quote} value={quote} className="text-xs">
                  {quote}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="h-[calc(85vh-180px)]">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              Loading pairs...
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No pairs found
            </div>
          ) : (
            <>
              {/* Favorites */}
              {favoritePairs.length > 0 && (
            <div className="px-4 py-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Star className="h-3 w-3" />
                Favorites
              </div>
              <div className="space-y-1">
                {favoritePairs.map((pair) => (
                  <PairRow
                    key={pair.symbol}
                    pair={pair}
                    isCurrent={pair.symbol === currentPair}
                    isFavorite={true}
                    onToggleFavorite={toggleFavorite}
                    onSelect={handleSelectPair}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Pairs */}
          <div className="px-4 py-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              All Pairs ({otherPairs.length})
            </div>
            <div className="space-y-1">
              {otherPairs.map((pair) => (
                <PairRow
                  key={pair.symbol}
                  pair={pair}
                  isCurrent={pair.symbol === currentPair}
                  isFavorite={false}
                  onToggleFavorite={toggleFavorite}
                  onSelect={handleSelectPair}
                />
              ))}
            </div>
          </div>
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface PairRowProps {
  pair: TradingPair;
  isCurrent: boolean;
  isFavorite: boolean;
  onToggleFavorite: (symbol: string) => void;
  onSelect: (symbol: string) => void;
}

function PairRow({ pair, isCurrent, isFavorite, onToggleFavorite, onSelect }: PairRowProps) {
  const isPositive = pair.change24h >= 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        isCurrent ? "bg-primary/10" : "hover:bg-muted/30"
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(pair.symbol);
        }}
        className="shrink-0"
      >
        <Star
          className={cn(
            "h-4 w-4 transition-colors",
            isFavorite ? "fill-warning text-warning" : "text-muted-foreground"
          )}
        />
      </button>

      <button
        onClick={() => onSelect(pair.symbol)}
        className="flex-1 flex items-center justify-between min-w-0"
      >
        <div className="text-left min-w-0 flex-shrink">
          <div className="text-sm font-bold truncate">{pair.symbol}</div>
          <div className="text-xs text-muted-foreground font-mono">
            Vol ${(pair.volume24h / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold font-mono">${pair.price.toLocaleString()}</div>
          <div
            className={cn(
              "text-xs font-semibold flex items-center justify-end gap-0.5",
              isPositive ? "text-success" : "text-danger"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? "+" : ""}
            {pair.change24h.toFixed(2)}%
          </div>
        </div>
      </button>
    </div>
  );
}
