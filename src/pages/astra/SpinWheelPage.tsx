import * as React from "react"
import { Zap, History, Lock, Coins, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AstraCard } from "@/components/astra/AstraCard"
import { KPIChip } from "@/components/astra/KPIChip"
import { ProgressRing } from "@/components/ui/progress-ring"
import { cn } from "@/lib/utils"

// Mock spin wheel data
const MOCK_DATA = {
  freeSpins: 3,
  maxFreeSpins: 5,
  betFee: 10, // BSK
  minBet: 100, // INR
  maxBet: 1000, // INR
  bskRate: 12.45, // INR per BSK
}

const WHEEL_SEGMENTS = [
  { label: "WIN ×2", color: "success", multiplier: 2 },
  { label: "LOSE", color: "danger", multiplier: 0 },
  { label: "WIN ×2", color: "success", multiplier: 2 },
  { label: "LOSE", color: "danger", multiplier: 0 },
]

export function SpinWheelPage() {
  const [betAmount, setBetAmount] = React.useState(500)
  const [isSpinning, setIsSpinning] = React.useState(false)
  const [spinHistory, setSpinHistory] = React.useState<any[]>([])

  const hasFreeSpins = MOCK_DATA.freeSpins > 0
  const bskEquivalent = betAmount / MOCK_DATA.bskRate

  const handleSpin = async () => {
    if (isSpinning) return
    
    setIsSpinning(true)
    
    // Mock spin animation (3 seconds)
    setTimeout(() => {
      const isWin = Math.random() > 0.5
      const result = {
        amount: betAmount,
        isWin,
        multiplier: isWin ? 2 : 0,
        timestamp: new Date(),
        isFree: hasFreeSpins
      }
      
      setSpinHistory(prev => [result, ...prev.slice(0, 9)])
      setIsSpinning(false)
      
      // Update free spins if used
      if (hasFreeSpins) {
        MOCK_DATA.freeSpins -= 1
      }
    }, 3000)
  }

  return (
    <div className="space-y-6 p-4" data-testid="page-spin-wheel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">i-SMART Spin</h2>
          <p className="text-sm text-muted-foreground mt-1">Test your luck with provably fair spins</p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="border-accent/30 text-accent hover:bg-accent/10"
        >
          <History className="h-4 w-4 mr-2" />
          History
        </Button>
      </div>

      {/* Free Spins Counter */}
      <AstraCard variant="glass">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ProgressRing 
              progress={(MOCK_DATA.freeSpins / MOCK_DATA.maxFreeSpins) * 100}
              size={60}
              strokeWidth={6}
              className="text-accent"
            />
            <div>
              <div className="font-semibold text-lg">Free Spins</div>
              <div className="text-sm text-text-secondary">
                {MOCK_DATA.freeSpins} of {MOCK_DATA.maxFreeSpins} remaining
              </div>
            </div>
          </div>
          
          {!hasFreeSpins && (
            <KPIChip
              variant="warning"
              icon={<Lock className="h-3 w-3" />}
              value="₹10 BSK"
              label="Fee"
              size="sm"
            />
          )}
        </div>
      </AstraCard>

      {/* Wheel Animation Area */}
      <AstraCard variant="elevated" className="relative overflow-hidden">
        <div className="aspect-square p-8 flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
          {/* Simplified wheel representation */}
          <div className={cn(
            "relative w-48 h-48 rounded-full border-4 border-border-subtle bg-card-secondary transition-transform duration-[3000ms] ease-out",
            isSpinning && "rotate-[1800deg]"
          )}>
            {/* Wheel segments */}
            {WHEEL_SEGMENTS.map((segment, index) => (
              <div
                key={index}
                className={cn(
                  "absolute inset-0 rounded-full flex items-center justify-center text-xs font-semibold",
                  segment.color === "success" && "text-success",
                  segment.color === "danger" && "text-danger"
                )}
                style={{
                  transform: `rotate(${index * 90}deg)`,
                  clipPath: `polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)`,
                  background: segment.color === "success" 
                    ? "linear-gradient(45deg, rgba(43, 214, 123, 0.1), rgba(43, 214, 123, 0.05))"
                    : "linear-gradient(45deg, rgba(255, 92, 92, 0.1), rgba(255, 92, 92, 0.05))"
                }}
              >
                <span style={{ transform: `rotate(-${index * 90}deg) translateY(-60px)` }}>
                  {segment.label}
                </span>
              </div>
            ))}
            
            {/* Center pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-accent z-10" />
            
            {/* Center circle */}
            <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full border-2 border-background z-10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        </div>
      </AstraCard>

      {/* Bet Controls */}
      <AstraCard variant="elevated">
        <div className="p-6 space-y-4">
          <div className="mb-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">Place Your Bet</h3>
            <p className="text-sm text-muted-foreground mt-1">{hasFreeSpins ? "Use your free spin or place a bet" : "Choose your bet amount"}</p>
          </div>

          {/* Bet Amount Slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Amount (INR)</span>
              <span className="font-mono">₹{betAmount}</span>
            </div>
            
            <input
              type="range"
              min={MOCK_DATA.minBet}
              max={MOCK_DATA.maxBet}
              step={50}
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer slider"
              disabled={isSpinning}
            />
            
            <div className="flex justify-between text-xs text-text-secondary">
              <span>₹{MOCK_DATA.minBet}</span>
              <span>₹{MOCK_DATA.maxBet}</span>
            </div>
          </div>

          {/* Bet Equivalent */}
          <div className="bg-background-secondary/30 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">BSK Equivalent</span>
              <span className="font-mono">{bskEquivalent.toFixed(4)} BSK</span>
            </div>
            {!hasFreeSpins && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Spin Fee</span>
                <span className="font-mono text-warning">{MOCK_DATA.betFee} BSK</span>
              </div>
            )}
          </div>

          {/* Quick Bet Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[100, 250, 500, 1000].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(amount)}
                className={cn(
                  "h-8 text-xs border-border-subtle",
                  betAmount === amount && "border-primary bg-primary/10"
                )}
                disabled={isSpinning}
              >
                ₹{amount}
              </Button>
            ))}
          </div>

          {/* Spin Button */}
          <Button
            onClick={handleSpin}
            disabled={isSpinning}
            className={cn(
              "w-full h-12 text-base font-semibold",
              hasFreeSpins 
                ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {isSpinning ? (
              <RotateCw className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Zap className="h-5 w-5 mr-2" />
            )}
            {isSpinning ? "Spinning..." : hasFreeSpins ? "FREE SPIN" : "SPIN NOW"}
          </Button>
        </div>
      </AstraCard>

      {/* Provably Fair */}
      <AstraCard variant="glass">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
              <Coins className="h-4 w-4 text-success" />
            </div>
            <div>
              <div className="font-medium text-sm">Provably Fair</div>
              <div className="text-xs text-text-secondary">Verifiable randomness</div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full border-success/30 text-success hover:bg-success/10"
          >
            View Proof & Seeds
          </Button>
        </div>
      </AstraCard>

      {/* Recent Spins */}
      {spinHistory.length > 0 && (
        <AstraCard variant="elevated">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="font-heading text-lg font-semibold text-foreground">Recent Spins</h3>
              <p className="text-sm text-muted-foreground mt-1">Your last few spin results</p>
            </div>
            
            <div className="space-y-2">
              {spinHistory.slice(0, 5).map((spin, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 bg-background-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      spin.isWin ? "bg-success" : "bg-danger"
                    )} />
                    <span className="text-sm font-mono">₹{spin.amount}</span>
                    {spin.isFree && (
                      <KPIChip variant="accent" value="FREE" size="sm" />
                    )}
                  </div>
                  
                  <div className={cn(
                    "text-sm font-semibold",
                    spin.isWin ? "text-success" : "text-danger"
                  )}>
                    {spin.isWin ? `+₹${spin.amount * spin.multiplier}` : "LOSE"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AstraCard>
      )}
    </div>
  )
}

      {/* Custom slider styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: hsl(var(--primary));
            cursor: pointer;
            box-shadow: 0 0 8px rgba(136, 83, 255, 0.4);
          }

          .slider::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: hsl(var(--primary));
            cursor: pointer;
            border: none;
            box-shadow: 0 0 8px rgba(136, 83, 255, 0.4);
          }
        `
      }} />