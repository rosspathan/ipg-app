import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export type Timeframe = "1H" | "4H" | "1D" | "1W";

interface TFChipsAndToggleProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  candlesEnabled: boolean;
  onCandlesToggle: (enabled: boolean) => void;
}

export function TFChipsAndToggle({
  timeframe,
  onTimeframeChange,
  candlesEnabled,
  onCandlesToggle
}: TFChipsAndToggleProps) {
  const timeframes: Timeframe[] = ["1H", "4H", "1D", "1W"];

  return (
    <div 
      className="flex items-center justify-between gap-3 px-4 py-3 bg-card/20 border-y border-border/50"
    >
      <div 
        data-testid="tf-chips"
        className="flex items-center gap-2"
      >
        {timeframes.map((tf) => (
          <Button
            key={tf}
            variant={timeframe === tf ? "default" : "ghost"}
            size="sm"
            onClick={() => onTimeframeChange(tf)}
            disabled={!candlesEnabled}
            className={`h-8 px-3 text-xs font-semibold transition-all duration-120 ${
              timeframe === tf 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "hover:bg-primary/10 text-muted-foreground"
            } ${!candlesEnabled ? "opacity-40" : ""}`}
          >
            {tf}
          </Button>
        ))}
      </div>

      <div 
        data-testid="candle-toggle"
        className="flex items-center gap-2"
      >
        <BarChart3 className={`h-4 w-4 transition-colors duration-220 ${
          candlesEnabled ? "text-primary" : "text-muted-foreground"
        }`} />
        <span className="text-sm font-medium">Candles</span>
        <Switch
          checked={candlesEnabled}
          onCheckedChange={onCandlesToggle}
          aria-label="Toggle candle chart"
        />
      </div>
    </div>
  );
}
