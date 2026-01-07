import { useState } from "react";
import { Search, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: number;
  priceChange24h: number;
  volume24h: number;
  isFavorite?: boolean;
  isListed?: boolean;
}

interface PairsGridProps {
  pairs: TradingPair[];
  selectedPair: string;
  onPairSelect: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
}

export function PairsGrid({ 
  pairs, 
  selectedPair, 
  onPairSelect, 
  onToggleFavorite 
}: PairsGridProps) {
  const [activeTab, setActiveTab] = useState<"recent" | "favorites" | "all">("recent");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter pairs based on active tab
  const filteredPairs = pairs.filter(pair => {
    const matchesSearch = pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pair.baseAsset.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeTab === "favorites") return pair.isFavorite;
    if (activeTab === "recent") return true; // Would filter by recent trades in production
    return pair.isListed !== false;
  });

  return (
    <div className="space-y-3" data-testid="pairs-grid">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-base font-bold">Market Pairs</h2>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="px-4">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30">
          <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
          <TabsTrigger value="favorites" className="text-xs">Favorites</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search pairs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-muted/20 border-border/50"
          />
        </div>
      </div>

      <div className="space-y-2 px-4">
        {filteredPairs.length === 0 ? (
          <Card className="p-8 text-center bg-muted/20 border-dashed">
            <p className="text-sm text-muted-foreground">No pairs found</p>
          </Card>
        ) : (
          filteredPairs.map((pair) => (
            <Card
              key={pair.symbol}
              onClick={() => onPairSelect(pair.symbol)}
              className={`p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                selectedPair === pair.symbol 
                  ? 'border-primary bg-primary/5' 
                  : 'bg-card/50 border-border/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(pair.symbol);
                    }}
                    className="hover:scale-110 transition-transform"
                    aria-label={pair.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        pair.isFavorite 
                          ? 'fill-warning text-warning' 
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">{pair.symbol}</h3>
                      {selectedPair === pair.symbol && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vol: ${(pair.volume24h / 1000).toFixed(1)}K
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-sm">${pair.lastPrice.toFixed(2)}</p>
                  <div className={`flex items-center justify-end gap-1 text-xs font-medium ${
                    pair.priceChange24h >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {pair.priceChange24h >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(pair.priceChange24h).toFixed(2)}%
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
