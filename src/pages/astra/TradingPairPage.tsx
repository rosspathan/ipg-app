import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, Loader2, Star, Bell } from "lucide-react";
import { OrderFormPro } from "@/components/trading/OrderFormPro";
import { OrderBookPremium } from "@/components/trading/OrderBookPremium";
import { TradeCandlestickChart } from "@/components/trading/TradeCandlestickChart";
import { PositionSummary } from "@/components/trading/PositionSummary";
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
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B1220]">
        <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }
  
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

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [pairSearch, setPairSearch] = useState("");
  const [pairPickerOpen, setPairPickerOpen] = useState(false);
  const urlSymbol = params.symbol || "";
  const symbol = urlSymbol.replace('-', '/');

  const [isFavorite, setIsFavorite] = useState(() => {
    const favs = JSON.parse(localStorage.getItem('favorite-pairs') || '[]');
    return favs.includes(urlSymbol);
  });
  const pair = pairs?.find((p) => p.symbol === symbol);

  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const { orders, cancelOrder, refetch: refetchOrders } = useUserOrders(symbol);
  const { orders: allOpenOrders, cancelOrder: cancelAnyOrder, isLoading: allOrdersLoading } = useAllOpenOrders();
  const { data: internalOrderBookData, refetch: refetchOrderBook } = useRealtimeOrderBook(symbol);
  useRealtimeTradingBalances();
  const { data: recentTrades = [], isLoading: recentTradesLoading } = useRecentTrades(symbol, 10);

  const { 
    orderBook: wsOrderBook, 
    trades: internalTrades,
    isConnected: wsConnected,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    subscribeToUserUpdates
  } = useTradingWebSocket();

  const subscribe = useMarketStore((state) => state.subscribe);
  const unsubscribe = useMarketStore((state) => state.unsubscribe);
  const marketPrice = useMarketStore((state) => state.tickers[symbol]?.lastPrice);

  const orderBook = internalOrderBookData || wsOrderBook[symbol];

  const [chartOpen, setChartOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [mobileMode, setMobileMode] = useState<'trade' | 'book' | 'orders'>('trade');

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

  const filteredPairs = pairs?.filter(p => 
    p.symbol.toLowerCase().includes(pairSearch.toLowerCase())
  ).slice(0, 20) || [];

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
      <div className="flex items-center justify-center h-screen bg-[#0B1220]">
        <div className="text-[#9CA3AF]">Loading...</div>
      </div>
    );
  }

  const quoteBalanceData = bep20Balances?.find((b) => b.symbol === pair.quoteAsset);
  const baseBalanceData = bep20Balances?.find((b) => b.symbol === pair.baseAsset);
  
  const quoteBalance = {
    symbol: pair.quoteAsset,
    available: quoteBalanceData?.appAvailable ?? 0,
    locked: quoteBalanceData?.appLocked ?? 0,
    total: (quoteBalanceData?.appAvailable ?? 0) + (quoteBalanceData?.appLocked ?? 0)
  };
  const baseBalance = {
    symbol: pair.baseAsset,
    available: baseBalanceData?.appAvailable ?? 0,
    locked: baseBalanceData?.appLocked ?? 0,
    total: (baseBalanceData?.appAvailable ?? 0) + (baseBalanceData?.appLocked ?? 0)
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
        trading_mode: 'internal',
      });

      if (!result || !result.success) {
        toast({
          title: "Order failed",
          description: result?.error || "Failed to place order",
          variant: "destructive",
        });
        return;
      }

      const orderStatus = result.order?.status;
      const filledAmt = result.order?.filled_amount || 0;
      
      if (orderStatus === 'filled') {
        toast({
          title: "Order Filled ✓",
          description: `${params.side.toUpperCase()} ${params.quantity} ${pair.baseAsset} filled instantly`,
        });
      } else if (orderStatus === 'partially_filled' && filledAmt > 0) {
        toast({
          title: "Partially Filled",
          description: `${filledAmt} of ${params.quantity} ${pair.baseAsset} filled, rest is open`,
        });
      } else {
        toast({
          title: "Order Placed",
          description: `${params.side.toUpperCase()} order for ${params.quantity} ${pair.baseAsset} placed`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['bep20-balances'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      queryClient.invalidateQueries({ queryKey: ['all-open-orders'] });
      queryClient.invalidateQueries({ queryKey: ['internal-order-book'] });
      queryClient.invalidateQueries({ queryKey: ['trade-history'] });
      queryClient.invalidateQueries({ queryKey: ['user-trades'] });
      queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-open-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-order-history'] });
      queryClient.invalidateQueries({ queryKey: ['user-trade-fills'] });
      queryClient.invalidateQueries({ queryKey: ['trading-pairs'] });
      
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
      await cancelAnyOrder(orderId);
    } catch (error: any) {
      toast({
        title: "Cancel failed",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (p: number) => p >= 1 ? p.toFixed(2) : p.toFixed(6);
  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  const isPositive = pair.change24h >= 0;

  const bestBidEntry = orderBook?.bids?.[0];
  const bestAskEntry = orderBook?.asks?.[0];
  const bestBidPrice = bestBidEntry 
    ? (typeof bestBidEntry === 'object' && 'price' in bestBidEntry ? bestBidEntry.price : Array.isArray(bestBidEntry) ? bestBidEntry[0] : 0)
    : 0;
  const bestAskPrice = bestAskEntry 
    ? (typeof bestAskEntry === 'object' && 'price' in bestAskEntry ? bestAskEntry.price : Array.isArray(bestAskEntry) ? bestAskEntry[0] : 0)
    : 0;

  return (
    <ComplianceGate
      requireAgeVerification
      requireTermsAcceptance
      requireRiskDisclosure
    >
      <div className="flex flex-col h-screen bg-[#0B1220] overflow-hidden">
        {/* ── Compact Pair Bar ── */}
        <div className="flex-shrink-0 bg-[#0B1220]">
          <div className="flex items-center justify-between px-2 h-[38px]">
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => navigate("/app/trade")} 
                className="p-1 active:bg-white/10 rounded"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-[#6B7280]" />
              </button>
              
              <DropdownMenu open={pairPickerOpen} onOpenChange={setPairPickerOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-0.5 px-1 py-0.5 active:bg-white/5 rounded">
                    <span className="text-[#E5E7EB] font-bold text-sm tracking-tight">{pair.symbol}</span>
                    <ChevronDown className={cn("h-3 w-3 text-[#6B7280]", pairPickerOpen && "rotate-180")} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 bg-[#111827] border-[#1F2937] p-2 shadow-2xl rounded-xl">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
                    <Input
                      placeholder="Search pairs..."
                      value={pairSearch}
                      onChange={(e) => setPairSearch(e.target.value)}
                      className="pl-9 h-8 bg-[#0B1220] border-[#1F2937] text-[#E5E7EB] rounded-lg text-xs"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-0.5">
                    {sortedPairs.map((p) => (
                      <DropdownMenuItem
                        key={p.symbol}
                        onClick={() => handlePairSelect(p.symbol)}
                        className={cn(
                          "flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs",
                          p.symbol === pair.symbol && "bg-white/5"
                        )}
                      >
                        <span className="font-semibold text-[#E5E7EB]">{p.symbol}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#9CA3AF] font-mono text-[11px]">
                            {p.price >= 1 ? p.price.toFixed(2) : p.price.toFixed(6)}
                          </span>
                          <span className={cn(
                            "font-medium text-[10px] px-1 py-0.5 rounded",
                            p.change24h >= 0 ? "text-[#16C784] bg-[#16C784]/10" : "text-[#EA3943] bg-[#EA3943]/10"
                          )}>
                            {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {sortedPairs.length === 0 && (
                      <div className="text-center py-4 text-[#9CA3AF] text-xs">No pairs found</div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {wsConnected && (
                <div className="h-1.5 w-1.5 rounded-full bg-[#16C784]" />
              )}
            </div>

            {/* Price + Change inline */}
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-sm font-bold font-mono",
                isPositive ? "text-[#16C784]" : "text-[#EA3943]"
              )}>
                {formatPrice(pair.price)}
              </span>
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                isPositive ? "text-[#16C784] bg-[#16C784]/10" : "text-[#EA3943] bg-[#EA3943]/10"
              )}>
                {isPositive ? "+" : ""}{pair.change24h.toFixed(2)}%
              </span>
            </div>

            {/* Right icons */}
            <div className="flex items-center">
              <button
                onClick={() => {
                  const favs = JSON.parse(localStorage.getItem('favorite-pairs') || '[]');
                  const newFavs = isFavorite ? favs.filter((f: string) => f !== urlSymbol) : [...favs, urlSymbol];
                  localStorage.setItem('favorite-pairs', JSON.stringify(newFavs));
                  setIsFavorite(!isFavorite);
                }}
                className="p-1.5 active:bg-white/10 rounded"
              >
                <Star className={cn("h-3.5 w-3.5", isFavorite ? "fill-yellow-500 text-yellow-500" : "text-[#6B7280]")} />
              </button>
              <button
                onClick={() => toast({ title: "Price Alerts", description: "Coming soon!" })}
                className="p-1.5 active:bg-white/10 rounded"
              >
                <Bell className="h-3.5 w-3.5 text-[#6B7280]" />
              </button>
              <AdminMarketMakerControls isAdmin={isAdmin} />
            </div>
          </div>

          {/* Mini stats row */}
          <div className="flex items-center gap-3 px-2 pb-1 text-[9px] border-b border-[#1F2937]/40">
            <div className="flex items-center gap-0.5">
              <span className="text-[#4B5563]">H</span>
              <span className="font-mono text-[#16C784]">{formatPrice(pair.high24h || 0)}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[#4B5563]">L</span>
              <span className="font-mono text-[#EA3943]">{formatPrice(pair.low24h || 0)}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[#4B5563]">Vol</span>
              <span className="font-mono text-[#9CA3AF]">{formatVolume(pair.volume24h || 0)}</span>
            </div>
          </div>
        </div>

        {/* ── Mobile Mode Switcher ── */}
        <div className="flex-shrink-0 flex border-b border-[#1F2937]/60 bg-[#0B1220]">
          {(['trade', 'book', 'orders'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMobileMode(mode)}
              className={cn(
                "flex-1 py-2 text-[11px] font-semibold tracking-wide uppercase transition-colors duration-150",
                mobileMode === mode
                  ? "text-[#E5E7EB] border-b-2 border-[#F0B90B]"
                  : "text-[#4B5563] border-b-2 border-transparent"
              )}
            >
              {mode === 'trade' ? 'Trade' : mode === 'book' ? 'Order Book' : 'Orders'}
            </button>
          ))}
        </div>

        {/* ── Mode Content ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">

          {/* ══ MODE: TRADE ══ */}
          {mobileMode === 'trade' && (
            <div className="px-3 py-2">
              {/* Chart Toggle */}
              <div className="mb-2">
                <button
                  onClick={() => setChartOpen(!chartOpen)}
                  className="flex items-center gap-0.5 text-[10px] text-[#4B5563] active:text-[#9CA3AF] py-1"
                >
                  <span>Chart</span>
                  <ChevronDown className={cn("h-2.5 w-2.5 transition-transform duration-200", chartOpen && "rotate-180")} />
                </button>
                {chartOpen && (
                  <div className="pb-2 animate-fade-in">
                    <TradeCandlestickChart symbol={pair.symbol} quoteCurrency={pair.quoteAsset} />
                  </div>
                )}
              </div>

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
                bestBid={bestBidPrice}
                bestAsk={bestAskPrice}
                selectedPrice={selectedPrice}
              />
            </div>
          )}

          {/* ══ MODE: ORDER BOOK ══ */}
          {mobileMode === 'book' && (
            <div>
              <OrderBookPremium
                asks={orderBook?.asks?.slice(0, 16).map((a: any) => ({ 
                  price: typeof a === 'object' ? a.price : a[0], 
                  quantity: typeof a === 'object' ? a.quantity : a[1] 
                })) || []}
                bids={orderBook?.bids?.slice(0, 16).map((b: any) => ({ 
                  price: typeof b === 'object' ? b.price : b[0], 
                  quantity: typeof b === 'object' ? b.quantity : b[1] 
                })) || []}
                currentPrice={pair.price}
                priceChange={pair.change24h}
                quoteCurrency={pair.quoteAsset}
                baseCurrency={pair.baseAsset}
                onPriceClick={(price) => { handlePriceClick(price); setMobileMode('trade'); }}
                marketPrice={marketPrice}
                maxRows={14}
                isLoading={!pair}
              />

              {/* Recent Trades below order book */}
              <div className="border-t border-[#1F2937]/40">
                <RecentTradesTicker
                  trades={recentTrades}
                  quoteCurrency={pair.quoteAsset}
                  onPriceClick={(price) => { handlePriceClick(price); setMobileMode('trade'); }}
                  isLoading={recentTradesLoading}
                />
              </div>
            </div>
          )}

          {/* ══ MODE: ORDERS / POSITIONS ══ */}
          {mobileMode === 'orders' && (
            <div>
              {/* Position summary */}
              <div className="px-3 py-2 border-b border-[#1F2937]/40">
                <PositionSummary
                  baseCurrency={pair.baseAsset}
                  quoteCurrency={pair.quoteAsset}
                  baseAvailable={baseBalance.available}
                  baseTotal={baseBalance.total}
                  baseLocked={baseBalance.locked}
                  quoteAvailable={quoteBalance.available}
                  quoteTotal={quoteBalance.total}
                  quoteLocked={quoteBalance.locked}
                  currentPrice={pair.price}
                />
              </div>

              <GhostLockWarning />

              <div className="px-2 pt-1 pb-6">
                <TradingHistoryTabs 
                  symbol={urlSymbol}
                  onOrderDetails={setSelectedOrderId}
                  onTradeDetails={(tradeId) => console.log('Trade details:', tradeId)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
       
      <OrderDetailsDrawer 
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </ComplianceGate>
  );
}
