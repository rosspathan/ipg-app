import { ProgramPageTemplate } from "@/components/programs-pro/ProgramPageTemplate"
import { Card, CardContent } from "@/components/ui/card"
import { useReferralCommissionHistory } from "@/hooks/useReferralCommissionHistory"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, Calendar, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export default function CommissionHistory() {
  const { data, isLoading } = useReferralCommissionHistory()
  const entries = data?.entries || []
  const stats = data?.stats || { totalEarned: 0, activeLevels: 0, topLevel: 0, thisMonth: 0 }

  if (isLoading) {
    return (
      <ProgramPageTemplate title="Commission History" subtitle="Your earnings timeline">
        <div className="space-y-4 pb-24">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </ProgramPageTemplate>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <ProgramPageTemplate title="Commission History" subtitle="Your earnings timeline">
        <div className="pb-24">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              No commission history yet. Start referring people to earn commissions!
            </AlertDescription>
          </Alert>
        </div>
      </ProgramPageTemplate>
    )
  }

  // Group entries by month
  const groupedByMonth = entries.reduce((acc, entry) => {
    const monthKey = format(new Date(entry.created_at), 'MMMM yyyy')
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(entry)
    return acc
  }, {} as Record<string, Array<typeof entries[0]>>)

  return (
    <ProgramPageTemplate 
      title="Commission History" 
      subtitle={`${stats.totalEarned.toFixed(0)} BSK earned across ${stats.activeLevels} levels`}
    >
      <div className="space-y-6 pb-24">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.totalEarned.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total BSK</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{stats.activeLevels}</p>
              <p className="text-xs text-muted-foreground mt-1">Active Levels</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.topLevel}</p>
              <p className="text-xs text-muted-foreground mt-1">Top Level</p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {Object.entries(groupedByMonth).map(([month, monthEntries]) => (
            <div key={month} className="space-y-3">
              {/* Month Header */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 border-b">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">{month}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {monthEntries.length} transactions
                  </Badge>
                </div>
              </div>

              {/* Month Entries */}
              <div className="space-y-2">
                {monthEntries.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm truncate">
                              {entry.payer_display_name || 'Unknown'}
                            </span>
                            <Badge variant="outline" className="ml-auto shrink-0">
                              L{entry.level}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            @{entry.payer_username || entry.payer_id}
                          </p>
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            +{entry.bsk_amount.toFixed(0)}
                          </p>
                          <p className="text-xs text-muted-foreground">BSK</p>
                          <Badge 
                            variant={entry.destination === 'withdrawable' ? 'default' : 'secondary'}
                            className="mt-1"
                          >
                            {entry.destination === 'withdrawable' ? 'Withdrawable' : 'Held'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProgramPageTemplate>
  )
}
