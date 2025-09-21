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

// Enhanced trading components
import PriceChart from "@/components/trading/PriceChart";
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

  // Market data store
  const { subscribe, unsubscribe, disconnect } = useMarketStore();
  const { isConnected, error: connectionError } = useMarketConnection();
  
  // Real-time market data for current pair
  const ticker = useMarketTicker(selectedPair);
  const orderBook = useMarketOrderBook(selectedPair);
  const trades = useMarketTrades(selectedPair);

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
  
  // Use real-time data from Binance WebSocket, fallback to mock data
  const currentPrice = ticker?.lastPrice || currentPairData.price;
  const changePercent = ticker?.priceChangePercent24h || currentPairData.change;
  const volume24h = ticker?.volume24h;
  const high24h = ticker?.high24h;
  const low24h = ticker?.low24h;
  
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

  // Mock user balances - in real app, this would come from user's wallet
  const availableBalance = {
    buy: 1000.00, // USDT balance for buying
    sell: 0.1000  // BTC balance for selling
  };

  // Mock open orders for demo
  const mockOpenOrders = [
    { 
      id: '1', 
      pair: 'BTC/USDT', 
      side: 'buy' as const, 
      type: 'limit', 
      amount: '0.025', 
      price: '43000.00', 
      status: 'open',
      created_at: '2024-01-15T10:30:00Z'
    },
    { 
      id: '2', 
      pair: 'ETH/USDT', 
      side: 'sell' as const, 
      type: 'limit', 
      amount: '0.5', 
      price: '2650.00', 
      status: 'open',
      created_at: '2024-01-15T09:15:00Z'
    },
  ];

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
            {tradingPairs.map((pairData) => (
              <SelectItem key={pairData.symbol} value={pairData.symbol} className="hover:bg-muted/50">
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{pairData.symbol}</span>
                  <div className="text-right ml-4">
                    <div className="text-sm font-semibold">
                      ${pairData.price.toLocaleString()}
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${
                      pairData.change > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {pairData.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {pairData.change > 0 ? '+' : ''}{pairData.change}%
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Enhanced Price Display */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
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

      {/* Price Chart */}
      <div className="p-4">
        <PriceChart symbol={selectedPair} height={280} />
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
                {mockOpenOrders.length} active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="open" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="open" className="text-xs">
                  Open Orders ({mockOpenOrders.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  Trade History
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="open" className="space-y-3 mt-4">
                {mockOpenOrders.length > 0 ? (
                  <div className="space-y-3">
                    {mockOpenOrders.map((order) => (
                      <div key={order.id} className="p-3 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={order.side === 'buy' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {order.side.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">{order.pair}</span>
                            <Badge variant="outline" className="text-xs">
                              {order.type}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-xs hover:bg-red-500 hover:text-white transition-colors"
                            onClick={() => handleCancelOrder(order.id)}
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
                            <div className="font-medium">${order.price}</div>
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