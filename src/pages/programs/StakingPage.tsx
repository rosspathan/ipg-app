import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Lock, Clock } from "lucide-react"

export default function StakingPage() {
  return (
    <ProgramAccessGate programKey="staking" title="Staking">
      <StakingContent />
    </ProgramAccessGate>
  )
}

function StakingContent() {
  return (
    <ProgramPageTemplate
      title="Staking"
      subtitle="Earn passive rewards on your BSK"
    >
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Flexible Staking</h3>
              <p className="text-sm text-muted-foreground">No lock-in period</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">APY</p>
              <p className="text-2xl font-bold text-primary">12%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Min Stake</p>
              <p className="text-2xl font-bold">10 BSK</p>
            </div>
          </div>
          <Button className="w-full">Stake Now</Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Locked Staking (30 Days)</h3>
              <p className="text-sm text-muted-foreground">Higher rewards</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">APY</p>
              <p className="text-2xl font-bold text-primary">25%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Min Stake</p>
              <p className="text-2xl font-bold">100 BSK</p>
            </div>
          </div>
          <Button className="w-full">Stake Now</Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Locked Staking (90 Days)</h3>
              <p className="text-sm text-muted-foreground">Maximum rewards</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">APY</p>
              <p className="text-2xl font-bold text-primary">40%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Min Stake</p>
              <p className="text-2xl font-bold">500 BSK</p>
            </div>
          </div>
          <Button className="w-full">Stake Now</Button>
        </Card>
      </div>
    </ProgramPageTemplate>
  )
}
