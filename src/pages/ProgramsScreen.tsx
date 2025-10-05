import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Users, PiggyBank, Gift, Shield, Trophy, Target, TrendingUp } from "lucide-react";
import { ProgramGridCompact } from "@/components/programs-pro/ProgramGridCompact";
import { ProgramTileUltra, type TileBadgeType } from "@/components/programs-pro/ProgramTileUltra";

const ProgramsScreen = () => {
  const navigate = useNavigate();

  const programs = [
    {
      id: "advertising",
      title: "Advertising",
      subtitle: "Watch ads & earn",
      icon: <Users className="w-5 h-5" />,
      badge: "DAILY" as TileBadgeType,
      route: "/app/programs/advertising"
    },
    {
      id: "staking",
      title: "Staking",
      subtitle: "Earn passive rewards",
      icon: <PiggyBank className="w-5 h-5" />,
      route: "/app/programs/staking"
    },
    {
      id: "bsk-bonus",
      title: "BSK Bonus",
      subtitle: "Get 50% extra!",
      icon: <Gift className="w-5 h-5" />,
      badge: "NEW" as TileBadgeType,
      route: "/app/programs/bsk-bonus"
    },
    {
      id: "lucky-spin",
      title: "Lucky Spin",
      subtitle: "Win big prizes",
      icon: <Target className="w-5 h-5" />,
      badge: "HOT" as TileBadgeType,
      route: "/app/programs/spin"
    },
    {
      id: "i-smart",
      title: "i-SMART",
      subtitle: "Smart trading",
      icon: <TrendingUp className="w-5 h-5" />,
      badge: "LIVE" as TileBadgeType,
      route: "/app/programs/spin"
    },
    {
      id: "insurance",
      title: "Insurance",
      subtitle: "Protect assets",
      icon: <Shield className="w-5 h-5" />,
      route: "/app/programs/insurance"
    },
    {
      id: "referrals",
      title: "Referrals",
      subtitle: "Earn commissions",
      icon: <Users className="w-5 h-5" />,
      badge: "NEW" as TileBadgeType,
      route: "/app/programs/referrals"
    },
    {
      id: "trading",
      title: "Trading",
      subtitle: "Trade markets",
      icon: <TrendingUp className="w-5 h-5" />,
      route: "/app/programs/trading"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center px-4 py-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-[var(--font-heading)] font-bold text-foreground">Programs</h1>
            <p className="text-xs text-muted-foreground">Explore all programs</p>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-foreground">
            <span className="font-bold">New:</span> BSK Purchase Bonus - Get 50% extra!
          </p>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="px-4 py-6 flex-1">
        <ProgramGridCompact>
          {programs.map((program) => (
            <ProgramTileUltra
              key={program.id}
              icon={program.icon}
              title={program.title}
              subtitle={program.subtitle}
              badge={program.badge}
              onPress={() => navigate(program.route)}
            />
          ))}
        </ProgramGridCompact>
      </div>
    </div>
  );
};

export default ProgramsScreen;