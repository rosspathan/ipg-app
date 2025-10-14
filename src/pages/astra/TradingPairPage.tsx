import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderTicketPro } from "@/components/trading/OrderTicketPro";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useUserBalance } from "@/hooks/useUserBalance";
import { useTradingAPI } from "@/hooks/useTradingAPI";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const initialSide = searchParams.get("side") === "sell" ? "sell" : "buy";

  const [showChart, setShowChart] = useState(false);

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

  const handlePlaceOrder = async (orderData: any) => {
    try {
      await placeOrder({
        symbol: pair.symbol,
        side: orderData.side,
        type: orderData.type,
        quantity: orderData.amount,
        price: orderData.price,
      });

      toast({
        title: "Order placed",
        description: `${orderData.side.toUpperCase()} order for ${orderData.amount} ${
          pair.baseAsset
        } placed successfully`,
      });

      // Optional: Navigate to order history or stay on page
    } catch (error: any) {
      toast({
        title: "Order failed",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    }
  };

  const priceChangeColor = pair.change24h >= 0 ? "text-success" : "text-destructive";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app/trade")}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="font-semibold text-lg">{pair.symbol}</div>
              <div className="text-xs text-muted-foreground">
                {pair.baseAsset} / {pair.quoteAsset}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowChart(!showChart)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {showChart ? "Hide" : "Show"} Chart
            <ChevronDown className={cn("h-4 w-4 transition-transform", showChart && "rotate-180")} />
          </button>
        </div>

        {/* Price Info */}
        <div className="flex items-baseline gap-3">
          <div className="text-2xl font-bold font-mono">${pair.price.toFixed(2)}</div>
          <div className={cn("flex items-center gap-1 text-sm font-medium", priceChangeColor)}>
            {pair.change24h >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(pair.change24h).toFixed(2)}%
          </div>
        </div>

        {/* 24h Stats */}
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
          <div>
            <div className="text-muted-foreground">24h High</div>
            <div className="font-mono">${pair.high24h.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">24h Low</div>
            <div className="font-mono">${pair.low24h.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">24h Volume</div>
            <div className="font-mono">${(pair.volume24h / 1000000).toFixed(2)}M</div>
          </div>
        </div>
      </div>

      {/* Chart Section (Optional) */}
      {showChart && (
        <Card className="mx-4 mt-3 p-4 bg-muted/20">
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Chart coming soon...
          </div>
        </Card>
      )}

      {/* Order Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <OrderTicketPro
          pair={pair.symbol}
          currentPrice={pair.price}
          availableBalance={{
            base: baseBalance?.available || 0,
            quote: quoteBalance?.available || 0,
          }}
          takerFee={0.1}
          makerFee={0.1}
          bestBid={pair.price * 0.999}
          bestAsk={pair.price * 1.001}
          onSubmit={handlePlaceOrder}
          defaultSide={initialSide}
        />
      </div>

      {/* Quick Stats Footer */}
      <div className="border-t border-border px-4 py-3 bg-background/95 backdrop-blur">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Available {pair.quoteAsset}</div>
            <div className="font-mono font-medium">
              {quoteBalance?.available.toFixed(2) || "0.00"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Available {pair.baseAsset}</div>
            <div className="font-mono font-medium">
              {baseBalance?.available.toFixed(4) || "0.0000"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
