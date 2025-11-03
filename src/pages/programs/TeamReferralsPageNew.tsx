import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"
import { Users, Copy, TrendingUp, Gift, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"

export default function TeamReferralsPageNew() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data.user
    }
  })

  const { data: referralData, isLoading } = useQuery({
    queryKey: ['referral-data', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { data: link } = await supabase
        .from('referral_links_new')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      const { data: settings } = await supabase
        .from('team_referral_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      return { link, settings }
    },
    enabled: !!user?.id
  })

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single()
      return data
    },
    enabled: !!user?.id
  })

  const referralCode = profile?.referral_code || user?.id?.slice(0, 8).toUpperCase()

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard"
    })
  }

  const handleShare = async () => {
    const shareText = `Join me on IPG I-SMART! Use my referral code: ${referralCode}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join IPG I-SMART',
          text: shareText
        })
      } catch (err) {
        handleCopyCode()
      }
    } else {
      handleCopyCode()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Team Referrals</h1>
          <p className="text-muted-foreground">Invite friends and earn rewards together</p>
        </div>

        {/* Referral Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Your Referral Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Share this code</p>
              <div className="text-4xl font-bold text-primary tracking-widest mb-4 font-mono">
                {referralCode}
              </div>
              <Button onClick={handleCopyCode} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>
            <Button onClick={handleShare} className="w-full" size="lg">
              <Share2 className="w-4 h-4 mr-2" />
              Share Code
            </Button>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {referralData?.link?.total_referrals || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Referrals</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-green-500">
                  {Number(referralData?.link?.total_commissions || 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Earned (BSK)</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Commission Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-medium">Direct Referrals</span>
                </div>
                <Badge variant="secondary">
                  {referralData?.settings?.direct_commission_percent || 10}%
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground p-3 rounded-lg bg-card/50 border">
                <p className="mb-2">
                  💰 Earn {referralData?.settings?.direct_commission_percent || 10}% commission 
                  on your direct referrals' activities
                </p>
                <p>
                  🎁 Bonus rewards when your team reaches milestones
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No referral activity yet</p>
              <p className="text-sm mt-1">Share your code to get started!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
