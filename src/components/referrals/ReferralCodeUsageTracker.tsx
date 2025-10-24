import { useAuthUser } from "@/hooks/useAuthUser"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, CheckCircle, Clock, Award, ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ReferralStatus {
  user_id: string
  display_name: string
  username: string
  first_touch_at: string
  locked_at: string | null
  current_badge: string | null
  purchased_at: string | null
}

export function ReferralCodeUsageTracker() {
  const { user } = useAuthUser()

  const { data, isLoading } = useQuery({
    queryKey: ['referral-code-usage', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      // Get user's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single()

      if (!profile?.referral_code) return null

      // Get all referral links where this user is the sponsor
      const { data: referrals } = await supabase
        .from('referral_links_new')
        .select('user_id, first_touch_at, locked_at, sponsor_code_used')
        .eq('sponsor_id', user.id)
        .order('first_touch_at', { ascending: false })

      if (!referrals || referrals.length === 0) {
        return { 
          referralCode: profile.referral_code, 
          statuses: [],
          totalClicks: 0,
          totalRegistered: referrals?.length || 0,
          totalCompleted: 0,
          totalVIP: 0
        }
      }

      const userIds = referrals.map(r => r.user_id)

      // Get profile details
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', userIds)

      // Get badge holdings
      const { data: badges } = await supabase
        .from('user_badge_holdings')
        .select('user_id, current_badge, purchased_at')
        .in('user_id', userIds)

      // Combine data
      const statuses: ReferralStatus[] = referrals.map(ref => {
        const profile = profiles?.find(p => p.user_id === ref.user_id)
        const badge = badges?.find(b => b.user_id === ref.user_id)
        
        return {
          user_id: ref.user_id,
          display_name: profile?.display_name || 'Unknown User',
          username: profile?.username || '',
          first_touch_at: ref.first_touch_at,
          locked_at: ref.locked_at,
          current_badge: badge?.current_badge || null,
          purchased_at: badge?.purchased_at || null
        }
      })

      const totalCompleted = statuses.filter(s => s.locked_at).length
      const totalVIP = statuses.filter(s => {
        const badge = s.current_badge?.toUpperCase() || ''
        return badge.includes('VIP') || badge.includes('SMART')
      }).length

      return {
        referralCode: profile.referral_code,
        statuses,
        totalClicks: referrals.length,
        totalRegistered: referrals.length,
        totalCompleted,
        totalVIP
      }
    },
    enabled: !!user?.id
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const completedAndVIP = data.statuses.filter(s => s.locked_at && s.current_badge)
  const completedNoVIP = data.statuses.filter(s => s.locked_at && !s.current_badge)
  const registered = data.statuses.filter(s => !s.locked_at)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Referral Code Usage Tracker
        </CardTitle>
        <CardDescription>
          Track who used your code: {data.referralCode}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{data.totalRegistered}</p>
            <p className="text-xs text-muted-foreground">Registered</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.totalCompleted}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.totalVIP}</p>
            <p className="text-xs text-muted-foreground">VIP Buyers</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-primary">{data.totalRegistered - data.totalCompleted}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({data.totalRegistered})</TabsTrigger>
            <TabsTrigger value="vip">VIP ({completedAndVIP.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({data.totalCompleted})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({registered.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-2">
            {data.statuses.length > 0 ? (
              data.statuses.map(status => (
                <ReferralStatusCard key={status.user_id} status={status} />
              ))
            ) : (
              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  No one has used your referral code yet. Share your code to start building your team!
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="vip" className="space-y-2">
            {completedAndVIP.length > 0 ? (
              completedAndVIP.map(status => (
                <ReferralStatusCard key={status.user_id} status={status} />
              ))
            ) : (
              <Alert>
                <Award className="h-4 w-4" />
                <AlertDescription>
                  None of your referrals have purchased VIP badges yet.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-2">
            {data.statuses.filter(s => s.locked_at).map(status => (
              <ReferralStatusCard key={status.user_id} status={status} />
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-2">
            {registered.length > 0 ? (
              registered.map(status => (
                <ReferralStatusCard key={status.user_id} status={status} />
              ))
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All users who registered have completed their setup!
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ReferralStatusCard({ status }: { status: ReferralStatus }) {
  const isCompleted = !!status.locked_at
  const isVIP = status.current_badge?.toUpperCase().includes('VIP') || 
                status.current_badge?.toUpperCase().includes('SMART')

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-2 h-2 rounded-full ${
          isCompleted ? 'bg-green-500' : 'bg-yellow-500'
        }`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{status.display_name}</p>
          <p className="text-xs text-muted-foreground">@{status.username || 'username'}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isVIP && (
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <Award className="w-3 h-3 mr-1" />
            VIP
          </Badge>
        )}
        {isCompleted ? (
          <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete
          </Badge>
        ) : (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )}
      </div>
    </div>
  )
}
