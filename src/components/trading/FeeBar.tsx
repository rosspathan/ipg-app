import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FeeBarProps {
  makerFee: number;
  takerFee: number;
  feeAsset: string;
  onLearnMore?: () => void;
}

export function FeeBar({ makerFee, takerFee, feeAsset, onLearnMore }: FeeBarProps) {
  return (
    <Card 
      className="p-3 bg-muted/20 border-border/50 flex items-center justify-between"
      data-testid="fees-bar"
    >
      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">Maker Fee:</span>
          <span className="font-bold ml-1 text-primary">{makerFee}%</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div>
          <span className="text-muted-foreground">Taker Fee:</span>
          <span className="font-bold ml-1 text-primary">{takerFee}%</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div>
          <span className="text-muted-foreground">Fee Asset:</span>
          <span className="font-bold ml-1">{feeAsset}</span>
        </div>
      </div>

      {onLearnMore && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs"
          onClick={onLearnMore}
        >
          <Info className="h-3 w-3 mr-1" />
          Learn More
        </Button>
      )}
    </Card>
  );
}
