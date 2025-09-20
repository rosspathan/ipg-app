import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Users, PiggyBank, Gift, Shield, Trophy } from "lucide-react";

const ProgramsScreen = () => {
  const navigate = useNavigate();

  const programs = [
    {
      title: "BSK Fortune Wheel",
      description: "Spin to win or lose BSK Coins! Futuristic wheel with premium design",
      icon: Gift,
      color: "text-green-500",
      route: "/app/programs/spin"
    },
    {
      title: "Subscriptions",
      description: "Get premium benefits with our subscription plans",
      icon: Star,
      color: "text-yellow-500",
      route: "/subscriptions"
    },
    {
      title: "Referrals",
      description: "Earn commissions by referring friends",
      icon: Users,
      color: "text-blue-500",
      route: "/referrals"
    },
    {
      title: "Staking",
      description: "Stake your crypto and earn rewards",
      icon: PiggyBank,
      color: "text-green-500",
      route: "/app/programs/staking"
    },
    {
      title: "Achievements",
      description: "Track progress and unlock rewards",
      icon: Trophy,
      color: "text-yellow-500",
      route: "/app/programs/achievements"
    },
    {
      title: "Insurance",
      description: "Protect your assets with insurance plans",
      icon: Shield,
      color: "text-red-500",
      route: "/insurance"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Programs</h1>
      </div>

      <div className="space-y-4">
        {programs.map((program) => (
          <Card 
            key={program.title}
            className="bg-gradient-card shadow-card border-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(program.route)}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center">
                  <program.icon className={`w-6 h-6 ${program.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    {program.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {program.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProgramsScreen;