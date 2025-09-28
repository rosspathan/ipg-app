import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Heart, TrendingDown, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsuranceCardProps {
  className?: string;
  variant?: "compact" | "full";
  style?: React.CSSProperties;
}

const InsuranceCard = ({ className, variant = "compact", style }: InsuranceCardProps) => {
  const navigate = useNavigate();
  
  console.log("InsuranceCard: Rendering with variant:", variant);

  const insurancePlans = [
    {
      type: "accident",
      name: "Accident Protection",
      premium: "₹10,000/year",
      coverage: "₹10,00,000",
      icon: Shield,
      color: "text-success",
      gradient: "from-success/20 to-accent/10"
    },
    {
      type: "trading", 
      name: "Trading Loss Cover",
      premium: "₹10,000/month",
      coverage: "Up to ₹50,000", 
      icon: TrendingDown,
      color: "text-warning",
      gradient: "from-warning/20 to-primary/10"
    },
    {
      type: "life",
      name: "Life Insurance",
      premium: "₹10,000 one-time",
      coverage: "₹5,00,000",
      icon: Heart,
      color: "text-danger",
      gradient: "from-danger/20 to-secondary/10"
    }
  ];

  if (variant === "compact") {
    console.log("InsuranceCard: Rendering compact variant");
    return (
      <Card 
        className={cn(
          "group cursor-pointer relative overflow-hidden",
          "bg-gradient-to-br from-success/20 to-primary/20 border-success/40",
          "hover:border-success/60 hover:shadow-glow-success transition-all duration-normal",
          "p-1 min-h-[120px]", // Ensure minimum height and visibility
          className
        )}
        style={style}
        onClick={() => {
          console.log("InsuranceCard: Navigating to /app/insurance");
          navigate("/app/insurance");
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">BSK Insurance</CardTitle>
                <p className="text-sm text-muted-foreground">Protect your investments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                NEW
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Plans starting from</span>
            <span className="font-bold text-primary">₹10,000</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-muted-foreground">Coverage up to</span>
            <span className="font-bold text-success">₹10,00,000</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/20", className)} style={style}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          BSK Insurance Plans
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Protect your investments and life with BSK-powered insurance
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {insurancePlans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.type}
                className={cn(
                  "p-4 rounded-lg border border-white/10",
                  "bg-gradient-to-r hover:border-primary/30",
                  "transition-all duration-normal cursor-pointer group",
                  plan.gradient
                )}
                onClick={() => navigate(`/app/insurance?plan=${plan.type}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-5 w-5", plan.color)} />
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {plan.premium} • Coverage: {plan.coverage}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="pt-3 border-t border-white/10">
          <Button 
            onClick={() => navigate("/app/insurance")}
            className="w-full bg-gradient-primary border-0"
          >
            <Shield className="h-4 w-4 mr-2" />
            Explore All Plans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsuranceCard;