import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

export interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
  timestamp: number;
}

interface TradesTapeProProps {
  trades: Trade[];
}

export function TradesTapePro({ trades }: TradesTapeProProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Card 
      data-testid="trades-tape"
      className="bg-card/30 border border-border/50"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Trades
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
            <span>Price</span>
            <span>Amount</span>
            <span>Time</span>
          </div>

          <ScrollArea className="h-[200px]">
            {trades.length > 0 ? (
              <div className="space-y-0.5">
                {trades.slice(0, 50).map((trade) => (
                  <div
                    key={trade.id}
                    className="flex justify-between text-xs px-3 py-1.5 hover:bg-muted/20 transition-colors duration-120"
                  >
                    <span className={`font-bold tabular-nums ${
                      trade.side === "buy" ? "text-success" : "text-destructive"
                    }`}>
                      ${trade.price.toFixed(2)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {trade.quantity.toFixed(3)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(trade.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">
                No recent trades
              </div>
            )}
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
