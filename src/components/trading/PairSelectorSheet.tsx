import { useState } from "react";
import { Search, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  isFavorite?: boolean;
}

// 50+ realistic trading pairs
const TRADING_PAIRS: TradingPair[] = [
  { symbol: "BNB/USDT", baseAsset: "BNB", quoteAsset: "USDT", price: 1147.3, change24h: 0.33, volume24h: 234567890 },
  { symbol: "BTC/USDT", baseAsset: "BTC", quoteAsset: "USDT", price: 43250.80, change24h: 2.15, volume24h: 1234567890 },
  { symbol: "ETH/USDT", baseAsset: "ETH", quoteAsset: "USDT", price: 2245.50, change24h: -0.85, volume24h: 987654321 },
  { symbol: "SOL/USDT", baseAsset: "SOL", quoteAsset: "USDT", price: 98.45, change24h: 5.23, volume24h: 456789012 },
  { symbol: "XRP/USDT", baseAsset: "XRP", quoteAsset: "USDT", price: 0.5234, change24h: 1.45, volume24h: 345678901 },
  { symbol: "ADA/USDT", baseAsset: "ADA", quoteAsset: "USDT", price: 0.4521, change24h: -2.11, volume24h: 234567890 },
  { symbol: "AVAX/USDT", baseAsset: "AVAX", quoteAsset: "USDT", price: 32.78, change24h: 3.67, volume24h: 198765432 },
  { symbol: "DOT/USDT", baseAsset: "DOT", quoteAsset: "USDT", price: 6.89, change24h: -1.23, volume24h: 156789012 },
  { symbol: "MATIC/USDT", baseAsset: "MATIC", quoteAsset: "USDT", price: 0.8234, change24h: 4.12, volume24h: 234567890 },
  { symbol: "LINK/USDT", baseAsset: "LINK", quoteAsset: "USDT", price: 14.56, change24h: 2.34, volume24h: 178901234 },
  { symbol: "UNI/USDT", baseAsset: "UNI", quoteAsset: "USDT", price: 6.23, change24h: -0.89, volume24h: 145678901 },
  { symbol: "ATOM/USDT", baseAsset: "ATOM", quoteAsset: "USDT", price: 9.87, change24h: 1.78, volume24h: 123456789 },
  { symbol: "LTC/USDT", baseAsset: "LTC", quoteAsset: "USDT", price: 72.34, change24h: 0.56, volume24h: 198765432 },
  { symbol: "BCH/USDT", baseAsset: "BCH", quoteAsset: "USDT", price: 234.56, change24h: -1.45, volume24h: 176543210 },
  { symbol: "NEAR/USDT", baseAsset: "NEAR", quoteAsset: "USDT", price: 2.34, change24h: 6.78, volume24h: 145678901 },
  { symbol: "APT/USDT", baseAsset: "APT", quoteAsset: "USDT", price: 8.45, change24h: 3.21, volume24h: 134567890 },
  { symbol: "ARB/USDT", baseAsset: "ARB", quoteAsset: "USDT", price: 1.23, change24h: 2.45, volume24h: 123456789 },
  { symbol: "OP/USDT", baseAsset: "OP", quoteAsset: "USDT", price: 2.67, change24h: -0.67, volume24h: 112345678 },
  { symbol: "FIL/USDT", baseAsset: "FIL", quoteAsset: "USDT", price: 5.43, change24h: 1.89, volume24h: 101234567 },
  { symbol: "ICP/USDT", baseAsset: "ICP", quoteAsset: "USDT", price: 12.34, change24h: -2.34, volume24h: 98765432 },
  { symbol: "ALGO/USDT", baseAsset: "ALGO", quoteAsset: "USDT", price: 0.1789, change24h: 4.56, volume24h: 87654321 },
  { symbol: "VET/USDT", baseAsset: "VET", quoteAsset: "USDT", price: 0.0234, change24h: 3.12, volume24h: 76543210 },
  { symbol: "HBAR/USDT", baseAsset: "HBAR", quoteAsset: "USDT", price: 0.0678, change24h: -1.45, volume24h: 65432109 },
  { symbol: "TRX/USDT", baseAsset: "TRX", quoteAsset: "USDT", price: 0.1045, change24h: 0.89, volume24h: 54321098 },
  { symbol: "ETC/USDT", baseAsset: "ETC", quoteAsset: "USDT", price: 20.45, change24h: -0.56, volume24h: 43210987 },
  { symbol: "XLM/USDT", baseAsset: "XLM", quoteAsset: "USDT", price: 0.1234, change24h: 2.11, volume24h: 32109876 },
  { symbol: "AAVE/USDT", baseAsset: "AAVE", quoteAsset: "USDT", price: 98.76, change24h: 1.67, volume24h: 21098765 },
  { symbol: "MKR/USDT", baseAsset: "MKR", quoteAsset: "USDT", price: 1456.78, change24h: -0.89, volume24h: 10987654 },
  { symbol: "SNX/USDT", baseAsset: "SNX", quoteAsset: "USDT", price: 3.45, change24h: 3.45, volume24h: 9876543 },
  { symbol: "GRT/USDT", baseAsset: "GRT", quoteAsset: "USDT", price: 0.1567, change24h: -2.12, volume24h: 8765432 },
  { symbol: "FTM/USDT", baseAsset: "FTM", quoteAsset: "USDT", price: 0.3456, change24h: 4.23, volume24h: 7654321 },
  { symbol: "SAND/USDT", baseAsset: "SAND", quoteAsset: "USDT", price: 0.4567, change24h: 1.89, volume24h: 6543210 },
  { symbol: "MANA/USDT", baseAsset: "MANA", quoteAsset: "USDT", price: 0.3789, change24h: -1.23, volume24h: 5432109 },
  { symbol: "AXS/USDT", baseAsset: "AXS", quoteAsset: "USDT", price: 6.78, change24h: 2.45, volume24h: 4321098 },
  { symbol: "THETA/USDT", baseAsset: "THETA", quoteAsset: "USDT", price: 1.23, change24h: -0.67, volume24h: 3210987 },
  { symbol: "XTZ/USDT", baseAsset: "XTZ", quoteAsset: "USDT", price: 0.8901, change24h: 1.45, volume24h: 2109876 },
  { symbol: "EOS/USDT", baseAsset: "EOS", quoteAsset: "USDT", price: 0.6789, change24h: -2.34, volume24h: 1098765 },
  { symbol: "KAVA/USDT", baseAsset: "KAVA", quoteAsset: "USDT", price: 0.8234, change24h: 3.56, volume24h: 987654 },
  { symbol: "ZEC/USDT", baseAsset: "ZEC", quoteAsset: "USDT", price: 28.45, change24h: 0.78, volume24h: 876543 },
  { symbol: "DASH/USDT", baseAsset: "DASH", quoteAsset: "USDT", price: 32.67, change24h: -1.12, volume24h: 765432 },
  { symbol: "COMP/USDT", baseAsset: "COMP", quoteAsset: "USDT", price: 56.78, change24h: 2.89, volume24h: 654321 },
  { symbol: "YFI/USDT", baseAsset: "YFI", quoteAsset: "USDT", price: 6789.12, change24h: -0.45, volume24h: 543210 },
  { symbol: "BAT/USDT", baseAsset: "BAT", quoteAsset: "USDT", price: 0.2345, change24h: 1.67, volume24h: 432109 },
  { symbol: "ZRX/USDT", baseAsset: "ZRX", quoteAsset: "USDT", price: 0.3456, change24h: -0.89, volume24h: 321098 },
  { symbol: "ENJ/USDT", baseAsset: "ENJ", quoteAsset: "USDT", price: 0.2789, change24h: 3.12, volume24h: 210987 },
  { symbol: "CHZ/USDT", baseAsset: "CHZ", quoteAsset: "USDT", price: 0.0789, change24h: -1.45, volume24h: 109876 },
  { symbol: "CELO/USDT", baseAsset: "CELO", quoteAsset: "USDT", price: 0.5678, change24h: 2.34, volume24h: 98765 },
  { symbol: "1INCH/USDT", baseAsset: "1INCH", quoteAsset: "USDT", price: 0.3901, change24h: 1.23, volume24h: 87654 },
  { symbol: "LRC/USDT", baseAsset: "LRC", quoteAsset: "USDT", price: 0.2234, change24h: -2.11, volume24h: 76543 },
  { symbol: "IMX/USDT", baseAsset: "IMX", quoteAsset: "USDT", price: 1.45, change24h: 4.56, volume24h: 65432 },
  { symbol: "DYDX/USDT", baseAsset: "DYDX", quoteAsset: "USDT", price: 2.34, change24h: -0.78, volume24h: 54321 },
  { symbol: "GALA/USDT", baseAsset: "GALA", quoteAsset: "USDT", price: 0.0234, change24h: 3.45, volume24h: 43210 },
];

interface PairSelectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPair: string;
  onSelectPair: (symbol: string) => void;
}

export function PairSelectorSheet({ open, onOpenChange, currentPair, onSelectPair }: PairSelectorSheetProps) {
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["BNB/USDT", "BTC/USDT", "ETH/USDT"]);

  const filteredPairs = TRADING_PAIRS.filter(pair =>
    pair.symbol.toLowerCase().includes(search.toLowerCase()) ||
    pair.baseAsset.toLowerCase().includes(search.toLowerCase())
  );

  const favoritePairs = filteredPairs.filter(pair => favorites.includes(pair.symbol));
  const otherPairs = filteredPairs.filter(pair => !favorites.includes(pair.symbol));

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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pairs..."
              className="pl-10 h-10 bg-muted/30 border-border/50"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(85vh-120px)]">
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
        className="flex-1 flex items-center justify-between"
      >
        <div className="text-left">
          <div className="text-sm font-bold">{pair.symbol}</div>
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
