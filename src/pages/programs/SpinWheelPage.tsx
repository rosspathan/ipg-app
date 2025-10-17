import { useState } from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate"
import { useSpinWheel } from "@/hooks/useSpinWheel"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { History, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function SpinWheelPage() {
  return (
    <ProgramAccessGate programKey="spin_wheel" title="Spin Wheel">
      <SpinWheelContent />
    </ProgramAccessGate>
  )
}

function SpinWheelContent() {
  const { segments, config, loading, executeSpin } = useSpinWheel()
  const [betAmount, setBetAmount] = useState(100)
  const [isSpinning, setIsSpinning] = useState(false)
  const { toast } = useToast()

  const handleSpin = async () => {
    setIsSpinning(true)
    try {
      const result = await executeSpin(betAmount)
      
      toast({
        title: result.payout > 0 ? "You Won! 🎉" : "Try Again",
        description: `${result.winningSegment.label} - ${result.payout > 0 ? `Won ${result.payout} BSK` : 'Better luck next time'}`
      })
    } catch (error: any) {
      toast({
        title: "Spin Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsSpinning(false)
    }
  }

  if (loading) {
    return (
      <ProgramPageTemplate title="Spin Wheel" subtitle="Loading...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </ProgramPageTemplate>
    )
  }

  return (
    <ProgramPageTemplate
      title="Spin Wheel"
      subtitle="Try your luck and win BSK"
      headerActions={
        <Button size="sm" variant="outline">
          <History className="w-4 h-4 mr-1" />
          History
        </Button>
      }
    >
      <div className="space-y-6">
        {config && (
          <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
            <p className="text-sm text-muted-foreground">
              Free Spins Today: {config.user_free_spins_used}/{config.free_spins_per_day}
            </p>
          </div>
        )}

        {/* Bet Amount Selector */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bet Amount</label>
                <div className="flex gap-2 mt-2">
                  {[10, 50, 100, 250, 500, 1000].map(amount => (
                    <Button
                      key={amount}
                      variant={betAmount === amount ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBetAmount(amount)}
                    >
                      ₹{amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Segments Display */}
              {segments.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {segments.map(seg => (
                    <div 
                      key={seg.id} 
                      className="p-3 rounded-lg border text-center"
                      style={{ borderColor: seg.color_hex }}
                    >
                      <div className="text-xs text-muted-foreground">{seg.label}</div>
                      <div className="font-bold">{seg.multiplier}x</div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleSpin}
                disabled={isSpinning}
                className="w-full"
                size="lg"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  `Spin for ${betAmount} BSK`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProgramPageTemplate>
  )
}
