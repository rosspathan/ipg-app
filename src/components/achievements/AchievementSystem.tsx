import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Trophy, 
  Star, 
  Zap, 
  Target, 
  TrendingUp, 
  Calendar, 
  Gift,
  Shield,
  Crown,
  Flame
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'trading' | 'spin' | 'loyalty' | 'social' | 'financial';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: {
    type: string;
    target: number;
    current?: number;
  };
  unlocked: boolean;
  unlockedAt?: string;
  reward?: {
    type: 'badge' | 'tokens' | 'spin_tickets' | 'discount';
    value: number;
    description: string;
  };
}

interface UserProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalSpins: number;
  totalTrades: number;
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
}

const ACHIEVEMENT_TEMPLATES: Omit<Achievement, 'id' | 'requirement' | 'unlocked' | 'unlockedAt'>[] = [
  {
    title: "First Spin",
    description: "Complete your first spin on the wheel",
    icon: Gift,
    category: 'spin',
    points: 50,
    rarity: 'common',
    reward: { type: 'tokens', value: 10, description: '10 Bonus Tokens' }
  },
  {
    title: "Lucky Streak",
    description: "Win 5 spins in a row",
    icon: Flame,
    category: 'spin',
    points: 200,
    rarity: 'rare',
    reward: { type: 'spin_tickets', value: 3, description: '3 Free Spin Tickets' }
  },
  {
    title: "Spin Master",
    description: "Complete 100 spins",
    icon: Crown,
    category: 'spin',
    points: 500,
    rarity: 'epic',
    reward: { type: 'tokens', value: 100, description: '100 Bonus Tokens' }
  },
  {
    title: "First Trade",
    description: "Execute your first trade",
    icon: TrendingUp,
    category: 'trading',
    points: 75,
    rarity: 'common',
    reward: { type: 'discount', value: 10, description: '10% Trading Fee Discount' }
  },
  {
    title: "Trading Veteran",
    description: "Complete 50 trades",
    icon: Target,
    category: 'trading',
    points: 300,
    rarity: 'rare',
    reward: { type: 'tokens', value: 50, description: '50 Bonus Tokens' }
  },
  {
    title: "Daily Warrior",
    description: "Login for 7 consecutive days",
    icon: Calendar,
    category: 'loyalty',
    points: 150,
    rarity: 'common',
    reward: { type: 'spin_tickets', value: 5, description: '5 Free Spin Tickets' }
  },
  {
    title: "Loyalty Champion",
    description: "Maintain a 30-day login streak",
    icon: Shield,
    category: 'loyalty',
    points: 750,
    rarity: 'legendary',
    reward: { type: 'tokens', value: 500, description: '500 Bonus Tokens' }
  },
  {
    title: "Community Member",
    description: "Refer your first friend",
    icon: Star,
    category: 'social',
    points: 100,
    rarity: 'common',
    reward: { type: 'tokens', value: 25, description: '25 Bonus Tokens' }
  }
];

