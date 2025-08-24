import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Star, TrendingUp, TrendingDown } from "lucide-react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { useCatalog } from "@/hooks/useCatalog";
import AssetLogo from "@/components/AssetLogo";

const MarketsScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const { pairsList, status } = useCatalog();
  const loading = status === 'loading';

  // Use the enhanced pairs list directly
  const cryptoPairs = pairsList.map(pair => ({
    pair: pair.pair,
    name: `${pair.base_symbol} / ${pair.quote_symbol}`,
    marketId: pair.id,
    baseSymbol: pair.base_symbol,
    quoteSymbol: pair.quote_symbol,
    baseLogo: pair.base_logo,
    quoteLogo: pair.quote_logo,
    symbol: pair.tradingview_symbol || `BINANCE:${pair.base_symbol}${pair.quote_symbol}`,
  }));

  const filteredPairs = cryptoPairs.filter(crypto =>
    crypto.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crypto.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleWatchlist = (pair: string) => {
    setWatchlist(prev => 
      prev.includes(pair) 
        ? prev.filter(p => p !== pair)
        : [...prev, pair]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background px-4 py-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Live Markets</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading markets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background px-4 py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Live Markets</h1>
      </div>

      {/* TradingView Ticker */}
      <div className="mb-6 rounded-lg overflow-hidden">
        <TradingViewWidget 
          widgetType="ticker" 
          height={60}
          colorTheme="dark"
        />
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search crypto pairs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="flex-1">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">Market Overview</TabsTrigger>
          <TabsTrigger value="charts">Live Charts</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Market Overview Widget */}
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Market Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TradingViewWidget 
                widgetType="market-overview" 
                height={500}
                colorTheme="dark"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          {cryptoPairs.length === 0 ? (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No markets available</h3>
                <p className="text-muted-foreground">
                  No trading pairs have been configured yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPairs.map((crypto) => (
                <Card 
                  key={crypto.marketId} 
                  className="bg-gradient-card shadow-card border-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/market-detail/${crypto.pair.replace('/', '-')}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="flex -space-x-1">
                          <AssetLogo symbol={crypto.baseSymbol} logoUrl={crypto.baseLogo} size="sm" />
                          <AssetLogo symbol={crypto.quoteSymbol} logoUrl={crypto.quoteLogo} size="sm" />
                        </div>
                        {crypto.name} ({crypto.pair})
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(crypto.pair);
                        }}
                      >
                        <Star 
                          className={`w-4 h-4 ${
                            watchlist.includes(crypto.pair) 
                              ? "fill-yellow-400 text-yellow-400" 
                              : "text-muted-foreground"
                          }`} 
                        />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 pb-4">
                    <TradingViewWidget 
                      symbol={crypto.symbol}
                      widgetType="mini-chart"
                      height={200}
                      colorTheme="dark"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="watchlist" className="space-y-4">
          {watchlist.length === 0 ? (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No items in watchlist</h3>
                <p className="text-muted-foreground">
                  Add crypto pairs to your watchlist to track them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cryptoPairs
                .filter(crypto => watchlist.includes(crypto.pair))
                .map((crypto) => (
                  <Card 
                    key={crypto.marketId} 
                    className="bg-gradient-card shadow-card border-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/market-detail/${crypto.pair.replace('/', '-')}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div className="flex -space-x-1">
                            <AssetLogo symbol={crypto.baseSymbol} logoUrl={crypto.baseLogo} size="sm" />
                            <AssetLogo symbol={crypto.quoteSymbol} logoUrl={crypto.quoteLogo} size="sm" />
                          </div>
                          {crypto.name} ({crypto.pair})
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(crypto.pair);
                          }}
                        >
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 pb-4">
                      <TradingViewWidget 
                        symbol={crypto.symbol}
                        widgetType="mini-chart"
                        height={200}
                        colorTheme="dark"
                      />
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketsScreen;