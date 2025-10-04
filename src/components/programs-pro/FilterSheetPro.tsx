import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"

interface FilterSheetProProps {
  isOpen: boolean
  onClose: () => void
  onReset: () => void
}

export function FilterSheetPro({ isOpen, onClose, onReset }: FilterSheetProProps) {
  const [status, setStatus] = React.useState<string[]>(["active"])
  const [region, setRegion] = React.useState("global")
  const [volatility, setVolatility] = React.useState(false)
  const [rewardRange, setRewardRange] = React.useState([0, 50000])
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom"
        className="rounded-t-3xl border-t border-border/50 max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading text-lg">
              Refine Filters
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="space-y-6 pb-safe">
          {/* Status */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Status</Label>
            <div className="flex gap-2">
              {["active", "new", "hot"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(prev => 
                    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                  )}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    status.includes(s)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          {/* Region */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Region</Label>
            <div className="flex gap-2">
              {["global", "asia", "europe", "americas"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    region === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          
          {/* Reward Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Reward Range</Label>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                ₹{rewardRange[0]} - ₹{rewardRange[1]}
              </span>
            </div>
            <Slider
              min={0}
              max={50000}
              step={1000}
              value={rewardRange}
              onValueChange={setRewardRange}
              className="w-full"
            />
          </div>
          
          {/* Volatility Mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Volatility Mode</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Show high-risk, high-reward programs
              </p>
            </div>
            <Switch
              checked={volatility}
              onCheckedChange={setVolatility}
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onReset()
                setStatus(["active"])
                setRegion("global")
                setVolatility(false)
                setRewardRange([0, 50000])
              }}
            >
              Reset
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={onClose}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
