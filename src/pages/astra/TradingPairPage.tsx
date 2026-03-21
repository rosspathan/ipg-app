import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, Loader2, Star, Bell, X } from "lucide-react";
import { OrderFormPro } from "@/components/trading/OrderFormPro";
import { OrderBookUnified } from "@/components/trading/OrderBookUnified";
import { TradeCandlestickChart } from "@/components/trading/TradeCandlestickChart";
import { TradingHistoryTabs } from "@/components/trading/TradingHistoryTabs";
import { RecentTradesTicker } from "@/components/trading/RecentTradesTicker";
import { useRecentTrades } from "@/hooks/useRecentTrades";
import { OrderDetailsDrawer } from "@/components/trading/OrderDetailsDrawer";
import { AdminMarketMakerControls } from "@/components/trading/AdminMarketMakerControls";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useBep20Balances } from "@/hooks/useBep20Balances";
import { useTradingAPI } from "@/hooks/useTradingAPI";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useAllOpenOrders } from "@/hooks/useAllOpenOrders";
import { useRealtimeOrderBook } from "@/hooks/useRealtimeOrderBook";
import { useRealtimeTradingBalances } from "@/hooks/useRealtimeTradingBalances";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { GhostLockWarning } from "@/components/trading/GhostLockWarning";
import { useToast } from "@/hooks/use-toast";
import { useTradingWebSocket } from "@/hooks/useTradingWebSocket";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { useOrientation } from "@/hooks/useOrientation";
import { useWindowSize } from "@/hooks/useWindowSize";
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
  if (authLoading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!session || !user) return <Navigate to="/auth/login" replace />;
  return <TradingPairPageContent />;
}

