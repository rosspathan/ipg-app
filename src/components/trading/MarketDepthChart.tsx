import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo } from "react";

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface MarketDepthChartProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export function MarketDepthChart({ bids, asks }: MarketDepthChartProps) {
  const chartData = useMemo(() => {
    // Process bids (cumulative from highest to lowest)
    const bidData = bids
      .map(({ price, quantity }) => ({
        price,
        quantity,
      }))
      .sort((a, b) => b.price - a.price)
      .reduce((acc, curr, index) => {
        const cumulative = index === 0 ? curr.quantity : acc[index - 1].cumulative + curr.quantity;
        acc.push({
          price: curr.price,
          bidDepth: cumulative,
          askDepth: null,
        });
        return acc;
      }, [] as any[]);

    // Process asks (cumulative from lowest to highest)
    const askData = asks
      .map(({ price, quantity }) => ({
        price,
        quantity,
      }))
      .sort((a, b) => a.price - b.price)
      .reduce((acc, curr, index) => {
        const cumulative = index === 0 ? curr.quantity : acc[index - 1].cumulative + curr.quantity;
        acc.push({
          price: curr.price,
          bidDepth: null,
          askDepth: cumulative,
        });
        return acc;
      }, [] as any[]);

    return [...bidData.reverse(), ...askData];
  }, [bids, asks]);

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium">Market Depth</h3>
        <p className="text-xs text-muted-foreground">Cumulative order book visualization</p>
      </div>
      
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="price"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            formatter={(value: any) => value?.toFixed(4)}
          />
          <Area
            type="stepAfter"
            dataKey="bidDepth"
            stroke="hsl(142, 71%, 45%)"
            fill="url(#bidGradient)"
            strokeWidth={2}
          />
          <Area
            type="stepBefore"
            dataKey="askDepth"
            stroke="hsl(0, 84%, 60%)"
            fill="url(#askGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
