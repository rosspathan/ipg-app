import { BarChart3, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export type Timeframe = "1H" | "4H" | "1D" | "1W";

interface PairControlsRowProps {
  pair: string;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  candlesEnabled: boolean;
  onCandlesToggle: (enabled: boolean) => void;
  onPairClick: () => void;
}

export function PairControlsRow({
  pair,
  timeframe,
  onTimeframeChange,
  candlesEnabled,
  onCandlesToggle,
  onPairClick
}: PairControlsRowProps) {
  const timeframes: Timeframe[] = ["1H", "4H", "1D", "1W"];

  return (
    <div 
      data-testid="pair-controls"
      className="flex items-center justify-between gap-2 px-4 py-3 bg-card/20 border-y border-border/50"
    >
      <button
        onClick={onPairClick}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-120"
        aria-label="Open pair picker"
      >
        <span className="text-xs font-semibold text-foreground">
          {pair.split('/')[0]}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-1.5">
        {timeframes.map((tf) => (
          <Button
            key={tf}
            variant={timeframe === tf ? "default" : "ghost"}
            size="sm"
            onClick={() => onTimeframeChange(tf)}
            disabled={!candlesEnabled}
            className={`h-7 px-2.5 text-xs font-semibold transition-all duration-120 ${
              timeframe === tf 
                ? "bg-primary text-primary-foreground" 
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
        <Switch
          checked={candlesEnabled}
          onCheckedChange={onCandlesToggle}
          aria-label="Toggle candle chart"
        />
      </div>
    </div>
  );
}
