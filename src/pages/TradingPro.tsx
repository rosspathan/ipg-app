import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Settings, ChevronDown, BarChart3, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TradingTabs } from '@/components/trading/TradingTabs';
import { OrderFormPro } from '@/components/trading/OrderFormPro';
import { OrderBookCompact } from '@/components/trading/OrderBookCompact';
import { OpenOrderCard } from '@/components/trading/OpenOrderCard';
import { useTradingPairs } from '@/hooks/useTradingPairs';
import { useUserBalance } from '@/hooks/useUserBalance';
import { useUserOrders } from '@/hooks/useUserOrders';
import { useMarketStore, useMarketOrderBook, useMarketTicker } from '@/hooks/useMarketStore';
import { useAutoSyncDeposits } from '@/hooks/useAutoSyncDeposits';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TradingPro: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Spot');
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');
  
  // Auto-sync deposits on page load
  useAutoSyncDeposits();
  
  const { data: tradingPairs, isLoading: pairsLoading } = useTradingPairs();
  const { data: balances } = useUserBalance(undefined, true);
  const { orders, placeOrder, cancelOrder, isPlacingOrder } = useUserOrders(selectedPair);

  const [base, quote] = selectedPair.split('/');
  const binanceSymbol = `${base}${quote}`.toLowerCase();

  // Subscribe to market data
  const subscribe = useMarketStore((s) => s.subscribe);
  const unsubscribe = useMarketStore((s) => s.unsubscribe);

  useEffect(() => {
    subscribe(binanceSymbol);
    return () => unsubscribe(binanceSymbol);
  }, [binanceSymbol, subscribe, unsubscribe]);

  const orderBook = useMarketOrderBook(binanceSymbol);
  const ticker = useMarketTicker(binanceSymbol);

  const currentPrice = ticker?.lastPrice || 0;
  const priceChange = ticker?.priceChangePercent24h || 0;

  // Get user balances
  const baseBalance = useMemo(() => {
    const found = balances?.find((b: any) => b.symbol === base);
    return found?.available || 0;
  }, [balances, base]);

  const quoteBalance = useMemo(() => {
    const found = balances?.find((b: any) => b.symbol === quote);
    return found?.available || 0;
  }, [balances, quote]);

  // Format order book data - OrderBookLevel has price and quantity properties
  const formattedAsks = useMemo(() => {
    return (orderBook?.asks || []).map((level) => ({
      price: level.price,
      quantity: level.quantity,
    }));
  }, [orderBook]);

  const formattedBids = useMemo(() => {
    return (orderBook?.bids || []).map((level) => ({
      price: level.price,
      quantity: level.quantity,
    }));
  }, [orderBook]);

  // Open orders
  const openOrders = useMemo(() => {
    return orders.filter((o: any) => o.status === 'pending' || o.status === 'partially_filled');
  }, [orders]);

  const handlePlaceOrder = async (params: {
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    price?: number;
    quantity: number;
  }) => {
    await placeOrder({
      symbol: selectedPair,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      price: params.price,
    });
  };

  const [priceFromOrderBook, setPriceFromOrderBook] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col">
      {/* Subtle radial pattern background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(100, 50, 150, 0.15) 0%, transparent 50%)`,
        }}
      />
      
      {/* Top Navigation */}
      <header className="relative flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground">
          <Menu className="h-5 w-5" />
        </button>
        <TradingTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <button className="p-2 text-muted-foreground">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Pair Selector */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-lg font-bold text-foreground">
                {selectedPair}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
              {tradingPairs?.map((pair: any) => (
                <DropdownMenuItem
                  key={pair.symbol}
                  onClick={() => setSelectedPair(pair.symbol)}
                >
                  {pair.symbol}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Price change below pair name */}
          <span className={cn(
            "text-sm font-medium",
            priceChange >= 0 ? "text-emerald-400" : "text-destructive"
          )}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground">
            <BarChart3 className="h-5 w-5" />
          </button>
          <button className="p-2 text-muted-foreground">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="relative flex-1 flex flex-col lg:flex-row gap-2 p-3 overflow-hidden">
        {/* Left Column - Order Form */}
        <div className="lg:w-[50%] flex-shrink-0">
          <OrderFormPro
            baseCurrency={base}
            quoteCurrency={quote}
            availableBase={baseBalance}
            availableQuote={quoteBalance}
            currentPrice={currentPrice}
            onPlaceOrder={handlePlaceOrder}
            isPlacingOrder={isPlacingOrder}
          />
        </div>

        {/* Right Column - Order Book */}
        <div className="lg:w-[50%] flex-1 min-h-[400px]">
          <OrderBookCompact
            asks={formattedAsks}
            bids={formattedBids}
            currentPrice={currentPrice}
            priceChange={priceChange}
            quoteCurrency={quote}
            onPriceClick={setPriceFromOrderBook}
          />
        </div>
      </div>

      {/* Bottom Section - Open Orders */}
      <div className="border-t border-border">
        <Tabs defaultValue="orders" className="w-full">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <TabsList className="bg-transparent">
              <TabsTrigger value="orders" className="data-[state=active]:bg-muted">
                Open Orders ({openOrders.length})
              </TabsTrigger>
              <TabsTrigger value="funds" className="data-[state=active]:bg-muted">
                Funds
              </TabsTrigger>
            </TabsList>
            <button 
              onClick={() => navigate('/app/orders')}
              className="text-xs text-primary hover:text-primary/80"
            >
              View All
            </button>
          </div>

          <TabsContent value="orders" className="mt-0">
            <ScrollArea className="h-[200px]">
              <div className="p-4 space-y-3">
                {openOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No open orders
                  </div>
                ) : (
                  openOrders.map((order: any, idx: number) => (
                    <OpenOrderCard
                      key={order.id}
                      order={order}
                      index={idx}
                      onCancel={cancelOrder}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="funds" className="mt-0">
            <ScrollArea className="h-[200px]">
              <div className="p-4 space-y-2">
                {balances?.slice(0, 10).map((balance: any) => (
                  <div 
                    key={balance.symbol}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="font-medium text-foreground">{balance.symbol}</span>
                    <span className="font-mono text-muted-foreground">
                      {balance.available.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TradingPro;
