import { useState } from "react";
import { Search, Star, TrendingUp, TrendingDown, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: number;
  priceChange24h: number;
  volume24h: number;
  isFavorite?: boolean;
  isListed: boolean;
}

interface PairPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairs: TradingPair[];
  selectedPair: string;
  onPairSelect: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
}

export function PairPickerSheet({
  open,
  onOpenChange,
  pairs,
  selectedPair,
  onPairSelect,
  onToggleFavorite
}: PairPickerSheetProps) {
  const [search, setSearch] = useState("");

  const filteredPairs = pairs.filter(p =>
    p.isListed && (
      p.symbol.toLowerCase().includes(search.toLowerCase()) ||
      p.baseAsset.toLowerCase().includes(search.toLowerCase())
    )
  );

  const favoritePairs = filteredPairs.filter(p => p.isFavorite);
  const recentPairs = filteredPairs.slice(0, 6); // Mock recent

  const handleSelect = (symbol: string) => {
    onPairSelect(symbol);
    onOpenChange(false);
  };

  const PairRow = ({ pair }: { pair: TradingPair }) => {
    const isPositive = pair.priceChange24h >= 0;
    const isSelected = pair.symbol === selectedPair;

    return (
      <button
        onClick={() => handleSelect(pair.symbol)}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-120 active:scale-[0.98] ${
          isSelected 
            ? "bg-primary/10 border border-primary/30" 
            : "hover:bg-muted/30"
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(pair.symbol);
            }}
            className="h-8 w-8 p-0"
          >
            <Star 
              className={`h-4 w-4 ${
                pair.isFavorite 
                  ? "fill-yellow-500 text-yellow-500" 
                  : "text-muted-foreground"
              }`} 
            />
          </Button>

          <div className="text-left">
            <p className="font-bold text-sm">{pair.symbol}</p>
            <p className="text-xs text-muted-foreground">
              Vol: ₹{(pair.volume24h / 100000).toFixed(2)}L
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-bold text-sm tabular-nums">
            ₹{pair.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-end gap-1">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <p className={`text-xs font-semibold tabular-nums ${
              isPositive ? "text-success" : "text-destructive"
            }`}>
              {isPositive ? "+" : ""}{pair.priceChange24h.toFixed(2)}%
            </p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] p-0"
        data-testid="pair-picker"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle>Select Trading Pair</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="px-4 py-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pairs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="flex-1">
          <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-border/50 bg-transparent h-12">
            <TabsTrigger value="recent" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Recent
            </TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              Favorites
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              All
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(80vh-180px)]">
            <TabsContent value="recent" className="p-4 space-y-2 mt-0">
              {recentPairs.length > 0 ? (
                recentPairs.map(pair => <PairRow key={pair.symbol} pair={pair} />)
              ) : (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No recent pairs
                </p>
              )}
            </TabsContent>

            <TabsContent value="favorites" className="p-4 space-y-2 mt-0">
              {favoritePairs.length > 0 ? (
                favoritePairs.map(pair => <PairRow key={pair.symbol} pair={pair} />)
              ) : (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No favorite pairs. Tap ⭐ to add favorites.
                </p>
              )}
            </TabsContent>

            <TabsContent value="all" className="p-4 space-y-2 mt-0">
              {filteredPairs.length > 0 ? (
                filteredPairs.map(pair => <PairRow key={pair.symbol} pair={pair} />)
              ) : (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No pairs found
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
