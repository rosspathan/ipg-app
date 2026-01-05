import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, Loader2, Wifi, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OrderFormPro } from "@/components/trading/OrderFormPro";
import { OrderBookCompact } from "@/components/trading/OrderBookCompact";
import { OpenOrderCard } from "@/components/trading/OpenOrderCard";
import { FundsTab } from "@/components/trading/FundsTab";
import { TradeHistoryTab } from "@/components/trading/TradeHistoryTab";
import { MarketStatsHeader } from "@/components/trading/MarketStatsHeader";
import { AdminMarketMakerControls } from "@/components/trading/AdminMarketMakerControls";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useBep20Balances } from "@/hooks/useBep20Balances";
import { useTradingAPI } from "@/hooks/useTradingAPI";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useRealtimeOrderBook } from "@/hooks/useRealtimeOrderBook";
import { useRealtimeTradingBalances } from "@/hooks/useRealtimeTradingBalances";
import { useAdminCheck } from "@/hooks/useAdminCheck";

import { useToast } from "@/hooks/use-toast";
import { useTradingWebSocket } from "@/hooks/useTradingWebSocket";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { ComplianceGate } from "@/components/compliance/ComplianceGate";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export function TradingPairPage() {
  const { session, loading: authLoading, user } = useAuthUser();
  
  // Auth loading guard - wait for auth to initialize
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Redirect to login if no session OR no user after auth initialized
  if (!session || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <TradingPairPageContent />;
}

function TradingPairPageContent() {
  const params = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: pairs, refetch: refetchPairs } = useTradingPairs();
  const { balances: bep20Balances, isLoading: balancesLoading, refetch: refetchBalances } = useBep20Balances();
  const { placeOrder } = useTradingAPI();
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const { isAdmin } = useAdminCheck();

  // Tab state for Open Orders / Funds / History
  type BottomTab = 'orders' | 'funds' | 'history';
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
  const { orders, cancelOrder, refetch: refetchOrders } = useUserOrders(symbol);

  // Real-time order book from database (auto-updates on changes)
  const { data: internalOrderBookData, refetch: refetchOrderBook } = useRealtimeOrderBook(symbol);
  
  // Enable real-time balance and trade notifications
  useRealtimeTradingBalances();

  // Subscribe to internal trading WebSocket for order book and trades
  const { 
    orderBook: wsOrderBook, 
    trades: internalTrades,
    isConnected: wsConnected,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    subscribeToUserUpdates
  } = useTradingWebSocket();

  // Subscribe to market data for reference prices
  const subscribe = useMarketStore((state) => state.subscribe);
  const unsubscribe = useMarketStore((state) => state.unsubscribe);
  const marketPrice = useMarketStore((state) => state.tickers[symbol]?.lastPrice);

  // Use internal order book from database, fallback to websocket
  const orderBook = internalOrderBookData || wsOrderBook[symbol];

  // Subscribe to internal WebSocket for order book
  useEffect(() => {
    if (symbol && wsConnected) {
      subscribeToSymbol(symbol);
      if (user?.id) {
        subscribeToUserUpdates(user.id);
      }
    }
    return () => {
      if (symbol) {
        unsubscribeFromSymbol(symbol);
      }
    };
  }, [symbol, wsConnected, user?.id, subscribeToSymbol, unsubscribeFromSymbol, subscribeToUserUpdates]);

  // Subscribe to market data for reference prices
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

  // Note: Real-time subscriptions for orders, trades, and balances are now handled 
  // by useRealtimeTradingBalances() and useRealtimeOrderBook() hooks

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

  // Find balances for the trading pair - use INTERNAL (app) balances ONLY for trading
  const quoteBalanceData = bep20Balances?.find((b) => b.symbol === pair.quoteAsset);
  const baseBalanceData = bep20Balances?.find((b) => b.symbol === pair.baseAsset);
  
  // Use ONLY internal balances for trading (wallet_balances table) - these are what settle_trade uses
  // Available = spendable now, Locked = in open orders
  // DO NOT fallback to on-chain - user must explicitly sync first
  const quoteBalance = {
    symbol: pair.quoteAsset,
    available: quoteBalanceData?.appAvailable ?? 0,
    locked: quoteBalanceData?.appLocked ?? 0,
    total: quoteBalanceData?.appBalance ?? 0
  };
  const baseBalance = {
    symbol: pair.baseAsset,
    available: baseBalanceData?.appAvailable ?? 0,
    locked: baseBalanceData?.appLocked ?? 0,
    total: baseBalanceData?.appBalance ?? 0
  };

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
        trading_mode: 'internal', // Use internal balance for trading (required for settlement)
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
      <div className="flex flex-col h-screen bg-background trade-density">
        {/* Clean Header with Pair Picker */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-background/95 backdrop-blur-sm border-b border-border px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate("/app/trade")} 
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              
              {/* Functional Pair Picker Dropdown */}
              <DropdownMenu open={pairPickerOpen} onOpenChange={setPairPickerOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-3 py-1.5 transition-colors">
                    <span className="text-foreground font-bold text-lg">{pair.symbol}</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      pairPickerOpen && "rotate-180"
                    )} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 bg-card/95 backdrop-blur-lg border-border p-2 shadow-xl">
                  {/* Search Input */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pairs..."
                      value={pairSearch}
                      onChange={(e) => setPairSearch(e.target.value)}
                      className="pl-9 h-10 bg-muted/50 border-border text-foreground rounded-lg"
                      autoFocus
                    />
                  </div>
                  
                  {/* Pairs List */}
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    {sortedPairs.map((p) => (
                      <DropdownMenuItem
                        key={p.symbol}
                        onClick={() => handlePairSelect(p.symbol)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                          p.symbol === pair.symbol && "bg-primary/10 border border-primary/20"
                        )}
                      >
                        <span className="font-semibold text-foreground">{p.symbol}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground font-mono">
                            ${p.price >= 1 ? p.price.toFixed(2) : p.price.toFixed(6)}
                          </span>
                          <span className={cn(
                            "font-medium px-1.5 py-0.5 rounded",
                            p.change24h >= 0 
                              ? "text-emerald-400 bg-emerald-500/10" 
                              : "text-red-400 bg-red-500/10"
                          )}>
                            {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {sortedPairs.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        No pairs found
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Connection Status + Admin Controls */}
            <div className="flex items-center gap-2">
              {/* Admin Market Maker Controls */}
              <AdminMarketMakerControls isAdmin={isAdmin} />
              
              {wsConnected ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-400">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted border border-border">
                  <WifiOff className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Market Stats Header */}
        <MarketStatsHeader
          symbol={pair.symbol}
          currentPrice={pair.price}
          priceChange24h={pair.change24h}
          high24h={pair.high24h}
          low24h={pair.low24h}
          volume24h={pair.volume24h}
          isConnected={wsConnected}
          quoteCurrency={pair.quoteAsset}
        />

        {/* Chart Section (Optional) */}
        {showChart && (
          <Card className="mx-3 mt-3 p-4 bg-muted/20 rounded-xl">
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chart coming soon...
            </div>
          </Card>
        )}

        {/* Main Content - Side by side layout */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Order Form */}
            <div className="relative overflow-hidden isolate">
              <OrderFormPro
                baseCurrency={pair.baseAsset}
                quoteCurrency={pair.quoteAsset}
                availableBase={baseBalance.available}
                availableQuote={quoteBalance.available}
                lockedBase={baseBalance.locked}
                lockedQuote={quoteBalance.locked}
                availableBaseUsd={baseBalance.total * pair.price}
                availableQuoteUsd={quoteBalance.total}
                currentPrice={pair.price}
                onPlaceOrder={handlePlaceOrder}
              />
            </div>

            {/* Order Book */}
            <div className="h-[400px] sm:h-[480px] lg:h-[520px] relative overflow-hidden isolate">
              <OrderBookCompact
                asks={orderBook?.asks?.slice(0, 8).map((a: any) => ({ 
                  price: typeof a === 'object' ? a.price : a[0], 
                  quantity: typeof a === 'object' ? a.quantity : a[1] 
                })) || []}
                bids={orderBook?.bids?.slice(0, 8).map((b: any) => ({ 
                  price: typeof b === 'object' ? b.price : b[0], 
                  quantity: typeof b === 'object' ? b.quantity : b[1] 
                })) || []}
                currentPrice={pair.price}
                priceChange={pair.change24h}
                quoteCurrency={pair.quoteAsset}
                onPriceClick={handlePriceClick}
                marketPrice={marketPrice}
                isLoading={!pair}
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
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "text-sm pb-2 border-b-2",
                    activeTab === 'history' 
                      ? "text-foreground font-medium border-amber-500" 
                      : "text-muted-foreground border-transparent"
                  )}
                >
                  Trade History
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
            ) : activeTab === 'history' ? (
              <TradeHistoryTab symbol={symbol} />
            ) : (
              <FundsTab 
                balances={bep20Balances?.map(b => ({
                  symbol: b.symbol,
                  name: b.name,
                  balance: b.appBalance || b.onchainBalance,
                  available: b.appAvailable || 0,
                  locked: b.appLocked || 0,
                  onchainBalance: b.onchainBalance,
                  appBalance: b.appBalance,
                  appAvailable: b.appAvailable,
                  appLocked: b.appLocked,
                  usd_value: b.onchainUsdValue,
                  logo_url: b.logoUrl
                })) || []} 
                loading={balancesLoading} 
              />
            )}
          </div>
        </div>
      </div>
    </ComplianceGate>
  );
}