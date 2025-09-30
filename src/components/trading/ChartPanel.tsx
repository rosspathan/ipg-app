import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { Timeframe } from "./CandleToggle";

// Lazy load the chart component
const PriceChart = lazy(() => import("@/components/trading/PriceChart"));

interface ChartPanelProps {
  symbol: string;
  timeframe: Timeframe;
  enabled: boolean;
}

function ChartSkeleton() {
  return (
    <div className="h-[280px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Skeleton className="h-32 w-32 rounded-full mx-auto" />
        <Skeleton className="h-4 w-40 mx-auto" />
      </div>
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <Card className="h-[80px] flex items-center justify-center bg-muted/20 border-dashed">
      <div className="text-center text-muted-foreground">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">Enable Candles to view chart</p>
      </div>
    </Card>
  );
}

export function ChartPanel({ symbol, timeframe, enabled }: ChartPanelProps) {
  if (!enabled) {
    return <ChartPlaceholder />;
  }

  return (
    <div data-testid="chart-panel" className="py-2">
      <Suspense fallback={<ChartSkeleton />}>
        <PriceChart symbol={symbol} height={280} />
      </Suspense>
    </div>
  );
}
