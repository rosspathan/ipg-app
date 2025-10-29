import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { OrderBookControls } from "./OrderBookControls";
import { OrderBookRow } from "./OrderBookRow";
import { OrderBookSpread } from "./OrderBookSpread";
import { useOrderBookAggregation } from "@/hooks/useOrderBookAggregation";
import { cn } from "@/lib/utils";

export type OrderBookMode = "split" | "buy" | "sell";

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

interface OrderBookProProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  currentPrice: number;
  onPriceClick?: (price: number) => void;
  className?: string;
}

export function OrderBookPro({
  bids,
  asks,
  currentPrice,
  onPriceClick,
  className,
}: OrderBookProProps) {
  const [precision, setPrecision] = useState(0.01);
  const [mode, setMode] = useState<OrderBookMode>("split");
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);

  // Aggregate order book by precision
  const { aggregatedBids, aggregatedAsks } = useOrderBookAggregation(
    bids,
    asks,
    precision
  );

  // Calculate max total for depth visualization
  const maxTotal = useMemo(() => {
    const maxBidTotal = aggregatedBids.length > 0 
      ? Math.max(...aggregatedBids.map(b => b.total)) 
      : 0;
    const maxAskTotal = aggregatedAsks.length > 0 
      ? Math.max(...aggregatedAsks.map(a => a.total)) 
      : 0;
    return Math.max(maxBidTotal, maxAskTotal);
  }, [aggregatedBids, aggregatedAsks]);

  // Calculate spread
  const bestBid = aggregatedBids[0]?.price || 0;
  const bestAsk = aggregatedAsks[0]?.price || 0;
  const spread = bestAsk - bestBid;
  const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

  // Calculate total volumes
  const totalBidVolume = aggregatedBids.reduce((sum, bid) => sum + bid.quantity, 0);
  const totalAskVolume = aggregatedAsks.reduce((sum, ask) => sum + ask.quantity, 0);

  // Determine visible rows based on mode
  const visibleAsks = mode === "buy" ? [] : aggregatedAsks.slice(0, mode === "sell" ? 20 : 10);
  const visibleBids = mode === "sell" ? [] : aggregatedBids.slice(0, mode === "buy" ? 20 : 10);

  const handleRowClick = (price: number) => {
    onPriceClick?.(price);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Controls */}
      <OrderBookControls
        mode={mode}
        precision={precision}
        onModeChange={setMode}
        onPrecisionChange={setPrecision}
      />

      {/* Order Book Content */}
      <div className="relative">
        {/* Header */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
          <div className="text-left">Price (USDT)</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Total</div>
        </div>

        {/* Asks (Sell Orders) - Red */}
        {mode !== "buy" && (
          <div className="flex flex-col-reverse max-h-[300px] overflow-y-auto scrollbar-thin">
            {visibleAsks.map((ask, index) => (
              <OrderBookRow
                key={`ask-${ask.price}-${index}`}
                price={ask.price}
                quantity={ask.quantity}
                total={ask.total}
                maxTotal={maxTotal}
                side="ask"
                precision={precision}
                isHovered={hoveredPrice === ask.price}
                onClick={() => handleRowClick(ask.price)}
                onHover={() => setHoveredPrice(ask.price)}
                onLeave={() => setHoveredPrice(null)}
              />
            ))}
          </div>
        )}

        {/* Spread Indicator */}
        {mode === "split" && (
          <OrderBookSpread
            currentPrice={currentPrice}
            spread={spread}
            spreadPercent={spreadPercent}
            bestBid={bestBid}
            bestAsk={bestAsk}
          />
        )}

        {/* Bids (Buy Orders) - Green */}
        {mode !== "sell" && (
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
            {visibleBids.map((bid, index) => (
              <OrderBookRow
                key={`bid-${bid.price}-${index}`}
                price={bid.price}
                quantity={bid.quantity}
                total={bid.total}
                maxTotal={maxTotal}
                side="bid"
                precision={precision}
                isHovered={hoveredPrice === bid.price}
                onClick={() => handleRowClick(bid.price)}
                onHover={() => setHoveredPrice(bid.price)}
                onLeave={() => setHoveredPrice(null)}
              />
            ))}
          </div>
        )}

        {/* Summary Footer */}
        <div className="flex items-center justify-between px-3 py-2 text-xs border-t border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total Bids:</span>
            <span className="font-mono font-medium text-success">
              {totalBidVolume.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total Asks:</span>
            <span className="font-mono font-medium text-destructive">
              {totalAskVolume.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
