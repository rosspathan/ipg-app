import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, TrendingUp, Info, Plus, BarChart3, Settings, MoreVertical, BookOpen, X } from "lucide-react";
import { PairSelectorSheet } from "@/components/trading/PairSelectorSheet";
import { PercentChipsPro } from "@/components/trading/PercentChipsPro";
import { AmountSliderPro } from "@/components/trading/AmountSliderPro";
import { AmountInputPro } from "@/components/trading/AmountInputPro";
import { AllocationDonut } from "@/components/trading/AllocationDonut";
import { ErrorHintBar, type ErrorHint } from "@/components/trading/ErrorHintBar";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DockNav } from "@/components/navigation/DockNav";
import { ChartCardPro } from "@/components/trading/ChartCardPro";

// Mock data for order book
const mockOrderBook = {
  asks: Array.from({ length: 10 }, (_, i) => ({
    price: 1148.5 - i * 0.1,
    quantity: (Math.random() * 20).toFixed(4)
  })).reverse(),
  bids: Array.from({ length: 10 }, (_, i) => ({
    price: 1147.8 - i * 0.1,
    quantity: (Math.random() * 20).toFixed(4)
  }))
};

export default function TradingScreenRebuilt() {
  const navigate = useNavigate();
  const { data: allPairs = [], isLoading } = useTradingPairs();
  
  const [selectedPairSymbol, setSelectedPairSymbol] = useState("BNB ORIGINAL/USDT");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState("limit");
  const [price, setPrice] = useState("1147.3");
  const [quantity, setQuantity] = useState("");
  const [percentage, setPercentage] = useState(0);
  const [amountUnit, setAmountUnit] = useState<"base" | "quote">("base");
  const [tpslEnabled, setTpslEnabled] = useState(false);
  const [showOrderBook, setShowOrderBook] = useState(false);
  const [selectedTab, setSelectedTab] = useState("orders");
  const [chartEnabled, setChartEnabled] = useState(false);
  const [pairSelectorOpen, setPairSelectorOpen] = useState(false);
  const [errors, setErrors] = useState<ErrorHint[]>([]);

  // Get current pair data
  const currentPair = allPairs.find(p => p.symbol === selectedPairSymbol) || allPairs[0];
  
  const availableBalance = 329.19972973;
  const baseSymbol = currentPair?.baseAsset || "BNB";
  const quoteSymbol = currentPair?.quoteAsset || "USDT";
  const priceChange = currentPair ? `${currentPair.change24h > 0 ? '+' : ''}${currentPair.change24h.toFixed(2)}%` : "+0.00%";
  
  // Trading limits from current pair
  const stepSize = currentPair?.lotSize.toString() || "0.001";
  const minQty = "0.01";
  const maxQty = "1000";
  const minNotional = currentPair?.minNotional.toString() || "10";

  const handlePercentageClick = (pct: number) => {
    setPercentage(pct);
    const currentPrice = orderType === "market" ? mockOrderBook.bids[0].price : parseFloat(price || "0");
    const maxQty = availableBalance / currentPrice;
    const newQty = (maxQty * pct) / 100;
    setQuantity(newQty.toFixed(4));
    validateAmount(newQty.toString(), currentPrice);
  };

  const handleAmountChange = (value: string) => {
    setQuantity(value);
    const qty = parseFloat(value) || 0;
    const currentPrice = orderType === "market" ? mockOrderBook.bids[0].price : parseFloat(price || "0");
    
    if (currentPrice > 0) {
      const pct = (qty / (availableBalance / currentPrice)) * 100;
      setPercentage(Math.min(100, Math.max(0, pct)));
    }
    
    validateAmount(value, currentPrice);
  };

  const handleUnitToggle = () => {
    if (amountUnit === "base") {
      // Convert to quote
      const qty = parseFloat(quantity) || 0;
      const currentPrice = orderType === "market" ? mockOrderBook.bids[0].price : parseFloat(price || "0");
      setQuantity((qty * currentPrice).toFixed(2));
      setAmountUnit("quote");
    } else {
      // Convert to base
      const quoteAmt = parseFloat(quantity) || 0;
      const currentPrice = orderType === "market" ? mockOrderBook.bids[0].price : parseFloat(price || "0");
      setQuantity((quoteAmt / currentPrice).toFixed(4));
      setAmountUnit("base");
    }
  };

  const validateAmount = (value: string, currentPrice: number) => {
    const newErrors: ErrorHint[] = [];
    const qty = parseFloat(value) || 0;
    
    if (qty < parseFloat(minQty)) {
      newErrors.push({
        message: `Minimum quantity is ${minQty} ${baseSymbol}`,
        severity: "error"
      });
    }
    
    if (qty > parseFloat(maxQty)) {
      newErrors.push({
        message: `Maximum quantity is ${maxQty} ${baseSymbol}`,
        severity: "error"
      });
    }
    
    const notionalValue = qty * currentPrice;
    if (notionalValue < parseFloat(minNotional) && qty > 0) {
      newErrors.push({
        message: `Order value must be at least ${minNotional} ${quoteSymbol}`,
        severity: "warning"
      });
    }
    
    if (side === "buy" && notionalValue > availableBalance) {
      newErrors.push({
        message: "Insufficient balance",
        severity: "error"
      });
    }
    
    setErrors(newErrors);
  };

  const handlePlaceOrder = () => {
    // Validation
    const qty = parseFloat(quantity);
    const orderPrice = orderType === "market" ? mockOrderBook.bids[0].price : parseFloat(price);

    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (orderType === "limit" && (!orderPrice || orderPrice <= 0)) {
      toast.error("Please enter a valid price");
      return;
    }

    const totalValue = qty * orderPrice;
    if (side === "buy" && totalValue > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    // Create order object
    const order = {
      id: `order-${Date.now()}`,
      pair: selectedPairSymbol,
      side,
      type: orderType,
      price: orderPrice,
      quantity: qty,
      total: totalValue,
      status: orderType === "market" ? "filled" : "pending",
      timestamp: new Date().toISOString()
    };

    // For market orders, execute immediately
    if (orderType === "market") {
      toast.success(
        `Market ${side} order filled: ${qty.toFixed(4)} BNB @ $${orderPrice.toFixed(2)}`,
        {
          description: `Total: $${totalValue.toFixed(2)}`
        }
      );
    } else {
      // For limit orders, show pending
      toast.success(
        `Limit ${side} order placed: ${qty.toFixed(4)} BNB @ $${orderPrice.toFixed(2)}`,
        {
          description: "Order is pending execution"
        }
      );
    }

    // Reset form
    setQuantity("");
    setPercentage(0);
    if (orderType === "limit") {
      setPrice("");
    }

    console.log("Order placed:", order);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-trade">
      {/* Mobile Container */}
      <div className="w-full max-w-[430px] mx-auto flex-1 flex flex-col pb-24">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-background border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPairSelectorOpen(true)}
              className="flex items-center gap-2 hover:bg-muted/50 px-3 py-2 rounded-lg transition-colors"
            >
              <div className="text-left">
                <div className="text-sm font-bold">{selectedPairSymbol}</div>
                <div className={cn(
                  "text-xs font-semibold",
                  currentPair?.change24h >= 0 ? "text-success" : "text-danger"
                )}>
                  {priceChange}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-lg">
                <BarChart3 className={cn(
                  "h-4 w-4 transition-colors",
                  chartEnabled ? "text-primary" : "text-muted-foreground"
                )} />
                <Switch
                  checked={chartEnabled}
                  onCheckedChange={setChartEnabled}
                  className="scale-75"
                />
              </div>
              <button className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
                <Settings className="h-5 w-5" />
              </button>
              <button className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Chart - Conditional */}
        {chartEnabled && (
          <div className="animate-fade-in">
            <ChartCardPro
              symbol={selectedPairSymbol}
              enabled={chartEnabled}
            />
          </div>
        )}

        {/* Main Trading Interface */}
        <div className="relative">
          {/* Order Entry Form - Full width on mobile, split on desktop */}
          <div className="border-t border-border/50 flex">
            {/* Order Entry Form */}
            <div className="flex-1 px-4 py-4 space-y-3">
            {/* Buy/Sell Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("buy")}
                className={cn(
                  "h-10 rounded-lg font-semibold text-sm transition-all duration-200",
                  side === "buy"
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                Buy
              </button>
              <button
                onClick={() => setSide("sell")}
                className={cn(
                  "h-10 rounded-lg font-semibold text-sm transition-all duration-200",
                  side === "sell"
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                Sell
              </button>
            </div>

            {/* Order Type */}
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-full border border-border hover:bg-muted/50 transition-colors">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="h-9 bg-muted/30 border-border/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="limit">Limit</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Input - Only show for Limit orders */}
            {orderType === "limit" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="flex-1 h-12 text-xl font-bold bg-muted/30 border-border/50 font-mono"
                    placeholder="0.00"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 px-4 border-border/50 hover:bg-muted/50 font-semibold"
                    onClick={() => {
                      // BBO = Best Bid/Offer - auto-fill from orderbook
                      const bestPrice = side === "buy" 
                        ? mockOrderBook.asks[mockOrderBook.asks.length - 1].price 
                        : mockOrderBook.bids[0].price;
                      setPrice(bestPrice.toFixed(1));
                    }}
                  >
                    BBO
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  ≈ {(parseFloat(price) || 0).toLocaleString()} USD
                </div>
              </div>
            )}

            {/* Market Order Price Display */}
            {orderType === "market" && (
              <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Market Price</span>
                  <span className="text-base font-bold font-mono">
                    ${mockOrderBook.bids[0].price.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Order will execute at current market price
                </div>
              </div>
            )}

            {/* Amount Control - Pro Version */}
            <div className="space-y-4">
              {/* Percent Chips */}
              <PercentChipsPro
                value={percentage}
                onSelect={handlePercentageClick}
              />
              
              {/* Amount Slider */}
              <AmountSliderPro
                value={percentage}
                onChange={handlePercentageClick}
                baseAmount={quantity || "0.00"}
                quoteAmount={((parseFloat(quantity) || 0) * (orderType === "market" ? mockOrderBook.bids[0].price : parseFloat(price || "0"))).toFixed(2)}
                baseSymbol={baseSymbol}
                quoteSymbol={quoteSymbol}
              />
              
              {/* Amount Input with Donut */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <AmountInputPro
                    value={quantity}
                    onChange={handleAmountChange}
                    unit={amountUnit}
                    onUnitToggle={handleUnitToggle}
                    baseSymbol={baseSymbol}
                    quoteSymbol={quoteSymbol}
                    minNotional={`${minNotional} ${quoteSymbol}`}
                    stepSize={stepSize}
                  />
                </div>
                <div className="pt-3">
                  <AllocationDonut percentage={percentage} />
                </div>
              </div>
              
              {/* Error Hints */}
              <ErrorHintBar errors={errors} />
            </div>

            {/* Order Value */}
            <div className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
              <span className="text-xs text-muted-foreground">Order value</span>
              <span className="text-sm font-bold font-mono text-foreground">
                {((parseFloat(quantity) || 0) * (orderType === "market" ? mockOrderBook.bids[0].price : parseFloat(price || "0"))).toFixed(2)} {quoteSymbol}
              </span>
            </div>

            {/* TP/SL */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tpsl"
                  checked={tpslEnabled}
                  onCheckedChange={(checked) => setTpslEnabled(checked as boolean)}
                  className="h-4 w-4"
                />
                <label
                  htmlFor="tpsl"
                  className="text-xs font-medium cursor-pointer"
                >
                  TP/SL
                </label>
              </div>

              {/* TP/SL Input Fields */}
              {tpslEnabled && (
                <div className="space-y-2 pl-6">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Take Profit</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="h-10 bg-muted/30 border-border/50 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Stop Loss</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="h-10 bg-muted/30 border-border/50 text-sm font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Available Balance */}
            <div className="flex items-center justify-between py-2 px-3 bg-muted/10 rounded-lg">
              <span className="text-xs text-muted-foreground">Available</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold font-mono text-foreground">
                  {availableBalance.toFixed(2)} {side === "buy" ? quoteSymbol : baseSymbol}
                </span>
                <button className="p-1 hover:bg-muted/50 rounded transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            
            {/* Selected Amount Info */}
            {percentage > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Using {percentage}% of balance</span>
                <span className="font-semibold text-primary">
                  {((availableBalance * percentage) / 100).toFixed(2)} {side === "buy" ? quoteSymbol : baseSymbol}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handlePlaceOrder}
              className={cn(
                "w-full h-12 text-base font-bold shadow-lg transition-all duration-200",
                side === "buy"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
              )}
            >
              {side === "buy" ? "Buy" : "Sell"} BNB
            </Button>
            </div>

            {/* Desktop Order Book - Hidden on mobile */}
            <div className="hidden lg:block w-[200px] py-4 pr-4 border-l border-border/50">
              <div className="flex items-center justify-between mb-2 px-2">
                <div className="text-[9px] font-semibold text-muted-foreground">Price (USDT)</div>
                <div className="text-[9px] font-semibold text-muted-foreground">Quantity (BNB)</div>
              </div>

            {/* Asks - 4 red entries */}
            <div className="space-y-0.5 mb-2">
              {mockOrderBook.asks.slice(-4).reverse().map((ask, idx) => (
                <button
                  key={`ask-${idx}`}
                  className="w-full flex items-center justify-between py-0.5 px-2 hover:bg-rose-500/5 rounded transition-colors"
                >
                  <span className="text-xs font-mono font-semibold text-rose-500">
                    {ask.price.toFixed(1)}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {ask.quantity}
                  </span>
                </button>
              ))}
            </div>

            {/* Current Price - 1 white entry */}
            <div className="flex items-center justify-center gap-1.5 py-2 mb-2 bg-muted/20 rounded-lg">
              <span className="text-sm font-bold font-mono text-foreground">{mockOrderBook.bids[0].price}</span>
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-[9px] text-muted-foreground">
                ≈${(mockOrderBook.bids[0].price * 1.002).toFixed(2)}
              </span>
            </div>

            {/* Bids - 4 green entries */}
            <div className="space-y-0.5">
              {mockOrderBook.bids.slice(0, 4).map((bid, idx) => (
                <button
                  key={`bid-${idx}`}
                  className="w-full flex items-center justify-between py-0.5 px-2 hover:bg-emerald-500/5 rounded transition-colors"
                >
                  <span className="text-xs font-mono font-semibold text-emerald-500">
                    {bid.price.toFixed(1)}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {bid.quantity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Mobile Order Book Floating Button */}
        <button
          onClick={() => setShowOrderBook(!showOrderBook)}
          className="lg:hidden fixed bottom-20 right-4 z-50 h-12 px-4 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center gap-2 font-semibold text-sm hover:scale-105 transition-transform"
        >
          <BookOpen className="h-4 w-4" />
          Order Book
        </button>

        {/* Mobile Order Book Sheet */}
        {showOrderBook && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setShowOrderBook(false)}>
            <div 
              className="absolute bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-2xl max-h-[70vh] overflow-y-auto animate-slide-in-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
                <h3 className="font-bold text-base">Order Book</h3>
                <button 
                  onClick={() => setShowOrderBook(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="text-xs font-semibold text-muted-foreground">Price (USDT)</div>
                  <div className="text-xs font-semibold text-muted-foreground">Quantity (BNB)</div>
                </div>

                {/* Asks - 4 red entries */}
                <div className="space-y-1 mb-3">
                  {mockOrderBook.asks.slice(-4).reverse().map((ask, idx) => (
                    <button
                      key={`mobile-ask-${idx}`}
                      className="w-full flex items-center justify-between py-2 px-3 hover:bg-rose-500/5 rounded-lg transition-colors"
                    >
                      <span className="text-sm font-mono font-bold text-rose-500">
                        {ask.price.toFixed(1)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {ask.quantity}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Current Price - 1 white entry */}
                <div className="flex items-center justify-center gap-2 py-3 mb-3 bg-muted/20 rounded-lg">
                  <span className="text-lg font-bold font-mono text-foreground">{mockOrderBook.bids[0].price}</span>
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-xs text-muted-foreground">
                    ≈${(mockOrderBook.bids[0].price * 1.002).toFixed(2)}
                  </span>
                </div>

                {/* Bids - 4 green entries */}
                <div className="space-y-1">
                  {mockOrderBook.bids.slice(0, 4).map((bid, idx) => (
                    <button
                      key={`mobile-bid-${idx}`}
                      className="w-full flex items-center justify-between py-2 px-3 hover:bg-emerald-500/5 rounded-lg transition-colors"
                    >
                      <span className="text-sm font-mono font-bold text-emerald-500">
                        {bid.price.toFixed(1)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {bid.quantity}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        </div> {/* Close relative div */}

        {/* Bottom Tabs */}
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="flex items-center gap-4 px-4 py-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedTab("orders")}
              className={cn(
                "flex items-center gap-1.5 pb-2 border-b-2 transition-colors whitespace-nowrap text-xs",
                selectedTab === "orders"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Orders(0)
              <ChevronDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => setSelectedTab("assets")}
              className={cn(
                "pb-2 border-b-2 transition-colors whitespace-nowrap text-xs",
                selectedTab === "assets"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Assets
            </button>
            <button
              onClick={() => setSelectedTab("elite")}
              className={cn(
                "pb-2 border-b-2 transition-colors whitespace-nowrap text-xs",
                selectedTab === "elite"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Elite trades
            </button>
            <button
              onClick={() => setSelectedTab("bots")}
              className={cn(
                "pb-2 border-b-2 transition-colors whitespace-nowrap text-xs",
                selectedTab === "bots"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Bots(0)
            </button>
          </div>

          {/* Tab Content */}
          <div className="px-4 py-4 pb-2 text-center">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Checkbox id="show-current" className="h-3.5 w-3.5" />
                <label htmlFor="show-current" className="text-xs text-muted-foreground">
                  Show current
                </label>
              </div>
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Cancel all
              </button>
            </div>
            <p className="text-xs text-muted-foreground">No {selectedTab} yet</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <DockNav onNavigate={(path) => navigate(path)} />

      {/* Pair Selector */}
      <PairSelectorSheet
        open={pairSelectorOpen}
        onOpenChange={setPairSelectorOpen}
        currentPair={selectedPairSymbol}
        onSelectPair={(newPair) => {
          setSelectedPairSymbol(newPair);
          const selected = allPairs.find(p => p.symbol === newPair);
          if (selected) {
            setPrice(selected.price.toFixed(2));
          }
        }}
      />
    </div>
  );
}
