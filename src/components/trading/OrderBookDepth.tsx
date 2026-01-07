import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

interface OrderBookDepthProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  onPriceClick?: (price: number, side: "buy" | "sell") => void;
}

export function OrderBookDepth({ bids, asks, onPriceClick }: OrderBookDepthProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const maxTotal = Math.max(
    ...bids.slice(0, 10).map(b => b.total),
    ...asks.slice(0, 10).map(a => a.total)
  );

  return (
    <Card className="bg-gradient-card" data-testid="order-book">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Order Book</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4 p-4 pt-0">
          {/* Header */}
          <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium">
            <div>Price (USDT)</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Total</div>
          </div>

          {/* Asks (Sell Orders) */}
          <div className="space-y-1">
            {asks.slice(0, 10).reverse().map((ask, idx) => (
              <div
                key={`ask-${idx}`}
                className="grid grid-cols-3 text-xs py-1 px-2 rounded relative cursor-pointer hover:bg-red-500/10 transition-colors"
                onClick={() => onPriceClick?.(ask.price, "sell")}
              >
                <div 
                  className="absolute inset-0 bg-red-500/10 rounded"
                  style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                />
                <div className="relative text-red-500 font-medium">{ask.price.toFixed(2)}</div>
                <div className="relative text-right">{ask.quantity.toFixed(6)}</div>
                <div className="relative text-right text-muted-foreground">{ask.total.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Spread */}
          <div className="flex justify-center py-2 border-y border-border">
            <div className="text-xs text-center">
              <div className="text-muted-foreground mb-1">Spread</div>
              <div className="font-bold text-primary">
                {asks.length > 0 && bids.length > 0 
                  ? `$${(asks[0].price - bids[0].price).toFixed(2)}`
                  : "—"
                }
              </div>
            </div>
          </div>

          {/* Bids (Buy Orders) */}
          <div className="space-y-1">
            {bids.slice(0, 10).map((bid, idx) => (
              <div
                key={`bid-${idx}`}
                className="grid grid-cols-3 text-xs py-1 px-2 rounded relative cursor-pointer hover:bg-green-500/10 transition-colors"
                onClick={() => onPriceClick?.(bid.price, "buy")}
              >
                <div 
                  className="absolute inset-0 bg-green-500/10 rounded"
                  style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                />
                <div className="relative text-green-500 font-medium">{bid.price.toFixed(2)}</div>
                <div className="relative text-right">{bid.quantity.toFixed(6)}</div>
                <div className="relative text-right text-muted-foreground">{bid.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
