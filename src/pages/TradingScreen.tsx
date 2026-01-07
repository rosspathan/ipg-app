import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, TrendingUp, TrendingDown, Activity, Clock, Zap } from "lucide-react";
import { useTradingAPI } from "@/hooks/useTradingAPI";
import { useToast } from "@/hooks/use-toast";
import { useMarketStore, useMarketTicker, useMarketOrderBook, useMarketTrades, useMarketConnection } from "@/hooks/useMarketStore";
import { useBep20Balances } from "@/hooks/useBep20Balances";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useInternalMarketPrice, isInternalPair } from "@/hooks/useInternalMarketPrice";

// Enhanced trading components
import { ChartPanel } from "@/components/trading/ChartPanel";
import { CandleToggle, Timeframe } from "@/components/trading/CandleToggle";
import EnhancedOrderBook from "@/components/trading/EnhancedOrderBook";
import TradingOrderForm from "@/components/trading/TradingOrderForm";
import RecentTrades from "@/components/RecentTrades";
import MarketDiagnostics from "@/components/trading/MarketDiagnostics";

const TradingScreen = () => {
  const navigate = useNavigate();
  const { pair } = useParams<{ pair: string }>();
  const { toast } = useToast();
  
  // State management
  const [selectedPair, setSelectedPair] = useState(pair?.replace('-', '/') || 'BTC/USDT');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [candlesEnabled, setCandlesEnabled] = useState(false); // CRITICAL: Chart disabled by default
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");

  // Market data store
  const { subscribe, unsubscribe, disconnect } = useMarketStore();
  const { isConnected, error: connectionError } = useMarketConnection();
  
  // Real-time market data for current pair (Binance WebSocket)
  const ticker = useMarketTicker(selectedPair);
  const orderBook = useMarketOrderBook(selectedPair);
  const trades = useMarketTrades(selectedPair);

  // Internal market price from database (for non-Binance pairs like IPG/USDT)
  const isInternal = isInternalPair(selectedPair);
  const internalPrice = useInternalMarketPrice(isInternal ? selectedPair : undefined);

  // User data hooks
  const { balances: userBalances, isLoading: balancesLoading } = useBep20Balances();
  const { orders: userOrders, cancelOrder: cancelUserOrder, isLoading: ordersLoading } = useUserOrders(selectedPair);

  // Trading API
  const { placeOrder, cancelOrder, getOrderHistory, loading } = useTradingAPI();

  // Subscribe to market data when component mounts or symbol changes
  useEffect(() => {
    console.log(`Subscribing to market data for ${selectedPair}`);
    subscribe(selectedPair);
    
    return () => {
      console.log(`Unsubscribing from market data for ${selectedPair}`);
      unsubscribe(selectedPair);
    };
  }, [selectedPair, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Trading pairs with mock data for now
  const tradingPairs = [
    { symbol: 'BTC/USDT', price: 43250.50, change: 2.45 },
    { symbol: 'ETH/USDT', price: 2650.25, change: -1.23 },
    { symbol: 'BNB/USDT', price: 315.80, change: 0.95 },
    { symbol: 'ADA/USDT', price: 0.485, change: 3.21 }
  ];

  // Get current pair data with real-time updates
  const currentPairData = tradingPairs.find(p => p.symbol === selectedPair) || tradingPairs[0];
  
  // Price blinking state for visual feedback
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceBlinkClass, setPriceBlinkClass] = useState('');

  // Use internal database price for internal pairs, Binance WebSocket for listed pairs
  const currentPrice = isInternal 
    ? (internalPrice?.currentPrice || 0)
    : (ticker?.lastPrice || currentPairData.price);
  const changePercent = isInternal 
    ? (internalPrice?.priceChange24h || 0)
    : (ticker?.priceChangePercent24h || currentPairData.change);
  const volume24h = isInternal ? internalPrice?.volume24h : ticker?.volume24h;
  const high24h = isInternal ? internalPrice?.high24h : ticker?.high24h;
  const low24h = isInternal ? internalPrice?.low24h : ticker?.low24h;
  
  // Add blinking effect when price changes
  useEffect(() => {
    if (previousPrice !== null && currentPrice !== previousPrice) {
      const isIncrease = currentPrice > previousPrice;
      setPriceBlinkClass(isIncrease ? 'animate-pulse bg-green-500/20' : 'animate-pulse bg-red-500/20');
      
      const timer = setTimeout(() => {
        setPriceBlinkClass('');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    setPreviousPrice(currentPrice);
  }, [currentPrice, previousPrice]);
  
  // Format order book data for the component
  const currentOrderBook = orderBook ? {
    bids: orderBook.bids.map(bid => [bid.price, bid.quantity] as [number, number]),
    asks: orderBook.asks.map(ask => [ask.price, ask.quantity] as [number, number])
  } : { bids: [], asks: [] };
  
  // Format trades for the component
  const currentTrades = trades.map(trade => ({
    id: trade.id,
    price: trade.price,
    quantity: trade.quantity,
    side: trade.side,
    timestamp: new Date(trade.timestamp).toISOString(),
    time: new Date(trade.timestamp).toISOString()
  }));

  // Get real user balances from hook
  const [baseAsset, quoteAsset] = selectedPair.split('/');
  const quoteBalance = userBalances?.find(b => b.symbol === quoteAsset);
  const baseBalance = userBalances?.find(b => b.symbol === baseAsset);
  
  const availableBalance = {
    buy: quoteBalance?.appBalance || quoteBalance?.onchainBalance || 0, // Quote currency for buying
    sell: baseBalance?.appBalance || baseBalance?.onchainBalance || 0   // Base currency for selling
  };

  // Get real open orders from hook
  const openOrders = userOrders?.filter(o => o.status === 'pending' || o.status === 'partially_filled') || [];

  // Handle order placement
  const handlePlaceOrder = async (orderData: {
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    amount: number;
    price?: number;
  }) => {
    try {
      const result = await placeOrder({
        symbol: selectedPair,
        side: orderData.side,
        type: orderData.type,
        quantity: orderData.amount,
        price: orderData.price,
        time_in_force: 'GTC'
      });

      if (result.success) {
        toast({
          title: "Order Placed Successfully",
          description: `${orderData.side.toUpperCase()} order for ${orderData.amount} ${selectedPair.split('/')[0]}`,
        });
      }
    } catch (error) {
      console.error('Order placement failed:', error);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    const result = await cancelOrder(orderId);
    if (result.success) {
      toast({
        title: "Order Cancelled",
        description: "Order cancelled successfully",
      });
    }
  };

  // Handle price click from order book
  const handleOrderBookPriceClick = (price: number, side: 'buy' | 'sell') => {
    setOrderType('limit');
    setOrderSide(side);
    // Would set price in the order form
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-muted/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Spot Trading</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Live Feed Active' : connectionError ? 'Connection Error' : 'Connecting...'}
                </span>
                {connectionError && (
                  <span className="text-xs text-red-500 max-w-48 truncate" title={connectionError}>
                    {connectionError}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {isConnected ? (
              <>
                <Zap className="w-3 h-3 mr-1 text-green-500" />
                LIVE
              </>
            ) : (
              <>
                <Activity className="w-3 h-3 mr-1" />
                SYNC
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Market Selector */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-background to-muted/20">
        <Select value={selectedPair} onValueChange={setSelectedPair}>
          <SelectTrigger className="w-full bg-card border-border hover:bg-muted/50 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {tradingPairs.map((pairData) => {
              const liveTicker = useMarketStore.getState().tickers[pairData.symbol];
              const price = liveTicker?.lastPrice ?? pairData.price;
              const change = liveTicker?.priceChangePercent24h ?? pairData.change;
              return (
                <SelectItem key={pairData.symbol} value={pairData.symbol} className="hover:bg-muted/50">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{pairData.symbol}</span>
                    <div className="text-right ml-4">
                      <div className="text-sm font-semibold">
                        ${price.toLocaleString()}
                      </div>
                      <div className={`text-xs flex items-center gap-1 ${
                        (change ?? 0) > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {(change ?? 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {(change ?? 0) > 0 ? '+' : ''}{(change ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        
        {/* Enhanced Price Display */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent rounded-lg px-2 py-1 transition-all duration-300 ${priceBlinkClass}`}>
              ${currentPrice.toLocaleString()}
            </span>
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${
              changePercent > 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
            }`}>
              {changePercent > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-medium">{changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%</span>
            </div>
          </div>
          
          {/* 24h Stats */}
          <div className="text-right space-y-1">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">24h High</span>
                <div className="font-medium text-green-500">
                  ${high24h?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '44,200'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">24h Low</span>
                <div className="font-medium text-red-500">
                  ${low24h?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '42,100'}
                </div>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">24h Volume</span>
              <div className="font-medium">
                {volume24h?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '12,345,678'} {selectedPair.split('/')[0]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Candle Toggle - Chart controls */}
      <CandleToggle
        enabled={candlesEnabled}
        onToggle={setCandlesEnabled}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />

      {/* Chart Panel - ONLY renders when candlesEnabled is true */}
      <div className="px-4">
        <ChartPanel
          symbol={selectedPair}
          timeframe={timeframe}
          enabled={candlesEnabled}
        />
      </div>

      {/* Order Book & Recent Trades */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EnhancedOrderBook
            orderBook={currentOrderBook}
            currentPrice={currentPrice}
            changePercent={changePercent}
            onPriceClick={handleOrderBookPriceClick}
          />
          
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Trades
                <Badge variant="secondary" className="text-xs ml-auto">
                  {currentTrades.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RecentTrades trades={currentTrades.slice(0, 15)} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trading Order Form */}
      <div className="p-4">
        <TradingOrderForm
          selectedPair={selectedPair}
          orderSide={orderSide}
          onOrderSideChange={setOrderSide}
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          currentPrice={currentPrice}
          availableBalance={availableBalance}
          onPlaceOrder={handlePlaceOrder}
          isLoading={loading}
        />
      </div>

      {/* Open Orders & Trade History */}
      <div className="p-4 pb-20">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Orders & History
              <Badge variant="outline" className="text-xs">
                {openOrders.length} active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="open" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="open" className="text-xs">
                  Open Orders ({openOrders.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  Trade History
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="open" className="space-y-3 mt-4">
                {openOrders.length > 0 ? (
                  <div className="space-y-3">
                    {openOrders.map((order) => (
                      <div key={order.id} className="p-3 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={order.side === 'buy' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {order.side.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">{order.symbol}</span>
                            <Badge variant="outline" className="text-xs">
                              {order.order_type}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-xs hover:bg-red-500 hover:text-white transition-colors"
                            onClick={() => cancelUserOrder(order.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <div className="font-medium">{order.amount}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <div className="font-medium">${order.price || 'Market'}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <div className="font-medium capitalize">{order.status}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No open orders</p>
                    <p className="text-xs mt-1">Place your first order above</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No trade history</p>
                  <p className="text-xs mt-1">Your completed trades will appear here</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Market Diagnostics (Dev only) */}
      <MarketDiagnostics />
    </div>
  );
};

export default TradingScreen;