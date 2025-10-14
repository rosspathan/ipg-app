import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { cn } from "@/lib/utils";

export function TradingOverview() {
  const navigate = useNavigate();
  const { data: pairs, isLoading } = useTradingPairs();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const filteredPairs = pairs?.filter(pair => {
    const matchesSearch = pair.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorites = activeTab === "all" || favorites.includes(pair.symbol);
    return matchesSearch && matchesFavorites;
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="text-xl font-semibold mb-3">Markets</h1>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pairs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All Markets</TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              <Star className="h-3.5 w-3.5 mr-1" />
              Favorites
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Pairs List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading markets...</div>
        ) : filteredPairs?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {activeTab === "favorites" ? "No favorites yet" : "No markets found"}
          </div>
        ) : (
          filteredPairs?.map((pair) => (
            <Card
              key={pair.symbol}
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => {
                const urlSymbol = pair.symbol.replace('/', '-');
                navigate(`/app/trade/${urlSymbol}`);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(pair.symbol);
                    }}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        favorites.includes(pair.symbol) && "fill-primary text-primary"
                      )}
                    />
                  </button>

                  <div className="flex-1">
                    <div className="font-semibold">{pair.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      Vol ${(pair.volume24h / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-base">${pair.price.toFixed(2)}</div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      pair.change24h >= 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {pair.change24h >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(pair.change24h).toFixed(2)}%
                  </div>
                </div>

                <div className="ml-4 space-y-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="w-16 h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      const urlSymbol = pair.symbol.replace('/', '-');
                      navigate(`/app/trade/${urlSymbol}?side=buy`);
                    }}
                  >
                    Buy
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-16 h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      const urlSymbol = pair.symbol.replace('/', '-');
                      navigate(`/app/trade/${urlSymbol}?side=sell`);
                    }}
                  >
                    Sell
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
