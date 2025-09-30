import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
  timestamp: number;
}

interface TradesTapeProps {
  trades: Trade[];
}

export function TradesTape({ trades }: TradesTapeProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Card className="bg-gradient-card" data-testid="trades-tape">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Trades
            <Badge variant="secondary" className="text-xs">{trades.length}</Badge>
          </CardTitle>
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
        <CardContent className="p-4 pt-0">
          {/* Header */}
          <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium mb-2">
            <div>Price (₹)</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Side</div>
            <div className="text-right">Time</div>
          </div>

          {/* Trades List */}
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {trades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No recent trades
              </div>
            ) : (
              trades.slice(0, 50).map((trade) => (
                <div
                  key={trade.id}
                  className="grid grid-cols-4 text-xs py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <div className={`font-medium ${
                    trade.side === "buy" ? "text-green-500" : "text-red-500"
                  }`}>
                    {trade.price.toFixed(2)}
                  </div>
                  <div className="text-right">{trade.quantity.toFixed(6)}</div>
                  <div className="text-right">
                    <Badge 
                      variant={trade.side === "buy" ? "default" : "destructive"}
                      className="h-5 text-xs"
                    >
                      {trade.side}
                    </Badge>
                  </div>
                  <div className="text-right text-muted-foreground text-xs">
                    {formatDistanceToNow(trade.timestamp, { addSuffix: false })}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
