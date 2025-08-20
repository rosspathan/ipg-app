import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Star, TrendingUp, TrendingDown } from "lucide-react";

const MarketsScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const markets = [
    {
      pair: "BTC/USDT",
      price: "43,250.00",
      change: "+2.45",
      changePercent: "+2.45%",
      volume: "1,234.56",
      isUp: true,
    },
    {
      pair: "ETH/USDT", 
      price: "2,680.50",
      change: "-45.20",
      changePercent: "-1.66%",
      volume: "4,567.89",
      isUp: false,
    },
    {
      pair: "BTC/INR",
      price: "35,98,750",
      change: "+1,250.00",
      changePercent: "+3.12%",
      volume: "567.23",
      isUp: true,
    },
    {
      pair: "ETH/INR",
      price: "2,23,400",
      change: "-2,100.00",
      changePercent: "-0.93%",
      volume: "890.45",
      isUp: false,
    },
  ];

  const filteredMarkets = markets.filter(market =>
    market.pair.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleWatchlist = (pair: string) => {
    setWatchlist(prev => 
      prev.includes(pair) 
        ? prev.filter(p => p !== pair)
        : [...prev, pair]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Markets</h1>
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex-1 space-y-3">
        {filteredMarkets.map((market) => (
          <Card 
            key={market.pair} 
            className="bg-gradient-card shadow-card border-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/market-detail/${market.pair.replace('/', '-')}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(market.pair);
                    }}
                  >
                    <Star 
                      className={`w-4 h-4 ${
                        watchlist.includes(market.pair) 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-muted-foreground"
                      }`} 
                    />
                  </Button>
                  <div>
                    <h3 className="font-semibold text-foreground">{market.pair}</h3>
                    <p className="text-sm text-muted-foreground">Vol: {market.volume}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-foreground">{market.price}</p>
                  <div className={`flex items-center text-sm ${
                    market.isUp ? "text-green-500" : "text-red-500"
                  }`}>
                    {market.isUp ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {market.changePercent}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MarketsScreen;