export const AchievementSystem = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    totalSpins: 0,
    totalTrades: 0,
    daysActive: 0,
    currentStreak: 0,
    longestStreak: 0
  });
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAchievements();
      loadUserProgress();
    }
  }, [user]);

  const loadAchievements = async () => {
    try {
      // Load user's achievement progress from database
      const { data: userAchievements }: any = await (supabase as any)
        .from('user_achievements' as any)
        .select('*')
        .eq('user_id', user?.id);

      // Create achievement list with progress
      const achievementsWithProgress = ACHIEVEMENT_TEMPLATES.map((template, index) => {
        const userAchievement = userAchievements?.find(ua => ua.achievement_type === template.title);
        
        return {
          ...template,
          id: `achievement_${index}`,
          requirement: getRequirementForAchievement(template.title),
          unlocked: userAchievement?.unlocked || false,
          unlockedAt: userAchievement?.unlocked_at
        };
      });

      setAchievements(achievementsWithProgress);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadUserProgress = async () => {
    try {
      // Load user stats from various tables
      const [spinsResult, tradesResult, loginResult] = await Promise.all([
        supabase.from('spin_runs').select('*').eq('user_id', user?.id),
        supabase.from('orders').select('*').eq('user_id', user?.id).eq('status', 'filled'),
        supabase.from('login_audit').select('*').eq('user_id', user?.id)
      ]);

      const totalSpins = spinsResult.data?.length || 0;
      const totalTrades = tradesResult.data?.length || 0;
      const daysActive = calculateDaysActive(loginResult.data || []);
      const currentStreak = calculateCurrentStreak(loginResult.data || []);
      
      // Calculate level based on activities
      const totalActivities = totalSpins + totalTrades;
      const level = Math.floor(totalActivities / 10) + 1;
      const xp = totalActivities % 10;
      const xpToNextLevel = 10;

      setUserProgress({
        level,
        xp,
        xpToNextLevel,
        totalSpins,
        totalTrades,
        daysActive,
        currentStreak,
        longestStreak: currentStreak // Simplified for demo
      });

      // Check for new achievements
      checkAndUnlockAchievements(totalSpins, totalTrades, currentStreak);
    } catch (error) {
      console.error('Error loading user progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRequirementForAchievement = (title: string) => {
    const requirements = {
      "First Spin": { type: 'spins', target: 1, current: userProgress.totalSpins },
      "Lucky Streak": { type: 'consecutive_wins', target: 5, current: 0 },
      "Spin Master": { type: 'spins', target: 100, current: userProgress.totalSpins },
      "First Trade": { type: 'trades', target: 1, current: userProgress.totalTrades },
      "Trading Veteran": { type: 'trades', target: 50, current: userProgress.totalTrades },
      "Daily Warrior": { type: 'login_streak', target: 7, current: userProgress.currentStreak },
      "Loyalty Champion": { type: 'login_streak', target: 30, current: userProgress.currentStreak },
      "Community Member": { type: 'referrals', target: 1, current: 0 }
    };
    return requirements[title as keyof typeof requirements] || { type: 'unknown', target: 0, current: 0 };
  };

  const calculateDaysActive = (loginData: any[]) => {
    const uniqueDays = new Set(loginData.map(login => 
      new Date(login.created_at).toDateString()
    ));
    return uniqueDays.size;
  };

  const calculateCurrentStreak = (loginData: any[]) => {
    if (!loginData.length) return 0;
    
    const sortedDates = loginData
      .map(login => new Date(login.created_at).toDateString())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    const uniqueDates = [...new Set(sortedDates)];
    let streak = 0;
    const today = new Date().toDateString();
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (uniqueDates[i] === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const checkAndUnlockAchievements = async (totalSpins: number, totalTrades: number, currentStreak: number) => {
    const newUnlocks: Achievement[] = [];

    achievements.forEach(achievement => {
      if (!achievement.unlocked) {
        let shouldUnlock = false;

        switch (achievement.requirement.type) {
          case 'spins':
            shouldUnlock = totalSpins >= achievement.requirement.target;
            break;
          case 'trades':
            shouldUnlock = totalTrades >= achievement.requirement.target;
            break;
          case 'login_streak':
            shouldUnlock = currentStreak >= achievement.requirement.target;
            break;
        }

        if (shouldUnlock) {
          newUnlocks.push(achievement);
        }
      }
    });

    // Save new achievements to database and show notifications
    for (const achievement of newUnlocks) {
      try {
        await (supabase as any).from('user_achievements' as any).insert({
          user_id: user?.id,
          achievement_type: achievement.title,
          unlocked: true,
          unlocked_at: new Date().toISOString(),
          points_earned: achievement.points
        });

        toast({
          title: "🏆 Achievement Unlocked!",
          description: `${achievement.title} - ${achievement.description}`,
        });
      } catch (error) {
        console.error('Error saving achievement:', error);
      }
    }

    if (newUnlocks.length > 0) {
      loadAchievements(); // Refresh achievements
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: "text-gray-600 border-gray-300",
      rare: "text-blue-600 border-blue-300",
      epic: "text-purple-600 border-purple-300",
      legendary: "text-yellow-600 border-yellow-300"
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const getRarityGlow = (rarity: string) => {
    const glows = {
      common: "",
      rare: "shadow-lg shadow-blue-200",
      epic: "shadow-lg shadow-purple-200",
      legendary: "shadow-lg shadow-yellow-200 animate-pulse"
    };
    return glows[rarity as keyof typeof glows] || "";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Progress Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Level {userProgress.level} Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">XP Progress</span>
            <span className="text-sm text-muted-foreground">
              {userProgress.xp} / {userProgress.xpToNextLevel}
            </span>
          </div>
          <Progress 
            value={(userProgress.xp / userProgress.xpToNextLevel) * 100} 
            className="h-2"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{userProgress.totalSpins}</div>
              <div className="text-xs text-muted-foreground">Total Spins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{userProgress.totalTrades}</div>
              <div className="text-xs text-muted-foreground">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{userProgress.currentStreak}</div>
              <div className="text-xs text-muted-foreground">Daily Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{userProgress.daysActive}</div>
              <div className="text-xs text-muted-foreground">Days Active</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const progress = Math.min((achievement.requirement.current || 0) / achievement.requirement.target * 100, 100);
          
          return (
            <Card 
              key={achievement.id}
              className={`cursor-pointer transition-all hover:scale-105 ${
                achievement.unlocked 
                  ? `${getRarityGlow(achievement.rarity)} border-2 ${getRarityColor(achievement.rarity)}` 
                  : "opacity-60"
              }`}
              onClick={() => setSelectedAchievement(achievement)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    achievement.unlocked ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    <achievement.icon className={`h-5 w-5 ${
                      achievement.unlocked ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{achievement.title}</h3>
                      {achievement.unlocked && (
                        <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {achievement.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity}
                      </Badge>
                      <span className="text-xs font-medium">+{achievement.points} XP</span>
                    </div>
                    
                    {!achievement.unlocked && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{achievement.requirement.current || 0}/{achievement.requirement.target}</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Achievement Detail Dialog */}
      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAchievement?.icon && (
                <selectedAchievement.icon className="h-6 w-6 text-primary" />
              )}
              {selectedAchievement?.title}
              {selectedAchievement?.unlocked && (
                <Trophy className="h-5 w-5 text-yellow-500" />
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAchievement && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {selectedAchievement.description}
              </p>
              
              <div className="flex items-center justify-between">
                <Badge className={getRarityColor(selectedAchievement.rarity)}>
                  {selectedAchievement.rarity.toUpperCase()}
                </Badge>
                <span className="font-medium">+{selectedAchievement.points} XP</span>
              </div>
              
              {selectedAchievement.reward && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-1">Reward</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAchievement.reward.description}
                  </p>
                </div>
              )}
              
              {selectedAchievement.unlocked ? (
                <div className="text-center text-green-600">
                  <Trophy className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Achievement Unlocked!</p>
                  {selectedAchievement.unlockedAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
                      {selectedAchievement.requirement.current || 0} / {selectedAchievement.requirement.target}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((selectedAchievement.requirement.current || 0) / selectedAchievement.requirement.target * 100, 100)} 
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};