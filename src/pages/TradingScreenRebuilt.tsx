import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PairHeaderPro } from "@/components/trading/PairHeaderPro";
import { KPIStatsRow } from "@/components/trading/KPIStatsRow";
import { PairPickerSheet, TradingPair } from "@/components/trading/PairPickerSheet";
import { TFChipsAndToggle, Timeframe } from "@/components/trading/TFChipsAndToggle";
import { ChartCardPro } from "@/components/trading/ChartCardPro";
import { OrderTicketPro, OrderTicketData } from "@/components/trading/OrderTicketPro";
import { DepthOrderBook, OrderBookEntry } from "@/components/trading/DepthOrderBook";
import { TradesTapePro, Trade } from "@/components/trading/TradesTapePro";
import { ExecStatusBar, ExecutionStatus } from "@/components/trading/ExecStatusBar";
import { FeesBar } from "@/components/trading/FeesBar";
import { AdapterFactory } from "@/lib/trading/AdapterFactory";
import { ExchangeAdapter } from "@/lib/trading/ExchangeAdapter";
import { AlertCircle } from "lucide-react";

// Mock trading pairs - in production, fetch from admin config
const mockPairs: TradingPair[] = [
  { symbol: "BSK/INR", baseAsset: "BSK", quoteAsset: "INR", lastPrice: 12.45, priceChange24h: 2.34, volume24h: 1250000, isFavorite: true, isListed: true },
  { symbol: "BTC/INR", baseAsset: "BTC", quoteAsset: "INR", lastPrice: 3625000, priceChange24h: 3.21, volume24h: 45000000, isListed: true },
  { symbol: "ETH/INR", baseAsset: "ETH", quoteAsset: "INR", lastPrice: 222500, priceChange24h: -1.45, volume24h: 12000000, isListed: true },
  { symbol: "BNB/INR", baseAsset: "BNB", quoteAsset: "INR", lastPrice: 26450, priceChange24h: 1.87, volume24h: 5500000, isListed: true },
  { symbol: "USDT/INR", baseAsset: "USDT", quoteAsset: "INR", lastPrice: 83.75, priceChange24h: 0.05, volume24h: 98000000, isListed: true },
  { symbol: "IPG/INR", baseAsset: "IPG", quoteAsset: "INR", lastPrice: 45.50, priceChange24h: 5.12, volume24h: 750000, isListed: true }
];

// Mock order book data
const mockOrderBook = {
  bids: Array.from({ length: 15 }, (_, i) => ({
    price: 12.45 - (i * 0.01),
    quantity: Math.random() * 1000,
    total: 0
  })),
  asks: Array.from({ length: 15 }, (_, i) => ({
    price: 12.45 + (i * 0.01),
    quantity: Math.random() * 1000,
    total: 0
  }))
};

// Calculate totals
mockOrderBook.bids.forEach((bid, i) => {
  bid.total = mockOrderBook.bids.slice(0, i + 1).reduce((sum, b) => sum + (b.price * b.quantity), 0);
});
mockOrderBook.asks.forEach((ask, i) => {
  ask.total = mockOrderBook.asks.slice(0, i + 1).reduce((sum, a) => sum + (a.price * a.quantity), 0);
});

// Mock recent trades
const mockTrades: Trade[] = Array.from({ length: 30 }, (_, i) => ({
  id: `trade-${i}`,
  price: 12.45 + (Math.random() - 0.5) * 0.1,
  quantity: Math.random() * 100,
  side: Math.random() > 0.5 ? "buy" : "sell",
  timestamp: Date.now() - (i * 60000)
}));

