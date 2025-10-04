import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ChevronUp, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div 
      data-testid="order-sheet"
      className="fixed bottom-16 left-0 right-0 z-20 transition-transform duration-320"
    >
      <Card className="rounded-t-3xl border-t border-x border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
        {/* Drag Handle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex justify-center py-2 hover:bg-muted/30 transition-colors duration-120 rounded-t-3xl"
          aria-label={isExpanded ? "Collapse order sheet" : "Expand order sheet"}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </button>

        {/* Collapsed View */}
        {!isExpanded && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <Tabs value={side} onValueChange={(v) => setSide(v as OrderSide)} className="w-auto">
                <TabsList className="h-9">
                  <TabsTrigger value="buy" className="px-6 data-[state=active]:bg-success data-[state=active]:text-white">
                    Buy
                  </TabsTrigger>
                  <TabsTrigger value="sell" className="px-6 data-[state=active]:bg-destructive data-[state=active]:text-white">
                    Sell
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-lg font-bold tabular-nums">₹{currentPrice.toFixed(2)}</span>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <div data-testid="order-ticket" className="px-4 pb-6 space-y-4">
            {/* Side Tabs */}
            <Tabs value={side} onValueChange={(v) => setSide(v as OrderSide)}>
              <TabsList className="w-full h-11">
                <TabsTrigger value="buy" className="flex-1 data-[state=active]:bg-success data-[state=active]:text-white">
                  Buy
                </TabsTrigger>
                <TabsTrigger value="sell" className="flex-1 data-[state=active]:bg-destructive data-[state=active]:text-white">
                  Sell
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Order Type */}
            <div className="flex items-center justify-between">
              <Select value={type} onValueChange={(v) => setType(v as OrderType)}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-xs text-muted-foreground">
                Available: <span className="font-semibold text-foreground">₹{availableBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* Price (Limit Only) */}
            {type === "limit" && (
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs text-muted-foreground">
                  Price ({quoteCurrency})
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="flex-1 h-11 text-base font-semibold tabular-nums"
                    placeholder="0.00"
                  />
                  {bestBid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrice(bestBid.toString())}
                      className="h-11 px-3 text-xs"
                    >
                      Bid {bestBid.toFixed(2)}
                    </Button>
                  )}
                  {bestAsk && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrice(bestAsk.toString())}
                      className="h-11 px-3 text-xs"
                    >
                      Ask {bestAsk.toFixed(2)}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs text-muted-foreground">
                Amount ({baseCurrency})
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 text-base font-semibold tabular-nums"
                placeholder="0.00"
              />
            </div>

            {/* Percentage Chips */}
            <div className="flex gap-2">
              {percentageChips.map((pct) => (
                <Button
                  key={pct}
                  variant={percentage === pct ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPercentage(pct)}
                  className="flex-1 h-8 text-xs font-semibold"
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
              className="py-2"
            />

            {/* Fee Preview */}
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Est. Total</span>
                <span className="font-semibold tabular-nums">₹{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  Fee ({type === "market" ? "Taker" : "Maker"} {type === "market" ? takerFee : makerFee}%)
                </span>
                <span className="font-semibold tabular-nums">₹{calculateFee().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 border-t border-border/30">
                <span className="font-semibold">Final Cost</span>
                <span className="font-bold tabular-nums">₹{calculateFinalCost().toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isValid() || isLoading}
              className={`w-full h-12 text-base font-bold ${
                side === "buy" 
                  ? "bg-success hover:bg-success/90" 
                  : "bg-destructive hover:bg-destructive/90"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                `${side === "buy" ? "Buy" : "Sell"} ${baseCurrency}`
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
