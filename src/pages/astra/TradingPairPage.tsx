import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, Loader2, Star, BarChart2 } from "lucide-react";
import { OrderFormPro } from "@/components/trading/OrderFormPro";
import { OrderBookUnified } from "@/components/trading/OrderBookUnified";
import { TradeCandlestickChart } from "@/components/trading/TradeCandlestickChart";
import { TradingHistoryTabs } from "@/components/trading/TradingHistoryTabs";
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
import { useRecentTrades } from "@/hooks/useRecentTrades";
import { cn } from "@/lib/utils";
import { ComplianceGate } from "@/components/compliance/ComplianceGate";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useQueryClient } from "@tanstack/react-query";
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
  const formatVol = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K` : v.toFixed(2);
  const isPositive = pair.change24h >= 0;

  const toggleFavorite = () => {
    const favs = JSON.parse(localStorage.getItem('favorite-pairs') || '[]');
    const nf = isFavorite ? favs.filter((f: string) => f !== urlSymbol) : [...favs, urlSymbol];
    localStorage.setItem('favorite-pairs', JSON.stringify(nf));
    setIsFavorite(!isFavorite);
  };

  return (
    <ComplianceGate requireAgeVerification requireTermsAcceptance requireRiskDisclosure>
      <div className="flex flex-col bg-[#020617] min-h-screen">
        {/* ═══ PREMIUM HEADER ═══ */}
        <header className="sticky top-0 z-50 bg-[#020617]/98 backdrop-blur-xl border-b border-[hsl(230,20%,20%)]/40">
          <div className="flex items-center h-12 px-3 gap-2">
            {/* Back - 44x44 touch target */}
            <button
              onClick={() => navigate("/app/trade")}
              className="flex items-center justify-center w-10 h-10 -ml-1 rounded-xl active:bg-[hsl(230,30%,15%)] transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            {/* Pair selector */}
            <div className="relative">
              <button
                onClick={() => setPairPickerOpen(!pairPickerOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg active:bg-[hsl(230,30%,12%)] transition-colors"
              >
                <span className="text-base font-bold text-[#FFFFFF] tracking-tight">{pair.baseAsset}<span className="text-[#B0B7C3]">/{pair.quoteAsset}</span></span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/40 transition-transform", pairPickerOpen && "rotate-180")} />
              </button>

              {/* Pair picker dropdown */}
              {pairPickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPairPickerOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-72 bg-[#0B1220] border border-[hsl(230,20%,22%)]/50 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-[hsl(230,20%,18%)]/40">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
                        <Input
                          placeholder="Search pairs…"
                          value={pairSearch}
                          onChange={(e) => setPairSearch(e.target.value)}
                          className="pl-8 h-8 bg-[#060D18] border-[hsl(230,20%,20%)]/40 text-sm text-[#FFFFFF] rounded-lg"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {sortedPairs.map((p) => (
                        <button
                          key={p.symbol}
                          onClick={() => { navigate(`/app/trade/${p.symbol.replace('/', '-')}`); setPairPickerOpen(false); setPairSearch(""); }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors",
                            p.symbol === pair.symbol ? "bg-accent/5" : "hover:bg-[hsl(230,20%,12%)] active:bg-[hsl(230,20%,15%)]"
                          )}
                        >
                          <span className="text-[13px] font-semibold text-[#FFFFFF]">{p.symbol}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-mono tabular-nums text-muted-foreground">{formatPrice(p.price)}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              p.change24h >= 0 ? "text-success bg-success/10" : "text-danger bg-danger/10"
                            )}>
                              {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Price + change */}
            <div className="flex items-baseline gap-1.5 mr-1">
              <span className={cn("text-base font-bold font-mono tabular-nums", isPositive ? "text-success" : "text-danger")}>
                {formatPrice(lastTradePrice)}
              </span>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                isPositive ? "text-success bg-success/12" : "text-danger bg-danger/12"
              )}>
                {isPositive ? "+" : ""}{pair.change24h.toFixed(2)}%
              </span>
            </div>

            {/* Actions */}
            <button onClick={toggleFavorite} className="flex items-center justify-center w-9 h-9 rounded-lg active:bg-[hsl(230,30%,15%)]">
              <Star className={cn("h-4 w-4", isFavorite ? "fill-warning text-warning" : "text-muted-foreground/30")} />
            </button>
            <AdminMarketMakerControls isAdmin={isAdmin} />
          </div>

          {/* ═══ STATS STRIP ═══ */}
          <div className="flex items-center gap-5 px-3 pb-2 overflow-x-auto no-scrollbar">
            {[
              { label: "24h High", value: formatPrice(pair.high24h || 0) },
              { label: "24h Low", value: formatPrice(pair.low24h || 0) },
              { label: "Vol", value: formatVol(pair.volume24h || 0) },
              { label: "Bid", value: formatPrice(bestBidPrice), color: "text-[#00E676]" },
              { label: "Ask", value: formatPrice(bestAskPrice), color: "text-[#FF4D4F]" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col whitespace-nowrap">
                <span className="text-[9px] text-[#6B7280] font-semibold uppercase tracking-widest">{label}</span>
                <span className={cn("text-[11px] font-mono tabular-nums font-semibold", color || "text-[#B0B7C3]")}>{value}</span>
              </div>
            ))}
          </div>
        </header>

        {/* ═══ CHART TOGGLE ═══ */}
        <button
          onClick={() => setChartOpen(!chartOpen)}
          className={cn(
            "flex items-center justify-center gap-1.5 h-8 text-[10px] font-semibold transition-colors",
            "border-b border-[hsl(230,20%,12%)]/40",
            chartOpen ? "text-accent bg-accent/5" : "text-muted-foreground/40 active:text-foreground/60"
          )}
        >
          <BarChart2 className="h-3 w-3" />
          <span>Chart</span>
          <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", chartOpen && "rotate-180")} />
        </button>
        {chartOpen && (
          <div className="px-1.5 pb-1.5 border-b border-[hsl(230,20%,12%)]/40">
            <TradeCandlestickChart symbol={pair.symbol} quoteCurrency={pair.quoteAsset} />
          </div>
        )}

        {/* ═══ MAIN TRADING MODULE - Premium Parent Card ═══ */}
        <div className="mx-2 mt-2 rounded-2xl bg-[#0B1220] border border-[hsl(230,20%,20%)]/35 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          <div className="flex flex-row" style={{ minHeight: 440 }}>
            {/* Order Form - 65% — dominant side */}
            <div className="flex flex-col p-3.5 min-w-0" style={{ flex: '0 0 65%' }}>
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
            {/* Order Book - 35% — compact side */}
            <div className="flex flex-col min-w-0 border-l border-[hsl(230,20%,20%)]/30" style={{ flex: '1 1 0%' }}>
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
        </div>

        <GhostLockWarning />

        {/* ═══ HISTORY TABS - Premium Card ═══ */}
        <div className="mx-2 mt-2 mb-2 rounded-2xl bg-[#0B1220] border border-[hsl(230,20%,20%)]/35 shadow-[0_4px_24px_rgba(0,0,0,0.5)] pb-[max(env(safe-area-inset-bottom,0px),16px)]">
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
