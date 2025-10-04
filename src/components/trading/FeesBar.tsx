import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeesBarProps {
  makerFee: number
  takerFee: number
  feeToken?: string
  discount?: number
  onViewFees?: () => void
}

export function FeesBar({ makerFee, takerFee, feeToken = "USDT", discount, onViewFees }: FeesBarProps) {
  return (
    <div data-testid="fees-bar" className="px-4 py-3 bg-card/40 border-t border-border/30 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>
            Fees: <span className="font-semibold text-foreground">Maker {makerFee}%</span>
            {" • "}
            <span className="font-semibold text-foreground">Taker {takerFee}%</span>
            {discount && (
              <span className="ml-1 text-success">({discount}% BSK discount)</span>
            )}
          </span>
        </div>
        {onViewFees && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewFees}
            className="h-7 px-3 text-xs font-semibold transition-all duration-220 hover:scale-105 active:scale-95"
          >
            Learn More
          </Button>
        )}
      </div>
    </div>
  )
}