export default function TradingScreenRebuilt() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Core state
  const [selectedPair, setSelectedPair] = useState<string>("BSK/INR");
  const [tradingMode, setTradingMode] = useState<"LIVE" | "SIM">("SIM");
  const [candlesEnabled, setCandlesEnabled] = useState(false); // Chart disabled by default
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [pairs, setPairs] = useState<TradingPair[]>(mockPairs);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [pairPickerOpen, setPairPickerOpen] = useState(false);

  // Exchange adapter
  const [adapter, setAdapter] = useState<ExchangeAdapter | null>(null);

  // Initialize adapter
  useEffect(() => {
    const exchangeAdapter = AdapterFactory.create({
      mode: tradingMode,
      // In production, these would come from admin settings
      apiKey: undefined,
      apiSecret: undefined,
      endpoint: undefined
    });
    setAdapter(exchangeAdapter);

    return () => {
      exchangeAdapter.unsubscribe();
    };
  }, [tradingMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "/":
          e.preventDefault();
          setPairPickerOpen(true);
          break;
        case "c":
          e.preventDefault();
          setCandlesEnabled(prev => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Get current pair data
  const currentPair = pairs.find(p => p.symbol === selectedPair) || pairs[0];

  // Handle pair selection
  const handlePairSelect = (symbol: string) => {
    setSelectedPair(symbol);
    setCandlesEnabled(false); // Reset chart when switching pairs
  };

  // Handle favorite toggle
  const handleToggleFavorite = (symbol: string) => {
    setPairs(prev => prev.map(p => 
      p.symbol === symbol ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  // Handle chart toggle - CRITICAL: Only enable when user explicitly toggles
  const handleCandlesToggle = (enabled: boolean) => {
    setCandlesEnabled(enabled);
    console.log("[Trading] Candles", enabled ? "enabled" : "disabled", "- Chart will", enabled ? "mount" : "unmount");
  };

  // Handle order submission
  const handleOrderSubmit = async (order: OrderTicketData) => {
    if (!adapter) {
      toast({
        title: "Error",
        description: "Trading adapter not initialized",
        variant: "destructive"
      });
      return;
    }

    setExecutionStatus({
      type: "processing",
      message: `Placing ${order.side} order...`
    });

    try {
      const response = await adapter.placeOrder({
        pair: selectedPair,
        side: order.side,
        type: order.type,
        amount: order.amount,
        price: order.price
      });

      setExecutionStatus({
        type: "success",
        message: `Order ${response.status}!`,
        details: `${order.side.toUpperCase()} ${order.amount} ${currentPair.baseAsset} @ ₹${response.averagePrice.toFixed(2)}`
      });

      setTimeout(() => setExecutionStatus(null), 5000);

      toast({
        title: "Order Executed",
        description: `${order.side.toUpperCase()} order filled at ₹${response.averagePrice.toFixed(2)}`
      });
    } catch (error: any) {
      setExecutionStatus({
        type: "error",
        message: "Order failed",
        details: error.message
      });

      setTimeout(() => setExecutionStatus(null), 5000);
    }
  };

  return (
    <div 
      className="min-h-screen bg-background pb-32"
      data-testid="page-trade"
    >
      {/* Pair Header with Mode Badge and Favorite */}
      <PairHeaderPro
        pair={selectedPair}
        mode={tradingMode}
        isFavorite={currentPair.isFavorite}
        onToggleFavorite={() => handleToggleFavorite(selectedPair)}
        onOpenPairPicker={() => setPairPickerOpen(true)}
      />

      {/* KPI Stats Row - 3 Cards */}
      <KPIStatsRow
        lastPrice={currentPair.lastPrice}
        priceChange24h={currentPair.priceChange24h}
        volume24h={currentPair.volume24h}
        currency="₹"
        onPress={() => {
          // TODO: Open MiniAnalytics modal with OHLC data
          console.log("Open mini analytics");
        }}
      />

      {/* Timeframe Chips + Candles Toggle */}
      <TFChipsAndToggle
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        candlesEnabled={candlesEnabled}
        onCandlesToggle={handleCandlesToggle}
      />

      {/* Chart Panel - Only mounts when Candles ON */}
      <ChartCardPro
        symbol={selectedPair}
        enabled={candlesEnabled}
      />

      {/* Order Ticket Pro */}
      <div className="px-4 my-4">
        <OrderTicketPro
          pair={selectedPair}
          currentPrice={currentPair.lastPrice}
          availableBalance={{ base: 1000, quote: 100000 }}
          makerFee={0.10}
          takerFee={0.10}
          bestBid={mockOrderBook.bids[0]?.price}
          bestAsk={mockOrderBook.asks[0]?.price}
          onSubmit={handleOrderSubmit}
        />
      </div>

      {/* Depth Order Book */}
      <div className="px-4 mb-4">
        <DepthOrderBook
          bids={mockOrderBook.bids}
          asks={mockOrderBook.asks}
          onPriceClick={(price) => {
            console.log("Fill price:", price);
            // TODO: Fill limit price in order ticket
          }}
        />
      </div>

      {/* Trades Tape Pro */}
      <div className="px-4 mb-4">
        <TradesTapePro trades={mockTrades} />
      </div>

      {/* Fees Bar */}
      <div className="px-4 mb-4">
        <FeesBar
          makerFee={0.10}
          takerFee={0.10}
          feeAsset="BSK"
          onLearnMore={() => navigate("/app/fees")}
        />
      </div>

      {/* Risk Disclaimer */}
      <div className="px-4 mb-4">
        <div className="p-3 bg-muted/30 border border-border/50 rounded-lg flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            <strong className="text-foreground">Risk Warning:</strong> Trading crypto involves risk. 
            {tradingMode === "SIM" && " You are in simulation mode - no real funds at risk."}
            {tradingMode === "LIVE" && " You are trading with real funds. Trade responsibly."}
          </p>
        </div>
      </div>

      {/* Execution Status Bar */}
      <ExecStatusBar
        status={executionStatus}
        onDismiss={() => setExecutionStatus(null)}
      />

      {/* Pair Picker Sheet */}
      <PairPickerSheet
        open={pairPickerOpen}
        onOpenChange={setPairPickerOpen}
        pairs={pairs}
        selectedPair={selectedPair}
        onPairSelect={handlePairSelect}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
