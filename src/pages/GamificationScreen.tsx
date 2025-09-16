import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Calendar, Target, Flame } from "lucide-react";
import { AchievementSystem } from "@/components/achievements/AchievementSystem";
import { DailyRewards } from "@/components/gamification/DailyRewardsFixed";

const GamificationScreen = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("achievements");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/programs")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Rewards & Achievements
            </h1>
            <p className="text-muted-foreground">Track your progress and claim rewards</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-200">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-700">0</div>
              <div className="text-xs text-blue-600">Achievements</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-200">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-700">0</div>
              <div className="text-xs text-green-600">Day Streak</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-200">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-700">1</div>
              <div className="text-xs text-purple-600">Level</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-orange-200">
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-700">0</div>
              <div className="text-xs text-orange-600">Total XP</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Achievement System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AchievementSystem />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="space-y-6">
            <DailyRewards />
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-8 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/app/programs/spin")}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <div className="text-2xl">🎰</div>
              <span className="text-sm">Spin Wheel</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/app/trade")}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <div className="text-2xl">📈</div>
              <span className="text-sm">Trade</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/app/programs/referrals")}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <div className="text-2xl">👥</div>
              <span className="text-sm">Refer Friends</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationScreen;