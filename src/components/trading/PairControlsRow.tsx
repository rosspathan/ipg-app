import { BarChart3, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
      className="flex items-center gap-2 px-4 py-3 bg-card/40 border-b border-border/30 animate-fade-in" 
      style={{ animationDelay: '120ms' }}
    >
      {/* Pair Selector */}
      <Button
        variant="outline"
        size="sm"
        onClick={onPairClick}
        className="h-10 px-4 gap-2 transition-all duration-220 hover:scale-[1.02] active:scale-[0.98] hover:bg-card/80 hover:border-primary/40"
      >
        <span className="text-sm font-bold">{pair.split('/')[0]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>

      {/* Timeframe Chips */}
      <div className="flex gap-1.5 flex-1">
        {timeframes.map((tf, idx) => (
          <Button
            key={tf}
            variant="ghost"
            size="sm"
            onClick={() => onTimeframeChange(tf)}
            disabled={!candlesEnabled}
            className={cn(
              "h-10 px-3 text-xs font-bold transition-all duration-220",
              "hover:scale-[1.05] active:scale-[0.95]",
              timeframe === tf 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                : "hover:bg-card/80 text-muted-foreground",
              !candlesEnabled && "opacity-40"
            )}
            style={{ animationDelay: `${160 + idx * 40}ms` }}
          >
            {tf}
          </Button>
        ))}
      </div>

      {/* Candles Toggle */}
      <div data-testid="candle-toggle" className="flex items-center gap-2 pl-2 border-l border-border/40">
        <Switch
          id="candles"
          checked={candlesEnabled}
          onCheckedChange={onCandlesToggle}
          className="data-[state=checked]:bg-primary transition-all duration-220"
        />
        <Label htmlFor="candles" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors duration-220 hover:text-foreground">
          <BarChart3 className={cn(
            "h-3.5 w-3.5 transition-all duration-220",
            candlesEnabled && "text-primary"
          )} />
          <span className="hidden sm:inline">Candles</span>
        </Label>
      </div>
    </div>
  );
}
