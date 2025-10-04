import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

interface DepthOrderBookProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  onPriceClick?: (price: number) => void;
}

export function DepthOrderBook({ bids, asks, onPriceClick }: DepthOrderBookProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const maxTotal = Math.max(
    ...bids.slice(0, 10).map(b => b.total),
    ...asks.slice(0, 10).map(a => a.total)
  );

  const spread = asks[0] && bids[0] ? (asks[0].price - bids[0].price).toFixed(2) : "0.00";
  const spreadPercent = asks[0] && bids[0] 
    ? (((asks[0].price - bids[0].price) / bids[0].price) * 100).toFixed(2)
    : "0.00";

  const OrderRow = ({ 
    entry, 
    type 
  }: { 
    entry: OrderBookEntry; 
    type: "bid" | "ask" 
  }) => {
    const depthPercent = (entry.total / maxTotal) * 100;

    return (
      <button
        onClick={() => onPriceClick?.(entry.price)}
        className="relative w-full flex justify-between text-xs px-3 py-1.5 hover:bg-muted/30 transition-colors duration-120 active:scale-[0.99]"
      >
        <div
          className={`absolute inset-y-0 right-0 transition-all duration-220 ${
            type === "bid" ? "bg-success/10" : "bg-destructive/10"
          }`}
          style={{ width: `${depthPercent}%` }}
        />
        <span className={`relative z-10 font-bold tabular-nums ${
          type === "bid" ? "text-success" : "text-destructive"
        }`}>
          ₹{entry.price.toFixed(2)}
        </span>
        <span className="relative z-10 tabular-nums text-muted-foreground">
          {entry.quantity.toFixed(3)}
        </span>
        <span className="relative z-10 tabular-nums text-muted-foreground">
          ₹{entry.total.toFixed(0)}
        </span>
      </button>
    );
  };

  return (
    <Card 
      data-testid="order-book"
      className="bg-card/30 border border-border/50"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Order Book
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 p-0"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex justify-between text-xs font-semibold text-muted-foreground px-3 py-2 bg-muted/10 border-y border-border/30">
            <span>Price (₹)</span>
            <span>Amount</span>
            <span>Total (₹)</span>
          </div>

          <ScrollArea className="h-[200px]">
            {/* Asks */}
            <div className="space-y-0.5">
              {asks.slice(0, 8).reverse().map((ask, idx) => (
                <OrderRow key={`ask-${idx}`} entry={ask} type="ask" />
              ))}
            </div>

            {/* Spread */}
            <div className="flex items-center justify-center gap-2 py-2 bg-muted/20 border-y border-border/30">
              <Badge variant="outline" className="font-semibold tabular-nums text-xs">
                Spread: ₹{spread} ({spreadPercent}%)
              </Badge>
            </div>

            {/* Bids */}
            <div className="space-y-0.5">
              {bids.slice(0, 8).map((bid, idx) => (
                <OrderRow key={`bid-${idx}`} entry={bid} type="bid" />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
