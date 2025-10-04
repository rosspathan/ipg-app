import * as React from "react"
import { Zap, History, Lock, Coins, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AstraCard } from "@/components/astra/AstraCard"
import { KPIChip } from "@/components/astra/KPIChip"
import { ProgressRing } from "@/components/ui/progress-ring"
import { PremiumSpinWheel } from "@/components/premium-wheel/PremiumSpinWheel"
import { BacklinkBar } from "@/components/programs-pro/BacklinkBar"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

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
  { 
    id: "win-1", 
    label: "WIN ×2", 
    multiplier: 2, 
    weight: 25,
    color_hex: "#2BD67B"
  },
  { 
    id: "lose-1", 
    label: "LOSE", 
    multiplier: 0, 
    weight: 25,
    color_hex: "#FF5C5C"
  },
  { 
    id: "win-2", 
    label: "WIN ×3", 
    multiplier: 3, 
    weight: 15,
    color_hex: "#FFB800"
  },
  { 
    id: "lose-2", 
    label: "LOSE", 
    multiplier: 0, 
    weight: 25,
    color_hex: "#FF5C5C"
  },
  { 
    id: "win-3", 
    label: "WIN ×2", 
    multiplier: 2, 
    weight: 25,
    color_hex: "#2BD67B"
  },
  { 
    id: "lose-3", 
    label: "LOSE", 
    multiplier: 0, 
    weight: 25,
    color_hex: "#FF5C5C"
  },
  { 
    id: "jackpot", 
    label: "WIN ×5", 
    multiplier: 5, 
    weight: 5,
    color_hex: "#8853FF"
  },
  { 
    id: "lose-4", 
    label: "LOSE", 
    multiplier: 0, 
    weight: 25,
    color_hex: "#FF5C5C"
  },
]

export function SpinWheelPage() {
  const navigate = useNavigate()
  const [betAmount, setBetAmount] = React.useState(500)
  const [isSpinning, setIsSpinning] = React.useState(false)
  const [winningSegmentIndex, setWinningSegmentIndex] = React.useState<number>()
  const [showParticles, setShowParticles] = React.useState(false)
  const [particleType, setParticleType] = React.useState<'win' | 'lose'>('win')
  const [spinHistory, setSpinHistory] = React.useState<any[]>([])

  const hasFreeSpins = MOCK_DATA.freeSpins > 0
  const bskEquivalent = betAmount / MOCK_DATA.bskRate

  const handleSpin = async () => {
    if (isSpinning) return
    
    setIsSpinning(true)
    setShowParticles(false)
    setWinningSegmentIndex(undefined)
    
    // Simulate server response delay
    setTimeout(() => {
      // Weighted random selection based on segment weights
      const totalWeight = WHEEL_SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0)
      let random = Math.random() * totalWeight
      let selectedIndex = 0
      
      for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
        random -= WHEEL_SEGMENTS[i].weight
        if (random <= 0) {
          selectedIndex = i
          break
        }
      }
      
      const winningSegment = WHEEL_SEGMENTS[selectedIndex]
      setWinningSegmentIndex(selectedIndex)
      
      const isWin = winningSegment.multiplier > 0
      const result = {
        amount: betAmount,
        isWin,
        multiplier: winningSegment.multiplier,
        segmentLabel: winningSegment.label,
        timestamp: new Date(),
        isFree: hasFreeSpins
      }
      
      setParticleType(isWin ? 'win' : 'lose')
      
      // Update free spins if used
      if (hasFreeSpins) {
        MOCK_DATA.freeSpins -= 1
      }
    }, 500)
  }

  const handleSpinComplete = () => {
    if (winningSegmentIndex !== undefined) {
      const winningSegment = WHEEL_SEGMENTS[winningSegmentIndex]
      const isWin = winningSegment.multiplier > 0
      
      const result = {
        amount: betAmount,
        isWin,
        multiplier: winningSegment.multiplier,
        segmentLabel: winningSegment.label,
        timestamp: new Date(),
        isFree: hasFreeSpins
      }
      
      setSpinHistory(prev => [result, ...prev.slice(0, 9)])
      setShowParticles(true)
      setIsSpinning(false)
      
      // Hide particles after 2 seconds
      setTimeout(() => {
        setShowParticles(false)
      }, 2000)
    }
  }

  return (
    <div data-testid="page-spin-wheel" className="min-h-screen bg-background pb-8">
      {/* Backlink */}
      <BacklinkBar programName="i-SMART Spin" />
      
      <div className="space-y-6 p-4">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground">Test your luck with provably fair spins</p>
        
        <Button
          variant="outline"
          size="sm"
          className="border-accent/30 text-accent hover:bg-accent/10 ml-auto"
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
      <AstraCard variant="elevated" className="relative overflow-visible">
        <div className="p-6">
          <PremiumSpinWheel
            segments={WHEEL_SEGMENTS}
            isSpinning={isSpinning}
            winningSegmentIndex={winningSegmentIndex}
            onSpinComplete={handleSpinComplete}
            showParticles={showParticles}
            particleType={particleType}
          />
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
                    {spin.isWin ? `${spin.segmentLabel} (+₹${spin.amount * spin.multiplier})` : spin.segmentLabel}
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