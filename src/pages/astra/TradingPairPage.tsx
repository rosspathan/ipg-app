import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OrderFormPro } from "@/components/trading/OrderFormPro";
import { OrderBookCompact } from "@/components/trading/OrderBookCompact";
import { OpenOrderCard } from "@/components/trading/OpenOrderCard";
import { FundsTab } from "@/components/trading/FundsTab";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useUserBalance } from "@/hooks/useUserBalance";
import { useTradingAPI } from "@/hooks/useTradingAPI";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useToast } from "@/hooks/use-toast";
import { useMarketOrderBook, useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { ComplianceGate } from "@/components/compliance/ComplianceGate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export function TradingPairPage() {
  const params = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: pairs } = useTradingPairs();
  const { data: balances, isLoading: balancesLoading } = useUserBalance();
  const { placeOrder } = useTradingAPI();

  // Tab state for Open Orders / Funds
  type BottomTab = 'orders' | 'funds';
  const [activeTab, setActiveTab] = useState<BottomTab>('orders');

  // Pair picker state
  const [pairSearch, setPairSearch] = useState("");
  const [pairPickerOpen, setPairPickerOpen] = useState(false);

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

  // Filter pairs for picker dropdown
  const filteredPairs = pairs?.filter(p => 
    p.symbol.toLowerCase().includes(pairSearch.toLowerCase())
  ).slice(0, 20) || [];

  // Popular pairs first
  const popularSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
  const sortedPairs = [...filteredPairs].sort((a, b) => {
    const aPopular = popularSymbols.indexOf(a.symbol);
    const bPopular = popularSymbols.indexOf(b.symbol);
    if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;
    if (aPopular !== -1) return -1;
    if (bPopular !== -1) return 1;
    return b.volume24h - a.volume24h;
  });

  const handlePairSelect = (pairSymbol: string) => {
    const urlFormat = pairSymbol.replace('/', '-');
    navigate(`/app/trade/${urlFormat}`);
    setPairPickerOpen(false);
    setPairSearch("");
  };

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
      const result = await placeOrder({
        symbol: pair.symbol,
        side: params.side,
        type: params.type,
        quantity: params.quantity,
        price: params.price,
      });

      // Check the actual result - don't assume success
      if (!result || !result.success) {
        toast({
          title: "Order failed",
          description: result?.error || "Failed to place order",
          variant: "destructive",
        });
        return;
      }

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
        {/* Clean Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/app/trade")} className="p-1">
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              
              {/* Functional Pair Picker Dropdown */}
              <DropdownMenu open={pairPickerOpen} onOpenChange={setPairPickerOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1">
                    <span className="text-foreground font-semibold text-lg">{pair.symbol}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 bg-card border-border p-2">
                  {/* Search Input */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pairs..."
                      value={pairSearch}
                      onChange={(e) => setPairSearch(e.target.value)}
                      className="pl-8 h-9 bg-muted border-border text-foreground"
                      autoFocus
                    />
                  </div>
                  
                  {/* Pairs List */}
                  <div className="max-h-64 overflow-y-auto space-y-0.5">
                    {sortedPairs.map((p) => (
                      <DropdownMenuItem
                        key={p.symbol}
                        onClick={() => handlePairSelect(p.symbol)}
                        className={cn(
                          "flex items-center justify-between px-2 py-2 rounded cursor-pointer",
                          p.symbol === pair.symbol && "bg-muted"
                        )}
                      >
                        <span className="font-medium text-foreground">{p.symbol}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground font-mono">
                            ${p.price >= 1 ? p.price.toFixed(2) : p.price.toFixed(6)}
                          </span>
                          <span className={p.change24h >= 0 ? "text-emerald-400" : "text-destructive"}>
                            {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {sortedPairs.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No pairs found
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <span className={cn("text-sm font-medium", priceChangeColor)}>
                {pair.change24h >= 0 ? "+" : ""}{pair.change24h.toFixed(2)}%
              </span>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column: Order Form */}
            <div className="relative overflow-hidden isolate">
              <OrderFormPro
                baseCurrency={pair.baseAsset}
                quoteCurrency={pair.quoteAsset}
                availableBase={baseBalance?.available || 0}
                availableQuote={quoteBalance?.available || 0}
                availableBaseUsd={baseBalance?.usd_value || 0}
                availableQuoteUsd={quoteBalance?.usd_value || 0}
                currentPrice={pair.price}
                onPlaceOrder={handlePlaceOrder}
              />
            </div>

            {/* Right Column: Compact Order Book */}
            <div className="h-[500px] relative overflow-hidden isolate">
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

          {/* Open Orders / Funds Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={cn(
                    "text-sm pb-2 border-b-2",
                    activeTab === 'orders' 
                      ? "text-foreground font-medium border-amber-500" 
                      : "text-muted-foreground border-transparent"
                  )}
                >
                  Open Orders ({openOrders.length})
                </button>
                <button 
                  onClick={() => setActiveTab('funds')}
                  className={cn(
                    "text-sm pb-2 border-b-2",
                    activeTab === 'funds' 
                      ? "text-foreground font-medium border-amber-500" 
                      : "text-muted-foreground border-transparent"
                  )}
                >
                  Funds
                </button>
              </div>
              <button 
                onClick={() => navigate(activeTab === 'orders' ? '/app/orders' : '/app/wallet')}
                className="text-amber-500 text-xs font-medium"
              >
                View All
              </button>
            </div>
            
            {activeTab === 'orders' ? (
              openOrders.length === 0 ? (
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
              )
            ) : (
              <FundsTab balances={balances || []} loading={balancesLoading} />
            )}
          </div>
        </div>
      </div>
    </ComplianceGate>
  );
}