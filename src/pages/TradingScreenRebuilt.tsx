import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, TrendingUp, Info, Plus, BarChart3, Settings, MoreVertical } from "lucide-react";
import { PairSelectorSheet } from "@/components/trading/PairSelectorSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState("limit");
  const [price, setPrice] = useState("1147.3");
  const [quantity, setQuantity] = useState("");
  const [percentage, setPercentage] = useState(0);
  const [tpslEnabled, setTpslEnabled] = useState(false);
  const [selectedTab, setSelectedTab] = useState("orders");
  const [chartEnabled, setChartEnabled] = useState(false);
  const [pairSelectorOpen, setPairSelectorOpen] = useState(false);

  const availableBalance = 329.19972973;
  const pair = "BNB/USDT";
  const priceChange = "+0.33%";

  const handlePercentageClick = (pct: number) => {
    setPercentage(pct);
    const maxQty = availableBalance / parseFloat(price || "0");
    setQuantity(((maxQty * pct) / 100).toFixed(4));
  };

  return (
    <div className="min-h-screen bg-background pb-24" data-testid="page-trade">
      {/* Mobile Container */}
      <div className="w-full max-w-[430px] mx-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-background border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPairSelectorOpen(true)}
              className="flex items-center gap-2 hover:bg-muted/50 px-3 py-2 rounded-lg transition-colors"
            >
              <div className="text-left">
                <div className="text-sm font-bold">{pair}</div>
                <div className="text-[10px] font-semibold text-success">{priceChange}</div>
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
              symbol={pair}
              enabled={chartEnabled}
            />
          </div>
        )}

        {/* Main Trading Interface */}
        <div className="grid grid-cols-[1fr_auto] gap-0 border-t border-border/50">
          {/* Left Side: Order Entry Form */}
          <div className="px-4 py-4 space-y-3 border-r border-border/50">
            {/* Buy/Sell Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("buy")}
                className={cn(
                  "h-10 rounded-lg font-semibold text-sm transition-all duration-200",
                  side === "buy"
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
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

            {/* Price Input */}
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

            {/* Amount Input */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Quantity</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 p-0 border-border/50 hover:bg-muted/50"
                  onClick={() => {
                    const current = parseFloat(quantity) || 0;
                    const step = 0.01;
                    setQuantity(Math.max(0, current - step).toFixed(4));
                  }}
                >
                  −
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex-1 h-10 text-base font-semibold bg-muted/30 border-border/50 font-mono"
                  placeholder="0.00"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 p-0 border-border/50 hover:bg-muted/50"
                  onClick={() => {
                    const current = parseFloat(quantity) || 0;
                    const step = 0.01;
                    setQuantity((current + step).toFixed(4));
                  }}
                >
                  +
                </Button>
                <span className="text-sm font-semibold text-foreground">BNB</span>
              </div>
            </div>

            {/* Percentage Buttons */}
            <div className="flex gap-1.5">
              <button className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-[10px] font-medium hover:bg-muted/50 transition-colors">
                0%
              </button>
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePercentageClick(pct)}
                  className={cn(
                    "flex-1 h-7 rounded-lg text-[10px] font-semibold transition-colors",
                    percentage === pct
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Slider */}
            <Slider
              value={[percentage]}
              onValueChange={(v) => handlePercentageClick(v[0])}
              max={100}
              step={1}
              className="py-1"
            />

            {/* Order Value */}
            <div className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
              <span className="text-xs text-muted-foreground">Order value</span>
              <span className="text-xs font-semibold">USDT</span>
            </div>

            {/* TP/SL */}
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

            {/* Available Balance */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Available</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold">
                  {availableBalance.toFixed(8)} USDT
                </span>
                <button className="p-1 hover:bg-muted/50 rounded transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className={cn(
                "w-full h-12 text-base font-bold shadow-lg transition-all duration-200",
                side === "buy"
                  ? "bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-500/20"
                  : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
              )}
            >
              {side === "buy" ? "Buy" : "Sell"} BNB
            </Button>
          </div>

          {/* Right Side: Order Book */}
          <div className="w-[180px] py-4 pr-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="text-[9px] font-semibold text-muted-foreground">Price (USDT)</div>
              <div className="text-[9px] font-semibold text-muted-foreground">Quantity (BNB)</div>
            </div>

            {/* Asks */}
            <div className="space-y-0.5 mb-2">
              {mockOrderBook.asks.slice(0, 7).map((ask, idx) => (
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

            {/* Current Price */}
            <div className="flex items-center justify-center gap-1.5 py-2 mb-2 bg-muted/20 rounded-lg">
              <span className="text-sm font-bold font-mono">{mockOrderBook.bids[0].price}</span>
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-[9px] text-muted-foreground">
                ≈${(mockOrderBook.bids[0].price * 1.002).toFixed(2)}
              </span>
            </div>

            {/* Bids */}
            <div className="space-y-0.5">
              {mockOrderBook.bids.slice(0, 7).map((bid, idx) => (
                <button
                  key={`bid-${idx}`}
                  className="w-full flex items-center justify-between py-0.5 px-2 hover:bg-cyan-500/5 rounded transition-colors"
                >
                  <span className="text-xs font-mono font-semibold text-cyan-500">
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

        {/* Bottom Tabs */}
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl pb-16">
          <div className="flex items-center gap-4 px-4 py-2 overflow-x-auto">
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
          <div className="px-4 py-4 text-center">
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
        currentPair={pair}
        onSelectPair={(newPair) => {
          // Update pair - in production this would update state and fetch new data
          console.log("Selected pair:", newPair);
        }}
      />
    </div>
  );
}
