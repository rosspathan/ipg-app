import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Gift, Users, Award, ArrowRight } from "lucide-react";

export function BSKHistoryEmptyState() {
  const navigate = useNavigate();

  return (
    <Card className="p-12 text-center space-y-6">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <TrendingUp className="w-12 h-12 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-success/20 flex items-center justify-center animate-pulse">
            <Gift className="w-4 h-4 text-success" />
          </div>
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          No Transaction History Yet
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your BSK transaction history will appear here once you start earning, transferring, or spending BSK.
        </p>
      </div>

      {/* Ways to Earn BSK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto py-6">
        <div className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
            <Award className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Earn from Programs</h3>
          <p className="text-xs text-muted-foreground">
            Watch ads, complete tasks, and participate in programs
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mx-auto">
            <Users className="w-5 h-5 text-success" />
          </div>
          <h3 className="font-semibold text-sm">Referral Rewards</h3>
          <p className="text-xs text-muted-foreground">
            Invite friends and earn commissions from their activities
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mx-auto">
            <TrendingUp className="w-5 h-5 text-warning" />
          </div>
          <h3 className="font-semibold text-sm">Badge Bonuses</h3>
          <p className="text-xs text-muted-foreground">
            Achieve higher badges to unlock exclusive BSK rewards
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Button
          onClick={() => navigate("/app/programs")}
          size="lg"
          className="gap-2"
        >
          Start Earning BSK
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => navigate("/app/programs/bsk-purchase")}
          variant="outline"
          size="lg"
        >
          Buy BSK
        </Button>
      </div>

      {/* Help Link */}
      <p className="text-xs text-muted-foreground">
        Need help?{" "}
        <button
          onClick={() => navigate("/app/support")}
          className="text-primary hover:underline"
        >
          Learn more about BSK
        </button>
      </p>
    </Card>
  );
}