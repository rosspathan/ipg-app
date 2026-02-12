import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, Loader2, WifiOff } from "lucide-react";
import { OrderFormPro } from "@/components/trading/OrderFormPro";
import { OrderBookPremium } from "@/components/trading/OrderBookPremium";
import { TradeCandlestickChart } from "@/components/trading/TradeCandlestickChart";
import { PositionSummary } from "@/components/trading/PositionSummary";
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
      <div className="flex items-center justify-center h-screen bg-[#0B0F1C]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
  const pair = pairs?.find((p) => p.symbol === symbol);

  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const { orders, cancelOrder, refetch: refetchOrders } = useUserOrders(symbol);
  const { orders: allOpenOrders, cancelOrder: cancelAnyOrder, isLoading: allOrdersLoading } = useAllOpenOrders();
  const { data: internalOrderBookData, refetch: refetchOrderBook } = useRealtimeOrderBook(symbol);
  useRealtimeTradingBalances();

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
      <div className="flex items-center justify-center h-screen bg-[#0B0F1C]">
        <div className="text-muted-foreground">Loading...</div>
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

  const openOrders = allOpenOrders || [];

  const formatPrice = (p: number) => p >= 1 ? p.toFixed(2) : p.toFixed(6);
  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  const isPositive = pair.change24h >= 0;

  return (
    <ComplianceGate
      requireAgeVerification
      requireTermsAcceptance
      requireRiskDisclosure
    >
      <div className="flex flex-col min-h-screen bg-[#0B0F1C]">
        {/* ── Section 1: Pair & Price Bar ── */}
        <div className="sticky top-0 z-20 bg-[#0B0F1C]/95 backdrop-blur-md border-b border-[#1F2937]/40">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left: Back + Pair Picker + Live dot */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate("/app/trade")} 
                className="p-1.5 rounded-lg hover:bg-white/5"
              >
                <ArrowLeft className="h-5 w-5 text-[#94A3B8]" />
              </button>
              
              <DropdownMenu open={pairPickerOpen} onOpenChange={setPairPickerOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-white/5 rounded-lg px-3 py-1.5">
                    <span className="text-white font-semibold text-lg tracking-tight">{pair.symbol}</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-[#64748B]",
                      pairPickerOpen && "rotate-180"
                    )} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 bg-[#121826]/95 backdrop-blur-xl border-[#1F2937] p-2 shadow-2xl rounded-[14px]">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                    <Input
                      placeholder="Search pairs..."
                      value={pairSearch}
                      onChange={(e) => setPairSearch(e.target.value)}
                      className="pl-9 h-10 bg-[#0B0F1C]/60 border-[#1F2937] text-white rounded-xl"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    {sortedPairs.map((p) => (
                      <DropdownMenuItem
                        key={p.symbol}
                        onClick={() => handlePairSelect(p.symbol)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer",
                          p.symbol === pair.symbol && "bg-white/5 border border-[#1F2937]"
                        )}
                      >
                        <span className="font-semibold text-white">{p.symbol}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-[#94A3B8] font-mono">
                            ${p.price >= 1 ? p.price.toFixed(2) : p.price.toFixed(6)}
                          </span>
                          <span className={cn(
                            "font-medium px-1.5 py-0.5 rounded-md",
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
                      <div className="text-center py-6 text-[#64748B] text-sm">No pairs found</div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Live dot */}
              {wsConnected && (
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              )}
            </div>

            {/* Center: Price */}
            <div className="flex flex-col items-center">
              <span className={cn(
                "text-xl sm:text-2xl font-semibold font-mono tracking-tight",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}>
                {formatPrice(pair.price)}
              </span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full mt-0.5",
                isPositive 
                  ? "text-emerald-400 bg-emerald-500/10" 
                  : "text-red-400 bg-red-500/10"
              )}>
                {isPositive ? "+" : ""}{pair.change24h.toFixed(2)}%
              </span>
            </div>

            {/* Right: 24h stats + admin */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4 text-xs">
                {pair.high24h !== undefined && (
                  <div className="text-right">
                    <div className="text-[#64748B] text-[10px]">24h High</div>
                    <div className="font-mono text-emerald-400">{formatPrice(pair.high24h)}</div>
                  </div>
                )}
                {pair.low24h !== undefined && (
                  <div className="text-right">
                    <div className="text-[#64748B] text-[10px]">24h Low</div>
                    <div className="font-mono text-red-400">{formatPrice(pair.low24h)}</div>
                  </div>
                )}
                {pair.volume24h !== undefined && (
                  <div className="text-right">
                    <div className="text-[#64748B] text-[10px]">24h Vol</div>
                    <div className="font-mono text-white">{formatVolume(pair.volume24h)}</div>
                  </div>
                )}
              </div>
              <AdminMarketMakerControls isAdmin={isAdmin} />
            </div>
          </div>

          {/* Mobile 24h stats row */}
          <div className="flex sm:hidden items-center justify-between px-4 pb-2 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-[#64748B]">H</span>
              <span className="font-mono text-emerald-400">{formatPrice(pair.high24h || 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#64748B]">L</span>
              <span className="font-mono text-red-400">{formatPrice(pair.low24h || 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#64748B]">Vol</span>
              <span className="font-mono text-white">{formatVolume(pair.volume24h || 0)}</span>
            </div>
          </div>
        </div>

        {/* ── Section 2: Chart ── */}
        <div className="px-4 pt-3">
          <TradeCandlestickChart symbol={pair.symbol} quoteCurrency={pair.quoteAsset} />
        </div>

        {/* ── Section 3: Trading Grid ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* LEFT: Order Form */}
            <div className="bg-gradient-to-b from-[#121826] to-[#0F1629] border border-[#1F2937]/50 rounded-[14px] p-4">
              {(() => {
                const bestBidEntry = orderBook?.bids?.[0];
                const bestAskEntry = orderBook?.asks?.[0];
                const bestBidPrice = bestBidEntry 
                  ? (typeof bestBidEntry === 'object' && 'price' in bestBidEntry ? bestBidEntry.price : Array.isArray(bestBidEntry) ? bestBidEntry[0] : 0)
                  : 0;
                const bestAskPrice = bestAskEntry 
                  ? (typeof bestAskEntry === 'object' && 'price' in bestAskEntry ? bestAskEntry.price : Array.isArray(bestAskEntry) ? bestAskEntry[0] : 0)
                  : 0;
                
                return (
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
                  />
                );
              })()}
            </div>

            {/* RIGHT: Order Book */}
            <div className="h-[420px] sm:h-[480px] lg:h-[520px]">
              <OrderBookPremium
                asks={orderBook?.asks?.slice(0, 10).map((a: any) => ({ 
                  price: typeof a === 'object' ? a.price : a[0], 
                  quantity: typeof a === 'object' ? a.quantity : a[1] 
                })) || []}
                bids={orderBook?.bids?.slice(0, 10).map((b: any) => ({ 
                  price: typeof b === 'object' ? b.price : b[0], 
                  quantity: typeof b === 'object' ? b.quantity : b[1] 
                })) || []}
                currentPrice={pair.price}
                priceChange={pair.change24h}
                quoteCurrency={pair.quoteAsset}
                baseCurrency={pair.baseAsset}
                onPriceClick={handlePriceClick}
                marketPrice={marketPrice}
                isLoading={!pair}
              />
            </div>
          </div>

          {/* Position Summary */}
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

          <GhostLockWarning />
          
          {/* Trading History */}
          <TradingHistoryTabs 
            symbol={urlSymbol}
            onOrderDetails={setSelectedOrderId}
            onTradeDetails={(tradeId) => console.log('Trade details:', tradeId)}
          />
        </div>
      </div>
       
      <OrderDetailsDrawer 
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </ComplianceGate>
  );
}
