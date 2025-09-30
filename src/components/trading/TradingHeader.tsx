import { ArrowLeft, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface TradingHeaderProps {
  pair: string;
  mode: "LIVE" | "SIM";
  onFilterClick?: () => void;
}

export function TradingHeader({ pair, mode, onFilterClick }: TradingHeaderProps) {
  const navigate = useNavigate();

  return (
    <div 
      className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-background to-background/95 backdrop-blur-sm sticky top-0 z-40"
      data-testid="trading-header"
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/app/home")}
          className="hover:bg-primary/10 transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {pair}
          </h1>
          <Badge 
            variant={mode === "LIVE" ? "default" : "secondary"}
            className="text-xs mt-1 h-5"
          >
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${mode === "LIVE" ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
            {mode} Mode
          </Badge>
        </div>
      </div>
      
      {onFilterClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onFilterClick}
          className="hover:bg-primary/10 transition-colors"
          aria-label="Filter pairs"
        >
          <Filter className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
