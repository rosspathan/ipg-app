import { useState } from "react"
import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { ProgramAccessGate } from "@/components/programs/ProgramAccessGate"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrendingUp, Lock, Clock } from "lucide-react"
import { useStaking } from "@/hooks/useStaking"

export default function StakingPage() {
  return (
    <ProgramAccessGate programKey="staking" title="Staking">
      <StakingContent />
    </ProgramAccessGate>
  )
}

function StakingContent() {
  const { stake, staking } = useStaking();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [amount, setAmount] = useState('');

  const stakingPlans = [
    {
      id: 'flexible',
      name: 'Flexible Staking',
      apy: 12,
      minStake: 10,
      lockDays: 0,
      icon: TrendingUp,
      description: 'No lock-in period'
    },
    {
      id: 'locked-30',
      name: 'Locked Staking (30 Days)',
      apy: 25,
      minStake: 100,
      lockDays: 30,
      icon: Lock,
      description: 'Higher rewards'
    },
    {
      id: 'locked-90',
      name: 'Locked Staking (90 Days)',
      apy: 40,
      minStake: 500,
      lockDays: 90,
      icon: Clock,
      description: 'Maximum rewards'
    }
  ];

  const handleStake = () => {
    if (selectedPlan && amount) {
      stake(selectedPlan, Number(amount));
      setSelectedPlan(null);
      setAmount('');
    }
  };

  return (
    <ProgramPageTemplate
      title="Staking"
      subtitle="Earn passive rewards on your BSK"
    >
      <div className="space-y-6">
        {stakingPlans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.id} className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">APY</p>
                  <p className="text-2xl font-bold text-primary">{plan.apy}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Min Stake</p>
                  <p className="text-2xl font-bold">{plan.minStake} BSK</p>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => setSelectedPlan(plan)}
                disabled={staking}
              >
                Stake Now
              </Button>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stake BSK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (BSK)</Label>
              <Input
                type="number"
                placeholder={`Min: ${selectedPlan?.minStake || 0} BSK`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={selectedPlan?.minStake || 0}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum stake: {selectedPlan?.minStake} BSK
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">APY:</span>
                <span className="font-semibold">{selectedPlan?.apy}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lock Period:</span>
                <span className="font-semibold">
                  {selectedPlan?.lockDays === 0 ? 'Flexible' : `${selectedPlan?.lockDays} days`}
                </span>
              </div>
              {amount && Number(amount) >= (selectedPlan?.minStake || 0) && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Est. Annual Return:</span>
                  <span className="font-semibold text-primary">
                    {(Number(amount) * (selectedPlan?.apy / 100)).toFixed(2)} BSK
                  </span>
                </div>
              )}
            </div>
            <Button 
              onClick={handleStake}
              disabled={staking || !amount || Number(amount) < (selectedPlan?.minStake || 0)}
              className="w-full"
            >
              {staking ? 'Processing...' : 'Confirm Stake'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProgramPageTemplate>
  )
}
