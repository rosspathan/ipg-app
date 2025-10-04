import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ChevronUp, Loader2, TrendingUp, TrendingDown, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";

export interface OrderTicketData {
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
}

interface OrderSheetProps {
  pair: string;
  currentPrice: number;
  availableBalance: number;
  makerFee: number;
  takerFee: number;
  bestBid?: number;
  bestAsk?: number;
  isLoading?: boolean;
  onSubmit: (data: OrderTicketData) => void;
}

export function OrderSheet({
  pair,
  currentPrice,
  availableBalance,
  makerFee,
  takerFee,
  bestBid,
  bestAsk,
  isLoading = false,
  onSubmit
}: OrderSheetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [side, setSide] = useState<OrderSide>("buy");
  const [type, setType] = useState<OrderType>("limit");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState(currentPrice.toString());
  const [percentage, setPercentage] = useState(0);

  const [baseCurrency, quoteCurrency] = pair.split("/");

  useEffect(() => {
    if (type === "market") {
      setPrice(currentPrice.toString());
    }
  }, [currentPrice, type]);

  useEffect(() => {
    if (percentage > 0) {
      const maxAmount = availableBalance / parseFloat(price || currentPrice.toString());
      const calculatedAmount = (maxAmount * percentage) / 100;
      setAmount(calculatedAmount.toFixed(6));
    }
  }, [percentage, availableBalance, price, currentPrice]);

  const calculateTotal = () => {
    const amt = parseFloat(amount) || 0;
    const prc = parseFloat(price) || currentPrice;
    return amt * prc;
  };

  const calculateFee = () => {
    const total = calculateTotal();
    const feeRate = type === "market" ? takerFee : makerFee;
    return total * (feeRate / 100);
  };

  const calculateFinalCost = () => {
    return calculateTotal() + calculateFee();
  };

  const handleSubmit = () => {
    const orderData: OrderTicketData = {
      side,
      type,
      amount: parseFloat(amount),
      price: type === "limit" ? parseFloat(price) : undefined
    };
    onSubmit(orderData);
    setAmount("");
    setPercentage(0);
  };

  const isValid = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return false;
    if (type === "limit") {
      const prc = parseFloat(price);
      if (!prc || prc <= 0) return false;
    }
    return calculateFinalCost() <= availableBalance;
  };

  const percentageChips = [25, 50, 75, 100];

  return (
    <>
      {isExpanded && (
        <button
          aria-label="Close order sheet"
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 z-[19] bg-background/60 backdrop-blur-sm animate-fade-in"
        />
      )}

      <div 
        data-testid="order-sheet"
        className="fixed left-1/2 -translate-x-1/2 bottom-20 w-full max-w-[430px] z-40 transition-transform duration-320 pb-[env(safe-area-inset-bottom)] animate-fade-in"
      >
        <Card className="rounded-t-3xl border-t border-x border-border/30 bg-card/98 backdrop-blur-xl shadow-2xl pointer-events-auto">
        {/* Drag Handle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex justify-center py-3 hover:bg-muted/20 transition-all duration-220 rounded-t-3xl group"
          aria-label={isExpanded ? "Collapse order sheet" : "Expand order sheet"}
        >
          <div className="w-12 h-1.5 rounded-full bg-border group-hover:bg-border/80 transition-colors duration-220" />
        </button>

        {/* Collapsed View */}
        {!isExpanded && (
          <div className="px-4 pb-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-2 p-1 bg-card/40 rounded-xl border border-border/30">
                <button
                  onClick={() => setSide("buy")}
                  className={cn(
                    "h-10 px-6 rounded-lg font-semibold text-sm transition-all duration-220",
                    side === "buy"
                      ? "bg-success text-success-foreground shadow-md" 
                      : "text-muted-foreground"
                  )}
                >
                  Buy
                </button>
                <button
                  onClick={() => setSide("sell")}
                  className={cn(
                    "h-10 px-6 rounded-lg font-semibold text-sm transition-all duration-220",
                    side === "sell"
                      ? "bg-danger text-danger-foreground shadow-md" 
                      : "text-muted-foreground"
                  )}
                >
                  Sell
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-xl font-bold tabular-nums">₹{currentPrice.toFixed(2)}</span>
                <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-220 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <div data-testid="order-ticket" className="px-4 pb-6 space-y-4 animate-scale-in">
            {/* Side Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-card/40 rounded-xl border border-border/30">
              <button
                onClick={() => setSide("buy")}
                className={cn(
                  "h-12 rounded-lg font-semibold text-base transition-all duration-220",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  side === "buy"
                    ? "bg-success text-success-foreground shadow-lg shadow-success/20" 
                    : "text-muted-foreground hover:bg-card/60"
                )}
              >
                Buy
              </button>
              <button
                onClick={() => setSide("sell")}
                className={cn(
                  "h-12 rounded-lg font-semibold text-base transition-all duration-220",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  side === "sell"
                    ? "bg-danger text-danger-foreground shadow-lg shadow-danger/20" 
                    : "text-muted-foreground hover:bg-card/60"
                )}
              >
                Sell
              </button>
            </div>

            {/* Order Type */}
            <div className="flex items-center justify-between">
              <Select value={type} onValueChange={(v) => setType(v as OrderType)}>
                <SelectTrigger className="w-32 h-10 bg-card/60 border-border/40 transition-all duration-220 hover:border-border/60 focus:ring-2 focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-sm">
                <span className="text-muted-foreground">Available: </span>
                <span className="font-semibold tabular-nums text-foreground">₹{availableBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* Price (Limit Only) */}
            {type === "limit" && (
              <div className="space-y-2 animate-scale-in">
                <Label htmlFor="price" className="text-sm font-medium text-muted-foreground">
                  Price ({quoteCurrency})
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="flex-1 h-12 text-lg font-mono bg-card/60 border-border/40 transition-all duration-220 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                  <Button 
                    variant="outline" 
                    className="h-12 px-4 transition-all duration-220 hover:scale-[1.02] active:scale-[0.98] hover:bg-card/80"
                  >
                    BBO
                  </Button>
                </div>
                <div className="flex gap-2">
                  {bestBid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrice(bestBid.toString())}
                      className="flex-1 h-9 text-xs transition-all duration-220 hover:scale-[1.02] active:scale-[0.98] hover:bg-success/10 hover:border-success/40 hover:text-success"
                    >
                      Bid {bestBid.toFixed(2)}
                    </Button>
                  )}
                  {bestAsk && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrice(bestAsk.toString())}
                      className="flex-1 h-9 text-xs transition-all duration-220 hover:scale-[1.02] active:scale-[0.98] hover:bg-danger/10 hover:border-danger/40 hover:text-danger"
                    >
                      Ask {bestAsk.toFixed(2)}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
                Amount ({baseCurrency})
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-lg font-mono bg-card/60 border-border/40 transition-all duration-220 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                placeholder="0.00"
              />
            </div>

            {/* Percentage Chips */}
            <div className="grid grid-cols-4 gap-2">
              {percentageChips.map((pct) => (
                <Button
                  key={pct}
                  size="sm"
                  variant="outline"
                  onClick={() => setPercentage(pct)}
                  className={cn(
                    "h-9 text-xs font-semibold transition-all duration-220 hover:scale-[1.05] active:scale-[0.95]",
                    percentage === pct 
                      ? "bg-primary/20 border-primary/60 text-primary" 
                      : "hover:bg-card/80"
                  )}
                >
                  {pct}%
                </Button>
              ))}
            </div>

            {/* Slider */}
            <Slider
              value={[percentage]}
              onValueChange={(val) => setPercentage(val[0])}
              max={100}
              step={1}
              className="py-2 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:transition-all [&_[role=slider]]:duration-220 [&_[role=slider]]:hover:scale-110"
            />

            {/* Fee Preview */}
            <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2 transition-all duration-220 hover:border-border/60">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Total</span>
                <span className="font-semibold tabular-nums text-foreground">₹{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  Fee ({type === "market" ? "Taker" : "Maker"} {type === "market" ? takerFee : makerFee}%)
                  <Info className="h-3 w-3" />
                </span>
                <span className="font-semibold tabular-nums text-foreground">₹{calculateFee().toFixed(2)}</span>
              </div>
              <div className="h-px bg-border/40 my-2" />
              <div className="flex justify-between text-base">
                <span className="font-semibold text-foreground">Final Cost</span>
                <span className="font-bold tabular-nums text-foreground">₹{calculateFinalCost().toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isValid() || isLoading}
              className={cn(
                "w-full h-14 text-base font-bold shadow-lg transition-all duration-220",
                "hover:scale-[1.02] active:scale-[0.98]",
                side === "buy" 
                  ? "bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success/80 text-success-foreground shadow-success/30" 
                  : "bg-gradient-to-r from-danger to-danger/90 hover:from-danger/90 hover:to-danger/80 text-danger-foreground shadow-danger/30"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {side === "buy" ? (
                    <>
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Buy {baseCurrency}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-5 h-5 mr-2" />
                      Sell {baseCurrency}
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
    </>
  );
}