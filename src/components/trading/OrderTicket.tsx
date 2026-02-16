import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export type OrderType = "market" | "limit";
export type OrderSide = "buy" | "sell";

export interface OrderTicketData {
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
  total: number;
  fee: number;
}

interface OrderTicketProps {
  pair: string;
  currentPrice: number;
  availableBalance: { base: number; quote: number };
  makerFee: number;
  takerFee: number;
  onSubmit: (order: OrderTicketData) => void;
  isLoading?: boolean;
}

export function OrderTicket({
  pair,
  currentPrice,
  availableBalance,
  makerFee,
  takerFee,
  onSubmit,
  isLoading = false
}: OrderTicketProps) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [amount, setAmount] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(0);
  const [price, setPrice] = useState<number>(currentPrice);

  const [base, quote] = pair.split("/");
  const balance = side === "buy" ? availableBalance.quote : availableBalance.base;

  useEffect(() => {
    setPrice(currentPrice);
  }, [currentPrice]);

  useEffect(() => {
    if (percentage > 0) {
      const maxAmount = side === "buy" 
        ? balance / (type === "limit" ? price : currentPrice)
        : balance;
      setAmount((maxAmount * percentage) / 100);
    }
  }, [percentage, balance, side, price, currentPrice, type]);

  const effectivePrice = type === "limit" ? price : currentPrice;
  const total = amount * effectivePrice;
  const feeRate = type === "market" ? takerFee : makerFee;
  const fee = total * (feeRate / 100);
  const finalTotal = side === "buy" ? total + fee : total - fee;

  const isValid = amount > 0 && (type === "market" || price > 0) && balance >= (side === "buy" ? finalTotal : amount);

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      side,
      type,
      amount,
      price: type === "limit" ? price : undefined,
      total: finalTotal,
      fee
    });
  };

  return (
    <Card className="p-4 bg-gradient-card" data-testid="order-ticket">
      <Tabs value={side} onValueChange={(v) => setSide(v as OrderSide)}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <TrendingUp className="h-4 w-4 mr-1" />
            Buy {base}
          </TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
            <TrendingDown className="h-4 w-4 mr-1" />
            Sell {base}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={side} className="space-y-4">
          {/* Order Type */}
          <div className="flex gap-2">
            <Button
              variant={type === "market" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("market")}
              className="flex-1"
            >
              Market
            </Button>
            <Button
              variant={type === "limit" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("limit")}
              className="flex-1"
            >
              Limit
            </Button>
          </div>

          {/* Price (Limit only) */}
          {type === "limit" && (
            <div className="space-y-2">
              <Label className="text-xs">Limit Price (USDT)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="h-9"
                step="0.01"
              />
            </div>
          )}

          {/* Available Balance */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Available:</span>
            <span className="font-medium">
              {balance.toFixed(8)} {side === "buy" ? quote : base}
            </span>
          </div>

          {/* Amount Slider */}
          <div className="space-y-3">
            <Label className="text-xs">Amount ({base})</Label>
            <div className="flex gap-2 mb-2">
              {[25, 50, 75, 100].map((pct) => (
                <Button
                  key={pct}
                  variant={percentage === pct ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPercentage(pct)}
                  className="flex-1 h-7 text-xs"
                >
                  {pct}%
                </Button>
              ))}
            </div>
            <Slider
              value={[percentage]}
              onValueChange={([val]) => setPercentage(val)}
              max={100}
              step={1}
              className="w-full"
            />
            <Input
              type="number"
              value={amount}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setAmount(val);
                setPercentage(0);
              }}
              className="h-9"
              step="0.00000001"
              placeholder="0.00000000"
            />
          </div>

          {/* Estimated Total & Fee */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">
                {type === "market" ? "Market" : `${price.toFixed(2)} ${quote}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Total:</span>
              <span className="font-bold">{total.toFixed(2)} {quote}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Fee ({type === "market" ? "Taker" : "Maker"} {feeRate}%):
              </span>
              <span className="font-medium text-primary">{fee.toFixed(4)} {quote}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Effective Rate:</span>
              <span>{amount > 0 ? (finalTotal / amount).toFixed(4) : "0.0000"} {quote}/{base}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-medium">Final {side === "buy" ? "Cost" : "Receive"}:</span>
              <span className="font-bold text-lg">{finalTotal.toFixed(2)} {quote}</span>
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {!isValid && amount > 0 && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg text-xs text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Insufficient balance</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className={`w-full h-11 font-bold ${
              side === "buy" 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {isLoading ? "Processing..." : `${side === "buy" ? "Buy" : "Sell"} ${base}`}
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
