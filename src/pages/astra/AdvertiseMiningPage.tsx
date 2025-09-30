import * as React from "react"
import { Play, Clock, Gift, Calendar, Target, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AstraCard } from "@/components/astra/AstraCard"
import { KPIChip } from "@/components/astra/KPIChip"
import { ProgressRing } from "@/components/ui/progress-ring"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

// Mock data
const MOCK_DATA = {
  freeDailyProgress: 75, // percentage
  nextRewardTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
  subscriptions: [
    {
      id: "basic",
      price: 100,
      duration: 100,
      dailyCoins: 2,
      daysLeft: 45,
      isActive: true
    },
    {
      id: "premium",
      price: 500,
      duration: 100,
      dailyCoins: 12,
      daysLeft: 0,
      isActive: false
    },
    {
      id: "vip",
      price: 1000,
      duration: 100,
      dailyCoins: 25,
      daysLeft: 0,
      isActive: false
    }
  ]
}

export function AdvertiseMiningPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState<"daily" | "subscriptions">("daily")
  const [isWatching, setIsWatching] = React.useState(false)

  const formatTimeLeft = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    
    if (diff <= 0) return "Available now"
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  const handleWatchAd = () => {
    setIsWatching(true)
    // Mock ad watching process
    setTimeout(() => {
      setIsWatching(false)
      // Add reward logic here
    }, 30000) // 30 second mock ad
  }

  const handleSubscriptionPurchase = (subscriptionId: string) => {
    // Mock subscription purchase
    console.log("Purchasing subscription:", subscriptionId)
  }

  return (
    <div className="space-y-6 p-4" data-testid="page-advertise-mining">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/app/home")}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Advertise Mining</h2>
          <p className="text-sm text-muted-foreground mt-1">Earn BSK by watching ads and subscribing</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-card-secondary/50 p-1 rounded-lg">
        <Button
          variant={activeTab === "daily" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("daily")}
          className={cn(
            "flex-1 h-10 font-medium",
            activeTab === "daily" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "hover:bg-background-secondary/50"
          )}
        >
          Free Daily
        </Button>
        <Button
          variant={activeTab === "subscriptions" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("subscriptions")}
          className={cn(
            "flex-1 h-10 font-medium",
            activeTab === "subscriptions" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "hover:bg-background-secondary/50"
          )}
        >
          Subscriptions
        </Button>
      </div>

      {/* Free Daily Tab */}
      {activeTab === "daily" && (
        <div className="space-y-4">
          {/* Daily Progress Card */}
          <AstraCard variant="elevated">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Daily Ad Rewards</h3>
                  <p className="text-sm text-text-secondary">Watch ads to earn BSK</p>
                </div>
                
                <ProgressRing 
                  progress={MOCK_DATA.freeDailyProgress}
                  size={80}
                  strokeWidth={8}
                  className="text-accent"
                />
              </div>

              {/* Next Reward Timer */}
              <div className="bg-background-secondary/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <div className="font-medium">Next Reward Available</div>
                    <div className="text-sm text-text-secondary">
                      {formatTimeLeft(MOCK_DATA.nextRewardTime)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Watch Ad Button */}
              <Button
                onClick={handleWatchAd}
                disabled={isWatching || MOCK_DATA.nextRewardTime > new Date()}
                className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isWatching ? (
                  <>
                    <Target className="h-5 w-5 mr-2 animate-pulse" />
                    Watching Ad... (30s)
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Watch Ad & Earn
                  </>
                )}
              </Button>

              {/* Reward Info */}
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-text-secondary">
                <Gift className="h-4 w-4" />
                <span>Rewards go to BSK Holding balance</span>
              </div>
            </div>
          </AstraCard>

          {/* Daily Stats */}
          <div className="grid grid-cols-2 gap-4">
            <AstraCard variant="glass">
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-accent mb-1">12</div>
                <div className="text-xs text-text-secondary">Ads Watched Today</div>
              </div>
            </AstraCard>
            
            <AstraCard variant="glass">
              <div className="p-4 text-center">
                <div className="text-2xl font-bold text-success mb-1">24.5</div>
                <div className="text-xs text-text-secondary">BSK Earned Today</div>
              </div>
            </AstraCard>
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {MOCK_DATA.subscriptions.map((sub) => (
            <AstraCard 
              key={sub.id}
              variant={sub.isActive ? "neon" : "elevated"}
              className={sub.isActive ? "ring-2 ring-accent/50" : ""}
            >
              <div className="p-6">
                {/* Subscription Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg capitalize">{sub.id} Plan</h3>
                    <p className="text-sm text-text-secondary">100-day subscription</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold">₹{sub.price}</div>
                    <div className="text-xs text-text-secondary">One-time</div>
                  </div>
                </div>

                {/* Plan Details */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-background-secondary/30 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-accent">{sub.dailyCoins}</div>
                    <div className="text-xs text-text-secondary">BSK/Day</div>
                  </div>
                  
                  <div className="bg-background-secondary/30 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold">{sub.duration}</div>
                    <div className="text-xs text-text-secondary">Days</div>
                  </div>
                  
                  <div className="bg-background-secondary/30 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-success">
                      {sub.dailyCoins * sub.duration}
                    </div>
                    <div className="text-xs text-text-secondary">Total BSK</div>
                  </div>
                </div>

                {/* Status */}
                {sub.isActive ? (
                  <div className="flex items-center justify-between mb-4">
                    <KPIChip variant="success" value="ACTIVE" size="sm" />
                    <div className="text-sm text-text-secondary">
                      {sub.daysLeft} days remaining
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <KPIChip variant="default" value="INACTIVE" size="sm" />
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={() => handleSubscriptionPurchase(sub.id)}
                  disabled={sub.isActive}
                  className={cn(
                    "w-full h-10",
                    sub.isActive 
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                >
                  {sub.isActive ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Active Subscription
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Purchase Plan
                    </>
                  )}
                </Button>

                {/* Rewards Info */}
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-text-secondary">
                  <Gift className="h-4 w-4" />
                  <span>Rewards go to BSK Withdrawable balance</span>
                </div>
              </div>
            </AstraCard>
          ))}
        </div>
      )}

      {/* Important Notice */}
      <div className="text-xs text-text-secondary bg-warning/5 border border-warning/20 rounded-lg p-4 space-y-2">
        <div><strong>Fraud Detection:</strong> Our system monitors for fraudulent ad viewing patterns.</div>
        <div>BSK rates are snapshot at the time of ad view or subscription purchase.</div>
        <div>Subscriptions provide daily rewards automatically for 100 days.</div>
      </div>
    </div>
  )
}