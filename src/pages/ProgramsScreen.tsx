import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronLeft, Star, Users, Shield, Trophy, Target, TrendingUp, Monitor, Coins, Gift } from "lucide-react";
import { ProgramGridCompact } from "@/components/programs-pro/ProgramGridCompact";
import { ProgramTileUltra, type TileBadgeType } from "@/components/programs-pro/ProgramTileUltra";

const ProgramsScreen = () => {

  const programs = [
    {
      id: "advertising",
      title: "Ad Mining",
      subtitle: "Watch ads & earn",
      icon: <Monitor className="w-5 h-5" />,
      badge: "DAILY" as TileBadgeType,
      route: "/app/programs/advertising"
    },
    {
      id: "lucky-draw",
      title: "Lucky Draw",
      subtitle: "Win big prizes",
      icon: <Target className="w-5 h-5" />,
      badge: "HOT" as TileBadgeType,
      route: "/app/programs/lucky-draw"
    },
    {
      id: "spin-wheel",
      title: "Spin Wheel",
      subtitle: "Daily spins",
      icon: <Trophy className="w-5 h-5" />,
      badge: "LIVE" as TileBadgeType,
      route: "/app/programs/spin"
    },
    {
      id: "purchase",
      title: "Purchase",
      subtitle: "Get 50% extra!",
      icon: <Coins className="w-5 h-5" />,
      badge: "NEW" as TileBadgeType,
      route: "/app/programs/bsk-bonus"
    },
    {
      id: "referrals",
      title: "Referrals",
      subtitle: "Earn commissions",
      icon: <Users className="w-5 h-5" />,
      route: "/app/programs/referrals"
    },
    {
      id: "staking",
      title: "Staking",
      subtitle: "Earn passive rewards",
      icon: <Star className="w-5 h-5" />,
      route: "/app/programs/staking"
    },
    {
      id: "loans",
      title: "Loans",
      subtitle: "0% interest",
      icon: <TrendingUp className="w-5 h-5" />,
      route: "/app/programs/loans"
    },
    {
      id: "insurance",
      title: "Insurance",
      subtitle: "Protect assets",
      icon: <Shield className="w-5 h-5" />,
      route: "/app/programs/insurance"
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
            asChild
            className="mr-2"
          >
            <Link to="/app/home">
              <ChevronLeft className="w-5 h-5" />
            </Link>
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
            <Link key={program.id} to={program.route}>
              <ProgramTileUltra
                icon={program.icon}
                title={program.title}
                subtitle={program.subtitle}
                badge={program.badge}
              />
            </Link>
          ))}
        </ProgramGridCompact>
      </div>
    </div>
  );
};

export default ProgramsScreen;