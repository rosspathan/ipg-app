import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, TrendingUp, TrendingDown } from "lucide-react";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { cn } from "@/lib/utils";

const formatPrice = (price: number) => {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
};

const formatVolume = (vol: number) => {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toFixed(2);
};

type TabKey = "all" | "favorites" | "spot";

export function TradingOverview() {
  const navigate = useNavigate();
  const { data: pairs, isLoading } = useTradingPairs();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("market-favorites") || "[]");
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("market-favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const filteredPairs = pairs?.filter(pair => {
    const matchesSearch = pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pair.baseAsset.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorites = activeTab === "favorites" ? favorites.includes(pair.symbol) : true;
    return matchesSearch && matchesFavorites;
  });

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "favorites", label: "Favorites" },
    { key: "spot", label: "Spot" },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Ultra-compact header */}
      <div className="sticky top-0 z-10 pt-2 pb-0 bg-background">
        <div className="px-3 pb-2">
          <h1 className="text-[15px] font-semibold text-foreground">Markets</h1>
        </div>

        {/* Slim search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search pairs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[38px] pl-8 pr-3 text-[13px] rounded-md border-0 outline-none bg-card text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-border"
            />
          </div>
        </div>

        {/* Pro-style tabs with underline */}
        <div className="flex items-center gap-0 px-3 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative px-3 pb-2 pt-1 text-[12px] font-medium transition-colors",
                activeTab === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              {tab.key === "favorites" && <Star className="inline h-3 w-3 mr-1 -mt-0.5" />}
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-warning rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div
          className="grid items-center px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          style={{ gridTemplateColumns: '28px 1fr auto auto' }}
        >
          <span />
          <span>Pair</span>
          <span className="text-right pr-4">Price</span>
          <span className="text-right" style={{ minWidth: 64 }}>24h Chg</span>
        </div>
      </div>

      {/* Market list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[12px] text-muted-foreground">
            Loading markets...
          </div>
        ) : filteredPairs?.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[12px] text-muted-foreground">
            {activeTab === "favorites" ? "No favorites yet. Star a pair to add it." : "No markets found"}
          </div>
        ) : (
          filteredPairs?.map((pair) => {
            const isPositive = pair.change24h >= 0;
            const isFav = favorites.includes(pair.symbol);
            const [base, quote] = pair.symbol.split('/');

            return (
              <div
                key={pair.symbol}
                onClick={() => {
                  const urlSymbol = pair.symbol.replace('/', '-');
                  navigate(`/app/trade/${urlSymbol}`);
                }}
                className="grid items-center px-3 cursor-pointer transition-colors duration-75 hover:bg-muted/50 active:bg-muted border-b border-border/30"
                style={{
                  gridTemplateColumns: '28px 1fr auto auto',
                  height: 56,
                }}
              >
                {/* Star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(pair.symbol);
                  }}
                  className="flex items-center justify-center"
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5 transition-colors",
                      isFav ? "fill-warning text-warning" : "text-border hover:text-muted-foreground"
                    )}
                  />
                </button>

                {/* Pair name */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] font-semibold truncate text-foreground">{base}</span>
                    <span className="text-[11px] text-muted-foreground">/{quote}</span>
                  </div>
                  <div className="text-[10px] mt-0.5 text-muted-foreground">
                    Vol ${formatVolume(pair.volume24h)}
                  </div>
                </div>

                {/* Price */}
                <div className="text-right pr-4">
                  <span className="text-[13px] font-mono font-medium tabular-nums text-foreground">
                    ${formatPrice(pair.price)}
                  </span>
                </div>

                {/* 24h change badge */}
                <div className="flex justify-end" style={{ minWidth: 64 }}>
                  <div
                    className={cn(
                      "flex items-center justify-center gap-0.5 rounded-[3px] px-2 py-1 min-w-[58px]",
                      isPositive 
                        ? "bg-success/15 text-success" 
                        : "bg-danger/15 text-danger"
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 shrink-0" />
                    ) : (
                      <TrendingDown className="h-3 w-3 shrink-0" />
                    )}
                    <span className="text-[11px] font-mono font-semibold tabular-nums">
                      {Math.abs(pair.change24h).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
