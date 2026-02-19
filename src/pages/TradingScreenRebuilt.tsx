import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, TrendingUp, Info, BarChart3, Settings, MoreVertical, BookOpen, X } from "lucide-react";
import { PairSelectorSheet } from "@/components/trading/PairSelectorSheet";
import { PercentChipsPro } from "@/components/trading/PercentChipsPro";
import { AmountSliderPro } from "@/components/trading/AmountSliderPro";
import { AmountInputPro } from "@/components/trading/AmountInputPro";
import { AllocationDonut } from "@/components/trading/AllocationDonut";
import { ErrorHintBar, type ErrorHint } from "@/components/trading/ErrorHintBar";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useUserBalance } from "@/hooks/useUserBalance";
import { useUserOrders } from "@/hooks/useUserOrders";
import { OrdersList } from "@/components/trading/OrdersList";
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
  
  // Fetch real balances and orders
  const { data: balances } = useUserBalance();
  const { orders, placeOrder, cancelOrder, isPlacingOrder } = useUserOrders(selectedPairSymbol);
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
  
  const baseSymbol = currentPair?.baseAsset || "BNB";
  const quoteSymbol = currentPair?.quoteAsset || "USDT";
  
  // Get real balance for the relevant asset
  const relevantAsset = side === "buy" ? quoteSymbol : baseSymbol;
  const userBalanceData = balances?.find((b: any) => b.symbol === relevantAsset);
  const availableBalance = userBalanceData?.balance || 0;
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

  const handlePlaceOrder = async () => {
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

    try {
      // Place order in database
      await placeOrder({
        symbol: selectedPairSymbol,
        side,
        type: orderType as 'market' | 'limit',
        quantity: qty,
        price: orderType === 'limit' ? orderPrice : undefined,
        trading_type: 'spot',
      });

      // Reset form
      setQuantity("");
      setPercentage(0);
      if (orderType === "limit") {
        setPrice("");
      }
    } catch (error) {
      console.error("Order placement error:", error);
    }
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
          {/* Order Entry Form with inline Order Book */}
          <div className="border-t border-border/50 flex">
            {/* Order Entry Form - Left Side */}
            <div className="flex-1 min-w-0 px-3 py-4 space-y-2.5">
            {/* Buy/Sell Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("buy")}
                className={cn(
                  "h-9 rounded-lg font-semibold text-xs transition-all duration-200",
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
                  "h-9 rounded-lg font-semibold text-xs transition-all duration-200",
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
              <button className="p-1 rounded-full border border-border hover:bg-muted/50 transition-colors">
                <Info className="h-3 w-3 text-muted-foreground" />
              </button>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="h-8 bg-muted/30 border-border/50 text-xs">
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
                    className="flex-1 h-10 text-base font-bold bg-muted/30 border-border/50 font-mono"
                    placeholder="0.00"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 border-border/50 hover:bg-muted/50 font-semibold text-xs"
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
                <div className="text-[10px] text-muted-foreground">
                  ≈ {(parseFloat(price) || 0).toLocaleString()} USD
                </div>
              </div>
            )}

            {/* Market Order Price Display */}
            {orderType === "market" && (
              <div className="p-2 bg-muted/20 rounded-lg border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Market Price</span>
                  <span className="text-sm font-bold font-mono">
                    ${mockOrderBook.bids[0].price.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Amount Control - Compact */}
            <div className="space-y-2">
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
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
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
                <div className="pt-2">
                  <AllocationDonut percentage={percentage} />
                </div>
              </div>
              
              {/* Error Hints */}
              <ErrorHintBar errors={errors} />
            </div>

            {/* Order Value */}
            <div className="flex items-center justify-between py-1.5 px-2 bg-muted/20 rounded-lg">
              <span className="text-[10px] text-muted-foreground">Order value</span>
              <span className="text-xs font-bold font-mono text-foreground">
                {((parseFloat(quantity) || 0) * (orderType === "market" ? mockOrderBook.bids[0].price : parseFloat(price || "0"))).toFixed(2)} {quoteSymbol}
              </span>
            </div>

            {/* TP/SL */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tpsl"
                  checked={tpslEnabled}
                  onCheckedChange={(checked) => setTpslEnabled(checked as boolean)}
                  className="h-3.5 w-3.5"
                />
                <label
                  htmlFor="tpsl"
                  className="text-[10px] font-medium cursor-pointer"
                >
                  TP/SL
                </label>
              </div>

              {/* TP/SL Input Fields */}
              {tpslEnabled && (
                <div className="space-y-1.5 pl-5">
                  <div className="space-y-0.5">
                    <label className="text-[9px] text-muted-foreground">Take Profit</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="h-8 bg-muted/30 border-border/50 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] text-muted-foreground">Stop Loss</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="h-8 bg-muted/30 border-border/50 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Available Balance */}
            <div className="flex items-center justify-between py-1.5 px-2 bg-muted/10 rounded-lg">
              <span className="text-[10px] text-muted-foreground">Available</span>
              <span className="text-xs font-bold font-mono text-foreground">
                {availableBalance.toFixed(2)} {side === "buy" ? quoteSymbol : baseSymbol}
              </span>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || errors.some(e => e.severity === 'error')}
              className={cn(
                "w-full h-11 text-sm font-bold shadow-lg transition-all duration-200 rounded-xl",
                side === "buy"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
              )}
            >
              {side === "buy" ? "Buy" : "Sell"} BNB
            </Button>
            </div>

            {/* Order Book - Right Side (Always visible) */}
            <div className="w-[145px] py-4 pr-3 pl-2 border-l border-border/50 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-[8px] font-semibold text-muted-foreground">Price<br/>(USDT)</div>
                <div className="text-[8px] font-semibold text-muted-foreground text-right">Quantity<br/>(BNB)</div>
              </div>

            {/* Asks - 4 red entries */}
            <div className="space-y-0.5 mb-2">
              {mockOrderBook.asks.slice(-4).reverse().map((ask, idx) => (
                <button
                  key={`ask-${idx}`}
                  className="w-full flex items-center justify-between py-0.5 px-1 hover:bg-rose-500/5 rounded transition-colors"
                >
                  <span className="text-[10px] font-mono font-semibold text-rose-500">
                    {ask.price.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {parseFloat(ask.quantity).toFixed(4)}
                  </span>
                </button>
              ))}
            </div>

            {/* Current Price - 1 white entry */}
            <div className="flex flex-col items-center justify-center gap-0.5 py-1.5 mb-2 bg-muted/20 rounded-lg">
              <span className="text-xs font-bold font-mono text-foreground">{mockOrderBook.bids[0].price}</span>
              <span className="text-[8px] text-muted-foreground">
                ≈${(mockOrderBook.bids[0].price * 1.002).toFixed(2)}
              </span>
            </div>

            {/* Bids - 4 green entries */}
            <div className="space-y-0.5">
              {mockOrderBook.bids.slice(0, 4).map((bid, idx) => (
                <button
                  key={`bid-${idx}`}
                  className="w-full flex items-center justify-between py-0.5 px-1 hover:bg-emerald-500/5 rounded transition-colors"
                >
                  <span className="text-[10px] font-mono font-semibold text-emerald-500">
                    {bid.price.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {parseFloat(bid.quantity).toFixed(4)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>
        
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
              Orders({orders.length})
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
          <div className="px-4 py-4 pb-2">
            {selectedTab === 'orders' && (
              <div>
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
                <OrdersList 
                  orders={orders as any} 
                  onCancel={cancelOrder}
                  showCancelButton={true}
                />
              </div>
            )}
            {selectedTab !== 'orders' && (
              <p className="text-xs text-muted-foreground text-center">No {selectedTab} yet</p>
            )}
          </div>
        </div>
      </div>

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
