import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Gift, 
  Flame, 
  Coins, 
  Trophy, 
  CheckCircle,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useToast } from "@/hooks/use-toast";

interface DailyReward {
  day: number;
  type: 'tokens' | 'spin_tickets' | 'multiplier' | 'bonus';
  amount: number;
  claimed: boolean;
  special?: boolean;
}

interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastClaimDate: string | null;
  totalClaimed: number;
}

export const DailyRewards = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [userStreak, setUserStreak] = useState<UserStreak>({
    currentStreak: 0,
    longestStreak: 0,
    lastClaimDate: null,
    totalClaimed: 0
  });
  const [dailyRewards, setDailyRewards] = useState<DailyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  // Define the 7-day reward cycle
  const REWARD_CYCLE: Omit<DailyReward, 'claimed'>[] = [
    { day: 1, type: 'tokens', amount: 10 },
    { day: 2, type: 'tokens', amount: 15 },
    { day: 3, type: 'spin_tickets', amount: 1 },
    { day: 4, type: 'tokens', amount: 25 },
    { day: 5, type: 'multiplier', amount: 1.5 },
    { day: 6, type: 'tokens', amount: 40 },
    { day: 7, type: 'bonus', amount: 100, special: true }
  ];

  useEffect(() => {
    if (user) {
      loadUserStreak();
    }
  }, [user]);

  const loadUserStreak = async () => {
    try {
      setLoading(true);
      
      // Load user's daily reward history
      const { data: rewardHistory } = await supabase
        .from('daily_rewards')
        .select('*')
        .eq('user_id', user?.id)
        .order('claimed_at', { ascending: false });

      // Calculate current streak and generate reward state
      const streak = calculateCurrentStreak(rewardHistory || []);
      const rewards = generateRewardState(streak.currentStreak, rewardHistory || []);
      
      setUserStreak(streak);
      setDailyRewards(rewards);
    } catch (error) {
      console.error('Error loading user streak:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentStreak = (history: any[]): UserStreak => {
    if (!history.length) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastClaimDate: null,
        totalClaimed: 0
      };
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();
    
    // Check if user can claim today
    const todaysClaim = history.find(h => 
      new Date(h.claimed_at).toDateString() === todayStr
    );
    
    if (todaysClaim) {
      // Already claimed today, streak continues
      return {
        currentStreak: todaysClaim.streak_day,
        longestStreak: Math.max(...history.map(h => h.streak_day), 0),
        lastClaimDate: todaysClaim.claimed_at,
        totalClaimed: history.length
      };
    }

    // Check yesterday's claim to determine current streak
    const yesterdaysClaim = history.find(h => 
      new Date(h.claimed_at).toDateString() === yesterdayStr
    );

    const currentStreak = yesterdaysClaim ? yesterdaysClaim.streak_day : 0;
    
    return {
      currentStreak,
      longestStreak: Math.max(...history.map(h => h.streak_day), 0),
      lastClaimDate: history[0]?.claimed_at || null,
      totalClaimed: history.length
    };
  };

  const generateRewardState = (currentStreak: number, history: any[]): DailyReward[] => {
    const today = new Date().toDateString();
    const todaysClaim = history.find(h => 
      new Date(h.claimed_at).toDateString() === today
    );
    
    return REWARD_CYCLE.map((reward, index) => ({
      ...reward,
      claimed: index < currentStreak || (todaysClaim && index === currentStreak)
    }));
  };

  const canClaimToday = (): boolean => {
    const today = new Date().toDateString();
    return !userStreak.lastClaimDate || 
           new Date(userStreak.lastClaimDate).toDateString() !== today;
  };

  const getNextRewardDay = (): number => {
    if (canClaimToday()) {
      return (userStreak.currentStreak % 7) + 1;
    }
    return ((userStreak.currentStreak + 1) % 7) + 1;
  };

  const handleClaimReward = async () => {
    if (!canClaimToday() || claiming) return;

    setClaiming(true);
    try {
      const nextDay = getNextRewardDay();
      const reward = REWARD_CYCLE[nextDay - 1];
      const newStreakDay = userStreak.currentStreak + 1;

      // Save claim to database
      const { error } = await supabase
        .from('daily_rewards')
        .insert({
          user_id: user?.id,
          day_in_cycle: nextDay,
          streak_day: newStreakDay,
          reward_type: reward.type,
          reward_amount: reward.amount,
          claimed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update local state
      setUserStreak(prev => ({
        ...prev,
        currentStreak: newStreakDay,
        longestStreak: Math.max(prev.longestStreak, newStreakDay),
        lastClaimDate: new Date().toISOString(),
        totalClaimed: prev.totalClaimed + 1
      }));

      // Update rewards visual state
      setDailyRewards(prev => prev.map((r, i) => ({
        ...r,
        claimed: i < newStreakDay
      })));

      // Show success message
      const rewardText = reward.type === 'tokens' ? `${reward.amount} Tokens` :
                        reward.type === 'spin_tickets' ? `${reward.amount} Spin Tickets` :
                        reward.type === 'multiplier' ? `${reward.amount}x Multiplier` :
                        `${reward.amount} Bonus Points`;

      toast({
        title: "🎁 Daily Reward Claimed!",
        description: `You received: ${rewardText}`,
      });

      // Check for streak milestones
      if (newStreakDay === 7) {
        toast({
          title: "🔥 Week Complete!",
          description: "Amazing streak! The cycle resets with bigger rewards.",
        });
      }

    } catch (error) {
      console.error('Error claiming reward:', error);
      toast({
        title: "Error",
        description: "Failed to claim daily reward. Please try again.",
        variant: "destructive"
      });
    } finally {
      setClaiming(false);
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'tokens': return <Coins className="h-4 w-4" />;
      case 'spin_tickets': return <Gift className="h-4 w-4" />;
      case 'multiplier': return <Trophy className="h-4 w-4" />;
      case 'bonus': return <Trophy className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const getRewardText = (reward: DailyReward) => {
    switch (reward.type) {
      case 'tokens': return `${reward.amount} Tokens`;
      case 'spin_tickets': return `${reward.amount} Spin Ticket${reward.amount > 1 ? 's' : ''}`;
      case 'multiplier': return `${reward.amount}x Multiplier`;
      case 'bonus': return `${reward.amount} Bonus Points`;
      default: return 'Mystery Reward';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="grid grid-cols-7 gap-2">
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextRewardDay = getNextRewardDay();
  const nextReward = REWARD_CYCLE[nextRewardDay - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Daily Rewards
          <Badge variant="secondary" className="ml-auto">
            <Flame className="h-3 w-3 mr-1" />
            {userStreak.currentStreak} Day Streak
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Weekly Progress</span>
            <span>{userStreak.currentStreak}/7 Days</span>
          </div>
          <Progress value={(userStreak.currentStreak % 7) / 7 * 100} className="h-2" />
        </div>

        {/* Next Reward Preview */}
        {canClaimToday() && (
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-full">
                    {getRewardIcon(nextReward.type)}
                  </div>
                  <div>
                    <p className="font-medium">Day {nextRewardDay} Reward</p>
                    <p className="text-sm text-muted-foreground">
                      {getRewardText(nextReward)}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleClaimReward}
                  disabled={claiming}
                  className="animate-pulse"
                >
                  {claiming ? 'Claiming...' : 'Claim'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reward Calendar */}
        <div>
          <h4 className="font-medium mb-3">Weekly Rewards</h4>
          <div className="grid grid-cols-7 gap-2">
            {dailyRewards.map((reward, index) => {
              const isNext = !canClaimToday() && index === userStreak.currentStreak;
              const canClaim = canClaimToday() && index === userStreak.currentStreak;
              
              return (
                <div 
                  key={reward.day}
                  className={`
                    relative p-3 rounded-lg border-2 text-center transition-all
                    ${reward.claimed 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : canClaim
                        ? 'bg-primary/10 border-primary animate-pulse'
                        : isNext
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-muted border-border opacity-60'
                    }
                    ${reward.special ? 'ring-2 ring-yellow-400' : ''}
                  `}
                >
                  {reward.claimed && (
                    <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-600" />
                  )}
                  {!reward.claimed && !canClaim && !isNext && (
                    <Lock className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground" />
                  )}
                  
                  <div className="text-xs font-medium mb-1">Day {reward.day}</div>
                  <div className="flex justify-center mb-1">
                    {getRewardIcon(reward.type)}
                  </div>
                  <div className="text-xs">
                    {reward.type === 'tokens' ? reward.amount :
                     reward.type === 'spin_tickets' ? reward.amount :
                     reward.type === 'multiplier' ? `${reward.amount}x` :
                     reward.amount}
                  </div>
                  
                  {reward.special && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        SPECIAL
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{userStreak.longestStreak}</div>
            <div className="text-xs text-muted-foreground">Longest Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{userStreak.totalClaimed}</div>
            <div className="text-xs text-muted-foreground">Total Claimed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};