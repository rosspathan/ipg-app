import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";

const MarketDetailScreen = () => {
  const navigate = useNavigate();
  const { pair } = useParams<{ pair: string }>();
  const marketPair = pair?.replace('-', '/') || 'BTC/USDT';

  // Mock data - in real app, fetch based on pair
  const marketData = {
    pair: marketPair,
    price: "43,250.00",
    change: "+1,050.00",
    changePercent: "+2.45%",
    high24h: "44,100.00",
    low24h: "42,800.00",
    volume24h: "1,234.56 BTC",
    isUp: true,
  };

  const orderBookData = {
    asks: [
      { price: "43,260.00", amount: "0.5240", total: "22,650.24" },
      { price: "43,255.00", amount: "1.2150", total: "52,524.83" },
      { price: "43,252.50", amount: "0.8900", total: "38,494.73" },
    ],
    bids: [
      { price: "43,245.00", amount: "0.7500", total: "32,433.75" },
      { price: "43,240.00", amount: "1.1200", total: "48,428.80" },
      { price: "43,235.00", amount: "0.4800", total: "20,752.80" },
    ],
  };

  const recentTrades = [
    { price: "43,250.00", amount: "0.1234", time: "14:32:05", isBuy: true },
    { price: "43,248.50", amount: "0.5678", time: "14:31:45", isBuy: false },
    { price: "43,251.00", amount: "0.2345", time: "14:31:20", isBuy: true },
    { price: "43,249.00", amount: "0.8901", time: "14:30:55", isBuy: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">{marketData.pair}</h1>
        </div>
        <Button 
          variant="default"
          onClick={() => navigate(`/trading/${pair}`)}
        >
          Trade
        </Button>
      </div>

      <Card className="bg-gradient-card shadow-card border-0 mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-foreground">{marketData.price}</p>
              <div className={`flex items-center text-sm ${
                marketData.isUp ? "text-green-500" : "text-red-500"
              }`}>
                {marketData.isUp ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {marketData.change} {marketData.changePercent}
              </div>
            </div>
            <div className="text-right">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h High:</span>
                  <span>{marketData.high24h}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h Low:</span>
                  <span>{marketData.low24h}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h Volume:</span>
                  <span>{marketData.volume24h}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="chart" className="flex-1">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="orderbook">Order Book</TabsTrigger>
          <TabsTrigger value="trades">Recent Trades</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-6">
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <p className="text-muted-foreground">Chart placeholder - integrate with charting library</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orderbook" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-red-500 mb-2">Asks (Sell Orders)</h3>
                  <div className="space-y-1">
                    {orderBookData.asks.map((ask, index) => (
                      <div key={index} className="grid grid-cols-3 gap-2 text-sm">
                        <span className="text-red-500">{ask.price}</span>
                        <span className="text-foreground">{ask.amount}</span>
                        <span className="text-muted-foreground text-right">{ask.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-medium text-green-500 mb-2">Bids (Buy Orders)</h3>
                  <div className="space-y-1">
                    {orderBookData.bids.map((bid, index) => (
                      <div key={index} className="grid grid-cols-3 gap-2 text-sm">
                        <span className="text-green-500">{bid.price}</span>
                        <span className="text-foreground">{bid.amount}</span>
                        <span className="text-muted-foreground text-right">{bid.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm font-medium text-muted-foreground border-b border-border pb-2">
                  <span>Price</span>
                  <span>Amount</span>
                  <span className="text-right">Time</span>
                </div>
                {recentTrades.map((trade, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 text-sm">
                    <span className={trade.isBuy ? "text-green-500" : "text-red-500"}>
                      {trade.price}
                    </span>
                    <span className="text-foreground">{trade.amount}</span>
                    <span className="text-muted-foreground text-right">{trade.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketDetailScreen;