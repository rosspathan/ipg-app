import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PairAppBar } from "@/components/trading/PairAppBar";
import { PairPickerSheet, TradingPair } from "@/components/trading/PairPickerSheet";
import { PairControlsRow, Timeframe } from "@/components/trading/PairControlsRow";
import { MicroStatsStrip } from "@/components/trading/MicroStatsStrip";
import { ChartCardPro } from "@/components/trading/ChartCardPro";
import { OrderSheet, OrderTicketData } from "@/components/trading/OrderSheet";
import { DepthOrderBook } from "@/components/trading/DepthOrderBook";
import { TradesTapePro, Trade } from "@/components/trading/TradesTapePro";
import { ExecStatusBar, ExecutionStatus } from "@/components/trading/ExecStatusBar";
import { FeesBar } from "@/components/trading/FeesBar";
import { AdapterFactory } from "@/lib/trading/AdapterFactory";
import { ExchangeAdapter } from "@/lib/trading/ExchangeAdapter";
import { AlertCircle } from "lucide-react";

// Mock trading pairs - in production, fetch from admin config
const mockPairs: TradingPair[] = [
  // Major pairs with USDT
  { symbol: "BTC/USDT", baseAsset: "BTC", quoteAsset: "USDT", lastPrice: 43500.00, priceChange24h: 2.45, volume24h: 125000000, isFavorite: true, isListed: true },
  { symbol: "ETH/USDT", baseAsset: "ETH", quoteAsset: "USDT", lastPrice: 2650.50, priceChange24h: 3.12, volume24h: 85000000, isFavorite: true, isListed: true },
  { symbol: "BNB/USDT", baseAsset: "BNB", quoteAsset: "USDT", lastPrice: 315.75, priceChange24h: 1.87, volume24h: 45000000, isFavorite: true, isListed: true },
  { symbol: "SOL/USDT", baseAsset: "SOL", quoteAsset: "USDT", lastPrice: 98.45, priceChange24h: 5.23, volume24h: 32000000, isFavorite: true, isListed: true },
  { symbol: "XRP/USDT", baseAsset: "XRP", quoteAsset: "USDT", lastPrice: 0.5234, priceChange24h: -1.45, volume24h: 28000000, isListed: true },
  { symbol: "ADA/USDT", baseAsset: "ADA", quoteAsset: "USDT", lastPrice: 0.4567, priceChange24h: 2.34, volume24h: 18000000, isListed: true },
  { symbol: "DOGE/USDT", baseAsset: "DOGE", quoteAsset: "USDT", lastPrice: 0.0789, priceChange24h: -2.11, volume24h: 22000000, isListed: true },
  { symbol: "AVAX/USDT", baseAsset: "AVAX", quoteAsset: "USDT", lastPrice: 36.78, priceChange24h: 4.56, volume24h: 15000000, isListed: true },
  { symbol: "MATIC/USDT", baseAsset: "MATIC", quoteAsset: "USDT", lastPrice: 0.8765, priceChange24h: 1.23, volume24h: 12000000, isListed: true },
  { symbol: "DOT/USDT", baseAsset: "DOT", quoteAsset: "USDT", lastPrice: 7.234, priceChange24h: -0.87, volume24h: 9500000, isListed: true },
  { symbol: "TRX/USDT", baseAsset: "TRX", quoteAsset: "USDT", lastPrice: 0.1234, priceChange24h: 0.56, volume24h: 8900000, isListed: true },
  { symbol: "LINK/USDT", baseAsset: "LINK", quoteAsset: "USDT", lastPrice: 14.567, priceChange24h: 3.45, volume24h: 11000000, isListed: true },
  { symbol: "UNI/USDT", baseAsset: "UNI", quoteAsset: "USDT", lastPrice: 6.789, priceChange24h: -1.23, volume24h: 7800000, isListed: true },
  { symbol: "ATOM/USDT", baseAsset: "ATOM", quoteAsset: "USDT", lastPrice: 9.876, priceChange24h: 2.11, volume24h: 6500000, isListed: true },
  { symbol: "LTC/USDT", baseAsset: "LTC", quoteAsset: "USDT", lastPrice: 72.345, priceChange24h: 1.45, volume24h: 8200000, isListed: true },
  { symbol: "APT/USDT", baseAsset: "APT", quoteAsset: "USDT", lastPrice: 8.456, priceChange24h: 6.78, volume24h: 9100000, isListed: true },
  { symbol: "ARB/USDT", baseAsset: "ARB", quoteAsset: "USDT", lastPrice: 1.234, priceChange24h: -2.34, volume24h: 7200000, isListed: true },
  { symbol: "OP/USDT", baseAsset: "OP", quoteAsset: "USDT", lastPrice: 2.345, priceChange24h: 3.21, volume24h: 5600000, isListed: true },
  { symbol: "INJ/USDT", baseAsset: "INJ", quoteAsset: "USDT", lastPrice: 23.456, priceChange24h: 5.67, volume24h: 6800000, isListed: true },
  { symbol: "SUI/USDT", baseAsset: "SUI", quoteAsset: "USDT", lastPrice: 0.9876, priceChange24h: 4.32, volume24h: 5200000, isListed: true },
  { symbol: "SHIB/USDT", baseAsset: "SHIB", quoteAsset: "USDT", lastPrice: 0.00001234, priceChange24h: -3.45, volume24h: 8900000, isListed: true },
  { symbol: "PEPE/USDT", baseAsset: "PEPE", quoteAsset: "USDT", lastPrice: 0.000009876, priceChange24h: 12.34, volume24h: 7800000, isListed: true },
  { symbol: "FTM/USDT", baseAsset: "FTM", quoteAsset: "USDT", lastPrice: 0.456, priceChange24h: 2.78, volume24h: 4500000, isListed: true },
  { symbol: "NEAR/USDT", baseAsset: "NEAR", quoteAsset: "USDT", lastPrice: 3.456, priceChange24h: -1.11, volume24h: 5800000, isListed: true },
  { symbol: "IMX/USDT", baseAsset: "IMX", quoteAsset: "USDT", lastPrice: 1.789, priceChange24h: 3.89, volume24h: 4200000, isListed: true },
  { symbol: "ALGO/USDT", baseAsset: "ALGO", quoteAsset: "USDT", lastPrice: 0.234, priceChange24h: 1.56, volume24h: 3800000, isListed: true },
  
  // Major pairs with BNB
  { symbol: "BTC/BNB", baseAsset: "BTC", quoteAsset: "BNB", lastPrice: 137.89, priceChange24h: 0.67, volume24h: 8500000, isListed: true },
  { symbol: "ETH/BNB", baseAsset: "ETH", quoteAsset: "BNB", lastPrice: 8.392, priceChange24h: 1.23, volume24h: 6200000, isListed: true },
  { symbol: "SOL/BNB", baseAsset: "SOL", quoteAsset: "BNB", lastPrice: 0.3118, priceChange24h: 3.45, volume24h: 4500000, isListed: true },
  { symbol: "XRP/BNB", baseAsset: "XRP", quoteAsset: "BNB", lastPrice: 0.001657, priceChange24h: -2.11, volume24h: 3200000, isListed: true },
  { symbol: "ADA/BNB", baseAsset: "ADA", quoteAsset: "BNB", lastPrice: 0.001447, priceChange24h: 1.89, volume24h: 2800000, isListed: true },
  { symbol: "DOGE/BNB", baseAsset: "DOGE", quoteAsset: "BNB", lastPrice: 0.0002499, priceChange24h: -1.67, volume24h: 3500000, isListed: true },
  { symbol: "AVAX/BNB", baseAsset: "AVAX", quoteAsset: "BNB", lastPrice: 0.1165, priceChange24h: 2.98, volume24h: 2600000, isListed: true },
  { symbol: "MATIC/BNB", baseAsset: "MATIC", quoteAsset: "BNB", lastPrice: 0.002776, priceChange24h: 0.78, volume24h: 2200000, isListed: true },
  { symbol: "DOT/BNB", baseAsset: "DOT", quoteAsset: "BNB", lastPrice: 0.0229, priceChange24h: -0.56, volume24h: 1900000, isListed: true },
  { symbol: "LINK/BNB", baseAsset: "LINK", quoteAsset: "BNB", lastPrice: 0.0461, priceChange24h: 2.34, volume24h: 2100000, isListed: true },
  { symbol: "UNI/BNB", baseAsset: "UNI", quoteAsset: "BNB", lastPrice: 0.0215, priceChange24h: -0.89, volume24h: 1700000, isListed: true },
  { symbol: "ATOM/BNB", baseAsset: "ATOM", quoteAsset: "BNB", lastPrice: 0.0313, priceChange24h: 1.67, volume24h: 1500000, isListed: true },
  { symbol: "LTC/BNB", baseAsset: "LTC", quoteAsset: "BNB", lastPrice: 0.2292, priceChange24h: 0.98, volume24h: 1800000, isListed: true },
  { symbol: "APT/BNB", baseAsset: "APT", quoteAsset: "BNB", lastPrice: 0.0268, priceChange24h: 5.12, volume24h: 1600000, isListed: true },
  { symbol: "ARB/BNB", baseAsset: "ARB", quoteAsset: "BNB", lastPrice: 0.00391, priceChange24h: -1.78, volume24h: 1400000, isListed: true },
  
  // BSK and IPG pairs (original)
  { symbol: "BSK/USDT", baseAsset: "BSK", quoteAsset: "USDT", lastPrice: 0.149, priceChange24h: 2.34, volume24h: 1250000, isListed: true },
  { symbol: "IPG/USDT", baseAsset: "IPG", quoteAsset: "USDT", lastPrice: 0.544, priceChange24h: 5.12, volume24h: 750000, isListed: true },
  { symbol: "BSK/BNB", baseAsset: "BSK", quoteAsset: "BNB", lastPrice: 0.000472, priceChange24h: 1.89, volume24h: 450000, isListed: true },
  { symbol: "IPG/BNB", baseAsset: "IPG", quoteAsset: "BNB", lastPrice: 0.001723, priceChange24h: 4.56, volume24h: 320000, isListed: true }
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
  const [selectedPair, setSelectedPair] = useState<string>("BTC/USDT");
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

  const high24h = currentPair.lastPrice * 1.05;
  const low24h = currentPair.lastPrice * 0.95;
  const spread = ((high24h - low24h) / currentPair.lastPrice) * 100;

  return (
    <div 
      className="min-h-screen bg-background pb-32"
      data-testid="page-trade"
    >
      {/* Pair App Bar with KPI Integrated */}
      <PairAppBar
        pair={selectedPair}
        mode={tradingMode}
        lastPrice={currentPair.lastPrice}
        priceChange24h={currentPair.priceChange24h}
        volume24h={currentPair.volume24h}
        currency="₹"
        isFavorite={currentPair.isFavorite}
        onToggleFavorite={() => handleToggleFavorite(selectedPair)}
        onPairClick={() => setPairPickerOpen(true)}
      />

      {/* Pair Controls - Pair pill + Timeframe chips + Candles Toggle */}
      <PairControlsRow
        pair={selectedPair}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        candlesEnabled={candlesEnabled}
        onCandlesToggle={handleCandlesToggle}
        onPairClick={() => setPairPickerOpen(true)}
      />

      {/* Chart Panel - Only mounts when Candles ON */}
      {candlesEnabled && (
        <ChartCardPro
          symbol={selectedPair}
          enabled={candlesEnabled}
        />
      )}

      {/* Micro Stats Strip */}
      <MicroStatsStrip
        high24h={high24h}
        low24h={low24h}
        spread={spread}
        currency="₹"
      />

      {/* Main Content Area */}
      <div className="px-4 py-3 space-y-4 mb-96">
        {/* Depth Order Book */}
        <DepthOrderBook
          bids={mockOrderBook.bids}
          asks={mockOrderBook.asks}
          onPriceClick={(price) => {
            console.log("Fill price:", price);
            // TODO: Fill limit price in order sheet
          }}
        />

        {/* Trades Tape Pro */}
        <TradesTapePro trades={mockTrades} />

        {/* Fees Bar */}
        <FeesBar
          makerFee={0.10}
          takerFee={0.10}
          feeAsset="BSK"
          bskDiscount={25}
          onLearnMore={() => navigate("/app/fees")}
        />
      </div>

      {/* Order Sheet - Bottom Sheet Pattern */}
      <OrderSheet
        pair={selectedPair}
        currentPrice={currentPair.lastPrice}
        availableBalance={100000}
        makerFee={0.10}
        takerFee={0.10}
        bestBid={mockOrderBook.bids[0]?.price}
        bestAsk={mockOrderBook.asks[0]?.price}
        isLoading={false}
        onSubmit={handleOrderSubmit}
      />

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
