import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderFormPro } from "@/components/trading/OrderFormPro";
import { OrderBookCompact } from "@/components/trading/OrderBookCompact";
import { OpenOrderCard } from "@/components/trading/OpenOrderCard";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useUserBalance } from "@/hooks/useUserBalance";
import { useTradingAPI } from "@/hooks/useTradingAPI";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useToast } from "@/hooks/use-toast";
import { useMarketOrderBook, useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { ComplianceGate } from "@/components/compliance/ComplianceGate";

export function TradingPairPage() {
  const params = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: pairs } = useTradingPairs();
  const { data: balances } = useUserBalance();
  const { placeOrder } = useTradingAPI();

  // Convert URL format (ETH-USDT) back to API format (ETH/USDT)
  const urlSymbol = params.symbol || "";
  const symbol = urlSymbol.replace('-', '/');

  const pair = pairs?.find((p) => p.symbol === symbol);

  const [showChart, setShowChart] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

  // Get user orders
  const { orders, cancelOrder } = useUserOrders(symbol);

  // Subscribe to real-time market data
  const subscribe = useMarketStore((state) => state.subscribe);
  const unsubscribe = useMarketStore((state) => state.unsubscribe);
  
  // Get real-time order book from Binance WebSocket
  const orderBook = useMarketOrderBook(symbol);

  // Subscribe to market data when component mounts
  useEffect(() => {
    if (symbol) {
      subscribe(symbol);
    }
    return () => {
      if (symbol) {
        unsubscribe(symbol);
      }
    };
  }, [symbol, subscribe, unsubscribe]);

  useEffect(() => {
    if (!pair && pairs && pairs.length > 0) {
      toast({
        title: "Pair not found",
        description: "Redirecting to markets overview...",
        variant: "destructive",
      });
      navigate("/app/trade");
    }
  }, [pair, pairs, navigate, toast]);

  if (!pair) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const quoteBalance = balances?.find((b) => b.symbol === pair.quoteAsset);
  const baseBalance = balances?.find((b) => b.symbol === pair.baseAsset);

  const handlePriceClick = (price: number) => {
    setSelectedPrice(price);
  };

  const handlePlaceOrder = async (params: { side: 'buy' | 'sell'; type: 'market' | 'limit'; price?: number; quantity: number }) => {
    try {
      await placeOrder({
        symbol: pair.symbol,
        side: params.side,
        type: params.type,
        quantity: params.quantity,
        price: params.price,
      });

      toast({
        title: "Order placed",
        description: `${params.side.toUpperCase()} order for ${params.quantity} ${pair.baseAsset} placed successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Order failed",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
    } catch (error: any) {
      toast({
        title: "Cancel failed",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  const openOrders = orders?.filter(o => o.status === 'pending' || o.status === 'open') || [];
  const priceChangeColor = pair.change24h >= 0 ? "text-emerald-400" : "text-destructive";

  return (
    <ComplianceGate
      requireAgeVerification
      requireTermsAcceptance
      requireRiskDisclosure
    >
      <div className="flex flex-col h-screen bg-background">
        {/* Compact Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/app/trade")} className="p-1">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="font-semibold">{pair.symbol}</div>
                <div className={cn("text-xs font-medium flex items-center gap-1", priceChangeColor)}>
                  {pair.change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(pair.change24h).toFixed(2)}%
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowChart(!showChart)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {showChart ? "Hide" : "Show"} Chart
              <ChevronDown className={cn("h-3 w-3", showChart && "rotate-180")} />
            </button>
          </div>

          {/* 24h Stats Row */}
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div>
              <span className="text-muted-foreground">H: </span>
              <span className="font-mono">${pair.high24h.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">L: </span>
              <span className="font-mono">${pair.low24h.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Vol: </span>
              <span className="font-mono">${(pair.volume24h / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>

        {/* Chart Section (Optional) */}
        {showChart && (
          <Card className="mx-3 mt-3 p-4 bg-muted/20">
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chart coming soon...
            </div>
          </Card>
        )}

        {/* Main Content - KBC Style 2 Column Layout */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Left Column: Order Form */}
            <div>
              <OrderFormPro
                baseCurrency={pair.baseAsset}
                quoteCurrency={pair.quoteAsset}
                availableBase={baseBalance?.available || 0}
                availableQuote={quoteBalance?.available || 0}
                currentPrice={pair.price}
                onPlaceOrder={handlePlaceOrder}
              />
            </div>

            {/* Right Column: Compact Order Book */}
            <div className="h-[500px]">
              <OrderBookCompact
                asks={orderBook?.asks.slice(0, 8).map(a => ({ price: a.price, quantity: a.quantity })) || []}
                bids={orderBook?.bids.slice(0, 8).map(b => ({ price: b.price, quantity: b.quantity })) || []}
                currentPrice={pair.price}
                priceChange={pair.change24h}
                quoteCurrency={pair.quoteAsset}
                onPriceClick={handlePriceClick}
              />
            </div>
          </div>

          {/* Open Orders Section */}
          <div className="mt-4">
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="bg-muted/30 w-full justify-start">
                <TabsTrigger value="orders" className="text-xs">
                  Open Orders ({openOrders.length})
                </TabsTrigger>
                <TabsTrigger value="funds" className="text-xs">
                  Funds
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="orders" className="mt-3">
                {openOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No open orders
                  </div>
                ) : (
                  <div className="space-y-2">
                    {openOrders.map((order, idx) => (
                      <OpenOrderCard
                        key={order.id}
                        order={{
                          id: order.id,
                          symbol: order.symbol,
                          side: order.side as 'buy' | 'sell',
                          order_type: order.order_type,
                          price: order.price || 0,
                          amount: order.amount,
                          filled_amount: order.filled_amount || 0,
                          created_at: order.created_at,
                          status: order.status,
                        }}
                        index={idx}
                        onCancel={handleCancelOrder}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="funds" className="mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">{pair.quoteAsset}</div>
                    <div className="font-mono font-medium">
                      {quoteBalance?.available.toFixed(2) || "0.00"}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">{pair.baseAsset}</div>
                    <div className="font-mono font-medium">
                      {baseBalance?.available.toFixed(4) || "0.0000"}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ComplianceGate>
  );
}
