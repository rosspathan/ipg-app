import { Badge } from "@/components/ui/badge"
import { Circle, Users, TrendingUp, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProgramStatusIndicatorProps {
  status: 'live' | 'draft' | 'paused' | 'archived'
  participantCount?: number
  revenue?: number
  className?: string
  showMetrics?: boolean
}

export function ProgramStatusIndicator({ 
  status, 
  participantCount = 0, 
  revenue = 0,
  className,
  showMetrics = false 
}: ProgramStatusIndicatorProps) {
  
  const statusConfig = {
    live: {
      label: 'Live',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      dot: 'bg-green-500',
    },
    draft: {
      label: 'Draft',
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      dot: 'bg-yellow-500',
    },
    paused: {
      label: 'Paused',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      dot: 'bg-orange-500',
    },
    archived: {
      label: 'Archived',
      color: 'text-gray-500',
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
      dot: 'bg-gray-500',
    },
  }

  const config = statusConfig[status]

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1.5 px-2.5 py-1",
          config.bg,
          config.border,
          config.color
        )}
      >
        <Circle className={cn("w-2 h-2 fill-current", config.dot)} />
        {config.label}
      </Badge>

      {showMetrics && status === 'live' && (
        <>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span className="font-medium">{participantCount.toLocaleString()}</span>
          </div>
          
          {revenue > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-green-500">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="font-medium">${revenue.toLocaleString()}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
