import { ChevronLeft, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PairHeaderProProps {
  pair: string;
  mode: "LIVE" | "SIM";
  isFavorite?: boolean;
  onBack?: () => void;
  onToggleFavorite: () => void;
  onOpenPairPicker: () => void;
}

export function PairHeaderPro({
  pair,
  mode,
  isFavorite = false,
  onBack,
  onToggleFavorite,
  onOpenPairPicker
}: PairHeaderProProps) {
  return (
    <header 
      data-testid="pair-header"
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-9 w-9 p-0"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        <button
          onClick={onOpenPairPicker}
          className="flex-1 flex items-center gap-2 h-10 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-120"
          aria-label="Open pair picker"
        >
          <span className="text-lg font-bold tracking-tight text-foreground">
            {pair}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        <Badge 
          variant={mode === "LIVE" ? "default" : "secondary"}
          className="h-7 px-2.5 text-xs font-semibold"
        >
          {mode === "LIVE" ? "🔴 LIVE" : "🟣 SIM"}
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFavorite}
          className="h-9 w-9 p-0"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star 
            className={`h-5 w-5 transition-all duration-220 ${
              isFavorite 
                ? "fill-yellow-500 text-yellow-500" 
                : "text-muted-foreground hover:text-yellow-500"
            }`} 
          />
        </Button>
      </div>
    </header>
  );
}
