import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FeesBarProps {
  makerFee: number;
  takerFee: number;
  feeAsset?: string;
  bskDiscount?: number;
  onLearnMore?: () => void;
}

export function FeesBar({ 
  makerFee, 
  takerFee, 
  feeAsset = "BSK",
  bskDiscount,
  onLearnMore 
}: FeesBarProps) {
  return (
    <Card 
      data-testid="fees-bar"
      className="bg-card/30 border border-border/50 p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Info className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="text-xs">
            <span className="text-muted-foreground">Fees: </span>
            <span className="font-semibold text-foreground">
              Maker {makerFee.toFixed(2)}%
            </span>
            <span className="text-muted-foreground"> • </span>
            <span className="font-semibold text-foreground">
              Taker {takerFee.toFixed(2)}%
            </span>
            {bskDiscount && (
              <>
                <span className="text-muted-foreground"> • </span>
                <span className="font-semibold text-success">
                  {bskDiscount}% off with {feeAsset}
                </span>
              </>
            )}
          </div>
        </div>
        {onLearnMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLearnMore}
            className="h-7 px-2 text-xs font-medium"
          >
            Learn More
          </Button>
        )}
      </div>
    </Card>
  );
}