function TradingPairPageContent() {
  const params = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: pairs } = useTradingPairs();
  const { balances: bep20Balances } = useBep20Balances();
  const { placeOrder } = useTradingAPI();
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const { isAdmin } = useAdminCheck();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [pairSearch, setPairSearch] = useState("");
  const [pairPickerOpen, setPairPickerOpen] = useState(false);
  const urlSymbol = params.symbol || "";
  const symbol = urlSymbol.replace('-', '/');
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const { orders, cancelOrder } = useUserOrders(symbol);
  const { orders: allOpenOrders, cancelOrder: cancelAnyOrder } = useAllOpenOrders();
  const { data: internalOrderBookData } = useRealtimeOrderBook(symbol);
  useRealtimeTradingBalances();
  const { data: recentTrades = [] } = useRecentTrades(symbol, 10);

  const {
    orderBook: wsOrderBook, trades: internalTrades, isConnected: wsConnected,
    subscribeToSymbol, unsubscribeFromSymbol, subscribeToUserUpdates
  } = useTradingWebSocket();

  const subscribe = useMarketStore((state) => state.subscribe);
  const unsubscribe = useMarketStore((state) => state.unsubscribe);

  const orderBook = internalOrderBookData || wsOrderBook[symbol];
  const [chartOpen, setChartOpen] = useState(false);
  const pair = pairs?.find((p) => p.symbol === symbol);

  const [isFavorite, setIsFavorite] = useState(() => {
    const favs = JSON.parse(localStorage.getItem('favorite-pairs') || '[]');
    return favs.includes(urlSymbol);
  });

  useEffect(() => {
    if (symbol && wsConnected) {
      subscribeToSymbol(symbol);
      if (user?.id) subscribeToUserUpdates(user.id);
    }
    return () => { if (symbol) unsubscribeFromSymbol(symbol); };
  }, [symbol, wsConnected, user?.id]);

  useEffect(() => {
    if (symbol) subscribe(symbol);
    return () => { if (symbol) unsubscribe(symbol); };
  }, [symbol, subscribe, unsubscribe]);

  useEffect(() => {
    if (!pair && pairs && pairs.length > 0) {
      toast({ title: "Pair not found", description: "Redirecting…", variant: "destructive" });
      navigate("/app/trade");
    }
  }, [pair, pairs]);

  const filteredPairs = pairs?.filter(p => p.symbol.toLowerCase().includes(pairSearch.toLowerCase())).slice(0, 20) || [];
  const popularSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
  const sortedPairs = [...filteredPairs].sort((a, b) => {
    const aP = popularSymbols.indexOf(a.symbol), bP = popularSymbols.indexOf(b.symbol);
    if (aP !== -1 && bP !== -1) return aP - bP;
    if (aP !== -1) return -1; if (bP !== -1) return 1;
    return b.volume24h - a.volume24h;
  });

  const normalizeBook = useCallback((entries: any[]) => (entries || []).map((e: any) => ({
    price: typeof e === 'object' && 'price' in e ? e.price : e[0],
    quantity: typeof e === 'object' ? (e.quantity ?? e.remaining_amount ?? e[1]) : e[1],
  })), []);

  const bookAsks = useMemo(() => normalizeBook(orderBook?.asks?.slice(0, 30)), [orderBook?.asks, normalizeBook]);
  const bookBids = useMemo(() => normalizeBook(orderBook?.bids?.slice(0, 30)), [orderBook?.bids, normalizeBook]);

  if (!pair) return <div className="flex items-center justify-center h-screen bg-background text-muted-foreground text-sm">Loading…</div>;

  // ─── Derive last trade price (truthful) ───
  const lastTradePrice = recentTrades.length > 0 ? recentTrades[0].price : pair.price;

  const quoteBalanceData = bep20Balances?.find((b) => b.symbol === pair.quoteAsset);
  const baseBalanceData = bep20Balances?.find((b) => b.symbol === pair.baseAsset);
  const quoteBalance = { available: quoteBalanceData?.appAvailable ?? 0, locked: quoteBalanceData?.appLocked ?? 0 };
  const baseBalance = { available: baseBalanceData?.appAvailable ?? 0, locked: baseBalanceData?.appLocked ?? 0 };

  const bestBidPrice = bookBids[0]?.price || 0;
  const bestAskPrice = bookAsks[0]?.price || 0;

  const handlePriceClick = (price: number) => setSelectedPrice(price);

  const handlePlaceOrder = async (params: { side: 'buy' | 'sell'; type: 'market' | 'limit'; price?: number; quantity: number }) => {
    try {
      const result = await placeOrder({
        symbol: pair.symbol, side: params.side, type: params.type,
        quantity: params.quantity, price: params.price, trading_mode: 'internal',
      });
      if (!result?.success) {
        toast({ title: "Order failed", description: result?.error || "Failed", variant: "destructive" });
        return;
      }
      const s = result.order?.status;
      const f = result.order?.filled_amount || 0;
      if (s === 'filled') toast({ title: "Order Filled ✓", description: `${params.quantity} ${pair.baseAsset} filled` });
      else if (s === 'partially_filled' && f > 0) toast({ title: "Partially Filled", description: `${f}/${params.quantity} filled` });
      else toast({ title: "Order Placed", description: `${params.side.toUpperCase()} ${params.quantity} ${pair.baseAsset}` });

      ['bep20-balances','wallet-balances','user-balance','user-orders','all-open-orders','internal-order-book',
       'trade-history','user-trades','trading-balances','user-open-orders','user-order-history','user-trade-fills',
       'trading-pairs','recent-trades','public-order-book'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    } catch (error: any) {
      toast({ title: "Order failed", description: error.message, variant: "destructive" });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try { await cancelAnyOrder(orderId); }
    catch (error: any) { toast({ title: "Cancel failed", description: error.message, variant: "destructive" }); }
  };

  const formatPrice = (p: number) => p >= 1 ? p.toFixed(2) : p.toFixed(6);
  const formatVol = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `${(v/1e3).toFixed(2)}K` : v.toFixed(2);
  const isPositive = pair.change24h >= 0;

  return (
    <ComplianceGate requireAgeVerification requireTermsAcceptance requireRiskDisclosure>
      <div className="flex flex-col bg-background min-h-screen">
        {/* ═══ Header ═══ */}
        <div className="bg-background border-b border-border/30">
          <div className="flex items-center h-[36px] px-2">
            <button onClick={() => navigate("/app/trade")} className="p-1 -ml-0.5 mr-1 active:bg-muted rounded">
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <DropdownMenu open={pairPickerOpen} onOpenChange={setPairPickerOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-0.5 mr-2 active:bg-muted/40 rounded px-1 py-0.5">
                  <span className="text-foreground font-bold text-[13px] tracking-tight">{pair.symbol}</span>
                  <ChevronDown className={cn("h-2.5 w-2.5 text-muted-foreground/60", pairPickerOpen && "rotate-180")} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover border-border p-1.5 shadow-2xl rounded-lg z-50">
                <div className="relative mb-1.5">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input placeholder="Search…" value={pairSearch} onChange={(e) => setPairSearch(e.target.value)}
                    className="pl-7 h-7 bg-background border-border text-foreground rounded text-[10px]" autoFocus />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {sortedPairs.map((p) => (
                    <DropdownMenuItem key={p.symbol} onClick={() => { navigate(`/app/trade/${p.symbol.replace('/','-')}`); setPairPickerOpen(false); setPairSearch(""); }}
                      className={cn("flex items-center justify-between px-2 py-1 rounded cursor-pointer text-[10px]", p.symbol === pair.symbol && "bg-muted/40")}>
                      <span className="font-semibold text-foreground">{p.symbol}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-mono text-[9px]">{formatPrice(p.price)}</span>
                        <span className={cn("text-[8px] font-medium px-1 rounded-sm", p.change24h >= 0 ? "text-success bg-success/8" : "text-danger bg-danger/8")}>
                          {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-baseline gap-1 flex-1 min-w-0">
              <span className={cn("text-[14px] font-bold font-mono tabular-nums", isPositive ? "text-success" : "text-danger")}>
                {formatPrice(lastTradePrice)}
              </span>
              <span className={cn("text-[9px] font-semibold px-1 py-[0.5px] rounded-sm", isPositive ? "text-success bg-success/8" : "text-danger bg-danger/8")}>
                {isPositive ? "+" : ""}{pair.change24h.toFixed(2)}%
              </span>
            </div>

            <div className="flex items-center gap-0">
              <button onClick={() => { const favs = JSON.parse(localStorage.getItem('favorite-pairs') || '[]'); const nf = isFavorite ? favs.filter((f:string) => f !== urlSymbol) : [...favs, urlSymbol]; localStorage.setItem('favorite-pairs', JSON.stringify(nf)); setIsFavorite(!isFavorite); }}
                className="p-1 active:bg-muted rounded">
                <Star className={cn("h-3 w-3", isFavorite ? "fill-warning text-warning" : "text-muted-foreground/40")} />
              </button>
              <AdminMarketMakerControls isAdmin={isAdmin} />
            </div>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-3 px-2 pb-1 text-[8px]">
            <div><span className="text-muted-foreground/50">H </span><span className="font-mono tabular-nums text-foreground/60">{formatPrice(pair.high24h || 0)}</span></div>
            <div><span className="text-muted-foreground/50">L </span><span className="font-mono tabular-nums text-foreground/60">{formatPrice(pair.low24h || 0)}</span></div>
            <div><span className="text-muted-foreground/50">Vol </span><span className="font-mono tabular-nums text-foreground/60">{formatVol(pair.volume24h || 0)}</span></div>
            <div><span className="text-muted-foreground/50">Bid </span><span className="font-mono tabular-nums text-success/70">{formatPrice(bestBidPrice)}</span></div>
            <div><span className="text-muted-foreground/50">Ask </span><span className="font-mono tabular-nums text-danger/70">{formatPrice(bestAskPrice)}</span></div>
          </div>
        </div>

        {/* Chart toggle */}
        <button onClick={() => setChartOpen(!chartOpen)}
          className="flex items-center gap-1 text-[9px] text-muted-foreground/50 px-2 py-[3px] active:text-foreground/60 border-b border-border/20">
          <span className="font-medium">Chart</span>
          <ChevronDown className={cn("h-2 w-2 transition-transform", chartOpen && "rotate-180")} />
        </button>
        {chartOpen && (
          <div className="px-1.5 pb-1.5 border-b border-border/20">
            <TradeCandlestickChart symbol={pair.symbol} quoteCurrency={pair.quoteAsset} />
          </div>
        )}

        {/* ═══ Trade + Order Book ═══ */}
        <div className="flex flex-row gap-0" style={{ minHeight: 380 }}>
          {/* Order Form */}
          <div className="flex flex-col px-2 py-1.5 min-w-0" style={{ flex: '0 0 50%' }}>
            <OrderFormPro
              baseCurrency={pair.baseAsset}
              quoteCurrency={pair.quoteAsset}
              availableBase={baseBalance.available}
              availableQuote={quoteBalance.available}
              lockedBase={baseBalance.locked}
              lockedQuote={quoteBalance.locked}
              currentPrice={pair.price}
              lastTradePrice={lastTradePrice}
              onPlaceOrder={handlePlaceOrder}
              bestBid={bestBidPrice}
              bestAsk={bestAskPrice}
              selectedPrice={selectedPrice}
              asks={bookAsks}
              bids={bookBids}
            />
          </div>
          {/* Order Book */}
          <div className="flex flex-col min-w-0 py-1 pr-1" style={{ flex: '1 1 0%' }}>
            <OrderBookUnified
              asks={bookAsks}
              bids={bookBids}
              lastTradePrice={lastTradePrice}
              bestBid={bestBidPrice}
              bestAsk={bestAskPrice}
              priceChange={pair.change24h}
              quoteCurrency={pair.quoteAsset}
              baseCurrency={pair.baseAsset}
              onPriceClick={handlePriceClick}
              isLoading={!pair}
              maxRows={8}
            />
          </div>
        </div>

        <GhostLockWarning />

        {/* History */}
        <div className="mt-1 px-1.5 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
          <TradingHistoryTabs
            symbol={urlSymbol}
            onOrderDetails={setSelectedOrderId}
            onTradeDetails={(id) => console.log('Trade:', id)}
          />
        </div>
      </div>

      <OrderDetailsDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </ComplianceGate>
  );
}
