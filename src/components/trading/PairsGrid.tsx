import { useState } from "react";
import { Clock, Star, Grid3x3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: number;
  priceChange24h: number;
  volume24h: number;
  isFavorite?: boolean;
}

interface PairsGridProps {
  pairs: TradingPair[];
  onPairSelect: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
  selectedPair?: string;
}

export function PairsGrid({ pairs, onPairSelect, onToggleFavorite, selectedPair }: PairsGridProps) {
  const [activeTab, setActiveTab] = useState("recent");
  const [searchTerm, setSearchTerm] = useState("");

  const recentPairs = pairs.slice(0, 6);
  const favoritePairs = pairs.filter(p => p.isFavorite);

  const filteredPairs = pairs.filter(pair =>
    pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.baseAsset.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayPairs = activeTab === "recent" 
    ? recentPairs 
    : activeTab === "favorites" 
    ? favoritePairs 
    : filteredPairs;

  return (
    <div className="space-y-3" data-testid="pairs-grid">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30">
          <TabsTrigger value="recent" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-xs">
            <Star className="h-3 w-3 mr-1" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            <Grid3x3 className="h-3 w-3 mr-1" />
            All
          </TabsTrigger>
        </TabsList>

        {activeTab === "all" && (
          <div className="mt-3">
            <Input
              placeholder="Search pairs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
              autoFocus={false}
            />
          </div>
        )}

        <TabsContent value={activeTab} className="mt-3 space-y-0">
          {displayPairs.length === 0 ? (
            <Card className="p-8 text-center bg-muted/20">
              <p className="text-sm text-muted-foreground">
                {activeTab === "favorites" ? "No favorites yet" : "No pairs found"}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {displayPairs.map((pair) => (
                <Card
                  key={pair.symbol}
                  className={`p-3 cursor-pointer transition-all hover:scale-[1.02] hover:border-primary/50 ${
                    selectedPair === pair.symbol ? 'border-primary bg-primary/5' : 'bg-card/50'
                  }`}
                  onClick={() => onPairSelect(pair.symbol)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-sm">{pair.baseAsset}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(pair.symbol);
                      }}
                    >
                      <Star 
                        className={`h-3 w-3 ${pair.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} 
                      />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    /{pair.quoteAsset}
                  </div>
                  <div className="text-base font-bold mb-1">
                    ₹{pair.lastPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-xs font-medium ${
                    pair.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {pair.priceChange24h >= 0 ? '+' : ''}{pair.priceChange24h.toFixed(2)}%
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
