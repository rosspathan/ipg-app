import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

const PriceChart = lazy(() => import("@/components/trading/PriceChart"));

interface ChartCardProProps {
  symbol: string;
  enabled: boolean;
}

function ChartSkeleton() {
  return (
    <div className="h-[320px] flex items-center justify-center bg-card/20 rounded-lg border border-border/50">
      <div className="text-center space-y-3">
        <Skeleton className="h-20 w-20 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <Card className="h-[140px] flex items-center justify-center bg-card/20 border border-border/50 border-dashed">
      <div className="text-center text-muted-foreground">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Enable Candles to view chart</p>
        <p className="text-xs mt-1 opacity-70">Toggle the switch above</p>
      </div>
    </Card>
  );
}

export function ChartCardPro({ symbol, enabled }: ChartCardProProps) {
  if (!enabled) {
    return null;
  }

  return (
    <div data-testid="chart-panel" className="px-4 py-3">
      <Suspense fallback={<ChartSkeleton />}>
        <PriceChart symbol={symbol} height={320} />
      </Suspense>
    </div>
  );
}
