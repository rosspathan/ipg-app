import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

interface VIPMilestoneExplainerProps {
  directVIPCount: number
  totalTeamVIPCount: number
}

export function VIPMilestoneExplainer({ directVIPCount, totalTeamVIPCount }: VIPMilestoneExplainerProps) {
  return (
    <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-sm">
        <strong>VIP Milestone Requirements:</strong> Only <strong>DIRECT (Level 1)</strong> VIP referrals count toward milestone rewards.
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Direct VIP Referrals (L1):</span>
            <span className="font-bold text-green-600 dark:text-green-400">{directVIPCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total VIP in Team (All Levels):</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{totalTeamVIPCount}</span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
