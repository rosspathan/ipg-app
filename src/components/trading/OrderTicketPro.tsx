import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";

type OrderSide = "buy" | "sell";
type OrderType = "market" | "limit";

export interface OrderTicketData {
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
}

interface OrderTicketProProps {
  pair: string;
  currentPrice: number;
  availableBalance: { base: number; quote: number };
  makerFee: number;
  takerFee: number;
  bestBid?: number;
  bestAsk?: number;
  loading?: boolean;
  onSubmit: (order: OrderTicketData) => void;
}

export function OrderTicketPro({
  pair,
  currentPrice,
  availableBalance,
  makerFee,
  takerFee,
  bestBid,
  bestAsk,
  loading = false,
  onSubmit
}: OrderTicketProProps) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [amount, setAmount] = useState<string>("");
  const [price, setPrice] = useState<string>(currentPrice.toFixed(2));
  const [percentage, setPercentage] = useState<number>(0);

  const [baseAsset, quoteAsset] = pair.split("/");

  // Update price when currentPrice changes
  useEffect(() => {
    if (type === "market") {
      setPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, type]);

  // Update amount based on percentage
  useEffect(() => {
    if (percentage > 0) {
      const balance = side === "buy" ? availableBalance.quote : availableBalance.base;
      const effectivePrice = type === "limit" ? parseFloat(price) || currentPrice : currentPrice;
      
      let maxAmount = 0;
      if (side === "buy") {
        maxAmount = (balance * (percentage / 100)) / effectivePrice;
      } else {
        maxAmount = balance * (percentage / 100);
      }
      
      setAmount(maxAmount.toFixed(6));
    }
  }, [percentage, side, type, price, currentPrice, availableBalance]);

  const calculateTotal = () => {
    const amt = parseFloat(amount) || 0;
    const effectivePrice = type === "limit" ? parseFloat(price) || currentPrice : currentPrice;
    return amt * effectivePrice;
  };

  const calculateFee = () => {
    const total = calculateTotal();
    const feeRate = type === "market" ? takerFee : makerFee;
    return total * (feeRate / 100);
  };

  const calculateFinalCost = () => {
    const total = calculateTotal();
    const fee = calculateFee();
    return side === "buy" ? total + fee : total - fee;
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    onSubmit({
      side,
      type,
      amount: amt,
      price: type === "limit" ? parseFloat(price) : undefined
    });

    // Reset form
    setAmount("");
    setPercentage(0);
  };

  const isValid = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return false;
    
    if (type === "limit") {
      const limitPrice = parseFloat(price);
      if (isNaN(limitPrice) || limitPrice <= 0) return false;
    }

    const total = calculateTotal();
    if (side === "buy") {
      return total <= availableBalance.quote;
    } else {
      return amt <= availableBalance.base;
    }
  };

  return (
    <Card 
      data-testid="order-ticket"
      className="bg-card/30 border border-border/50 p-4"
    >
      {/* Buy/Sell Tabs */}
      <Tabs value={side} onValueChange={(v) => setSide(v as OrderSide)} className="mb-4">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger 
            value="buy" 
            className="data-[state=active]:bg-success data-[state=active]:text-white font-semibold"
          >
            🟢 Buy {baseAsset}
          </TabsTrigger>
          <TabsTrigger 
            value="sell"
            className="data-[state=active]:bg-destructive data-[state=active]:text-white font-semibold"
          >
            🔴 Sell {baseAsset}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Market/Limit Tabs */}
      <Tabs value={type} onValueChange={(v) => setType(v as OrderType)} className="mb-4">
        <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/30">
          <TabsTrigger value="market" className="font-medium">Market</TabsTrigger>
          <TabsTrigger value="limit" className="font-medium">Limit</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Available Balance */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Available:</span>
        <span className="text-sm font-bold tabular-nums">
          {side === "buy" 
            ? `${availableBalance.quote.toLocaleString()} ${quoteAsset}`
            : `${availableBalance.base.toLocaleString()} ${baseAsset}`
          }
        </span>
      </div>

      {/* Limit Price (only for limit orders) */}
      {type === "limit" && (
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">
            Price ({quoteAsset})
          </label>
          <div className="flex gap-2 mb-2">
            {bestBid && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrice(bestBid.toFixed(2))}
                className="flex-1 h-8 text-xs"
              >
                Best Bid: ₹{bestBid.toFixed(2)}
              </Button>
            )}
            {bestAsk && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrice(bestAsk.toFixed(2))}
                className="flex-1 h-8 text-xs"
              >
                Best Ask: ₹{bestAsk.toFixed(2)}
              </Button>
            )}
          </div>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="h-11 text-base tabular-nums"
          />
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-3">
        <label className="text-sm font-medium mb-2 block">
          Amount ({baseAsset})
        </label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setPercentage(0);
          }}
          placeholder="0.00"
          className="h-12 text-lg font-semibold tabular-nums"
        />
      </div>

      {/* Percentage Chips */}
      <div className="flex gap-2 mb-3">
        {[25, 50, 75, 100].map((pct) => (
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
        onValueChange={([val]) => setPercentage(val)}
        max={100}
        step={1}
        className="mb-4"
      />

      {/* Fee Preview */}
      <div className="space-y-2 mb-4 p-3 bg-muted/20 rounded-lg border border-border/30">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Est. Total:</span>
          <span className="font-semibold tabular-nums">₹{calculateTotal().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Fee ({type === "market" ? "Taker" : "Maker"} {type === "market" ? takerFee : makerFee}%):
          </span>
          <span className="font-semibold tabular-nums text-primary">₹{calculateFee().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base pt-2 border-t border-border/30">
          <span className="font-bold">Final {side === "buy" ? "Cost" : "Receive"}:</span>
          <span className="font-bold tabular-nums text-lg">₹{calculateFinalCost().toFixed(2)}</span>
        </div>
      </div>

      {/* Submit Button - Sticky at bottom */}
      <Button
        onClick={handleSubmit}
        disabled={!isValid() || loading}
        className={`w-full h-12 text-base font-bold transition-all duration-220 ${
          side === "buy"
            ? "bg-success hover:bg-success/90 text-white"
            : "bg-destructive hover:bg-destructive/90 text-white"
        }`}
      >
        {loading ? "Processing..." : `${side === "buy" ? "Buy" : "Sell"} ${baseAsset}`}
      </Button>
    </Card>
  );
}
