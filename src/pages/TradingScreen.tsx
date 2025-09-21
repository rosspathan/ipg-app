import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TradingViewWidget from "@/components/TradingViewWidget";
import OrderHistory from "@/components/OrderHistory";
import RecentTrades from "@/components/RecentTrades";
import TradingOrderForm from "@/components/TradingOrderForm";
import TradingOrderBook from "@/components/TradingOrderBook";
import MarketSelector from "@/components/MarketSelector";
import { useCatalog } from "@/hooks/useCatalog";
import { useTradingSimple } from "@/hooks/useTradingSimple";
import { useTradingWebSocket } from "@/hooks/useTradingWebSocket";
import { useTradingAPI } from "@/hooks/useTradingAPI";
import { useAuthUser } from "@/hooks/useAuthUser";

const TradingScreen = () => {
  const navigate = useNavigate();
  const { pair } = useParams<{ pair: string }>();
  const { toast } = useToast();
  const marketPair = pair?.replace('-', '/') || 'BTC/USDT';
  
  // Trading state
  const [tradingType, setTradingType] = useState<'spot' | 'futures'>('spot');
  const [selectedPair, setSelectedPair] = useState(marketPair);
  const [activeTab, setActiveTab] = useState('trade');

  const { pairsList, pairsBySymbol, status } = useCatalog();
  const { user } = useAuthUser();
  const {
    orderBook: liveOrderBook,
    recentTrades: liveTrades,
    ticker: liveTicker,
    balances,
    hasBalance,
    placeOrder: submitOrder,
    getOrderFeePreview,
    loading: tradingLoading
  } = useTradingSimple(selectedPair);
  
  // Real-time WebSocket connection
  const {
    isConnected,
    orderBook: wsOrderBook,
    trades: wsTrades,
    ticker: wsTicker,
    userUpdates,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    subscribeToUserUpdates
  } = useTradingWebSocket();

  // Trading API functions
  const {
    loading: apiLoading,
    placeOrder,
    cancelOrder,
    getOrderHistory
  } = useTradingAPI();
  
  const activePair = pairsBySymbol[selectedPair] || pairsList[0];
  const tradingViewSymbol = activePair?.tradingview_symbol || 'BINANCE:BTCUSDT';
  const futuresSymbol = tradingViewSymbol.replace('USDT', 'USDTPERP');

  // Use WebSocket data if available, fallback to simple trading data
  const currentOrderBook = wsOrderBook[selectedPair] || liveOrderBook || { bids: [], asks: [] };
  const currentTrades = wsTrades[selectedPair] || liveTrades || [];
  const currentTicker = wsTicker[selectedPair] || liveTicker;

  // WebSocket subscriptions effect
  useEffect(() => {
    if (selectedPair && isConnected) {
      // Subscribe to real-time data for the current pair
      subscribeToSymbol(selectedPair);
      
      // Subscribe to user updates if authenticated
      if (user?.id) {
        subscribeToUserUpdates(user.id);
      }
    }

    return () => {
      if (selectedPair) {
        unsubscribeFromSymbol(selectedPair);
      }
    };
  }, [selectedPair, isConnected, user?.id, subscribeToSymbol, unsubscribeFromSymbol, subscribeToUserUpdates]);

  const [market, setMarket] = useState({
    price: 0,
    changePercent: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
  });

  useEffect(() => {
    const wsSymbol = selectedPair.replace('/', '').toLowerCase();
    const url = tradingType === 'futures'
      ? `wss://fstream.binance.com/ws/${wsSymbol}@ticker`
      : `wss://stream.binance.com:9443/ws/${wsSymbol}@ticker`;

    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const d = JSON.parse(event.data);
        setMarket({
          price: parseFloat(d.c), // last price
          changePercent: parseFloat(d.P), // change percent
          high24h: parseFloat(d.h),
          low24h: parseFloat(d.l),
          volume24h: parseFloat(d.v ?? d.V ?? 0),
        });
      } catch (err) {
        console.error('Ticker parse error', err);
      }
    };

    return () => ws.close();
  }, [selectedPair, tradingType]);

  const [feePreview, setFeePreview] = useState<{ maker_fee: number; taker_fee: number; fee_asset: string }>({ 
    maker_fee: 0, 
    taker_fee: 0, 
    fee_asset: 'USDT' 
  });

  // Update fee preview when order parameters change
  useEffect(() => {
    const updateFeePreview = async () => {
      if (liveTicker?.last_price) {
        const preview = await getOrderFeePreview(selectedPair, 1, liveTicker.last_price, 'buy');
        setFeePreview(preview);
      }
    };

    updateFeePreview();
  }, [selectedPair, liveTicker?.last_price, getOrderFeePreview]);

  const handlePlaceOrder = async (orderData: any) => {
    const result = await placeOrder(orderData);
    return result;
  };

  // Transform recent trades data
  const recentTrades = currentTrades.map((trade: any, index: number) => ({
    id: trade.id || `trade-${index}`,
    price: trade.price || 0,
    quantity: trade.quantity || trade.amount || 0,
    side: trade.side || (Math.random() > 0.5 ? 'buy' : 'sell'),
    timestamp: trade.timestamp || new Date().toISOString()
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">{selectedPair}</h1>
        </div>

        <Tabs value={tradingType} onValueChange={(v) => setTradingType(v as 'spot' | 'futures')}>
          <TabsList className="h-8">
            <TabsTrigger value="spot" className="text-xs">Spot</TabsTrigger>
            <TabsTrigger value="futures" className="text-xs">Futures</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mobile-First Layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Main Content - Mobile First */}
        <div className="flex-1 order-2 lg:order-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border px-4">
              <TabsList className="grid w-full grid-cols-4 h-10">
                <TabsTrigger value="trade" className="text-xs">Trade</TabsTrigger>
                <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
                <TabsTrigger value="book" className="text-xs">Book</TabsTrigger>
                <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="trade" className="p-4 space-y-4">
              <MarketSelector
                selectedPair={selectedPair}
                pairsList={pairsList}
                onPairChange={setSelectedPair}
                currentPrice={liveTicker?.last_price || market.price}
                changePercent={liveTicker?.change_24h || market.changePercent}
                high24h={market.high24h}
                low24h={market.low24h}
                volume24h={market.volume24h}
              />
              
              <TradingOrderForm
                selectedPair={selectedPair}
                tradingType={tradingType}
                livePrice={liveTicker?.last_price || market.price}
                balances={balances}
                feePreview={feePreview}
                onPlaceOrder={handlePlaceOrder}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TradingOrderBook
                  orderBook={currentOrderBook}
                  currentPrice={liveTicker?.last_price || market.price}
                  changePercent={liveTicker?.change_24h || market.changePercent}
                />
                <RecentTrades trades={recentTrades} />
              </div>
            </TabsContent>

            <TabsContent value="chart" className="p-0">
              <div className="h-[60vh] lg:h-[70vh]">
                <TradingViewWidget 
                  symbol={tradingType === 'spot' ? tradingViewSymbol : futuresSymbol}
                  widgetType="advanced-chart"
                  height="100%"
                  colorTheme="dark"
                />
              </div>
            </TabsContent>

            <TabsContent value="book" className="p-4">
              <div className="space-y-4">
                <MarketSelector
                  selectedPair={selectedPair}
                  pairsList={pairsList}
                  onPairChange={setSelectedPair}
                  currentPrice={liveTicker?.last_price || market.price}
                  changePercent={liveTicker?.change_24h || market.changePercent}
                  high24h={market.high24h}
                  low24h={market.low24h}
                  volume24h={market.volume24h}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <TradingOrderBook
                    orderBook={currentOrderBook}
                    currentPrice={liveTicker?.last_price || market.price}
                    changePercent={liveTicker?.change_24h || market.changePercent}
                  />
                  <RecentTrades trades={recentTrades} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="p-4">
              <OrderHistory />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop Sidebar - Hidden on Mobile */}
        <div className="hidden lg:block w-80 order-1 lg:order-2 border-l border-border p-4 space-y-4">
          <TradingOrderForm
            selectedPair={selectedPair}
            tradingType={tradingType}
            livePrice={liveTicker?.last_price || market.price}
            balances={balances}
            feePreview={feePreview}
            onPlaceOrder={handlePlaceOrder}
          />
          
          <TradingOrderBook
            orderBook={currentOrderBook}
            currentPrice={liveTicker?.last_price || market.price}
            changePercent={liveTicker?.change_24h || market.changePercent}
          />
          
          <RecentTrades trades={recentTrades} />
        </div>
      </div>
    </div>
  );
};

export default TradingScreen;