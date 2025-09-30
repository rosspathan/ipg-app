import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BarChart3 } from "lucide-react";

export type Timeframe = "1H" | "4H" | "1D" | "1W";

interface CandleToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export function CandleToggle({ 
  enabled, 
  onToggle, 
  timeframe, 
  onTimeframeChange 
}: CandleToggleProps) {
  const timeframes: Timeframe[] = ["1H", "4H", "1D", "1W"];

  return (
    <div 
      className="flex items-center justify-between p-4 bg-card/30 border-y border-border/50"
      data-testid="candle-toggle"
    >
      <div className="flex items-center gap-2 flex-1">
        {timeframes.map((tf) => (
          <Button
            key={tf}
            variant={timeframe === tf ? "default" : "ghost"}
            size="sm"
            onClick={() => onTimeframeChange(tf)}
            disabled={!enabled}
            className={`h-8 px-3 text-xs ${
              timeframe === tf 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            } ${!enabled ? 'opacity-50' : ''}`}
          >
            {tf}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-4">
        <BarChart3 className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="text-sm font-medium">Candles</span>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label="Toggle candle chart"
        />
      </div>
    </div>
  );
}
