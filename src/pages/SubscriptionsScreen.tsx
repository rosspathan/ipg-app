import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, Star, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SubscriptionsScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<string>("free"); // free, standard, vip

  const subscriptionPlans = [
    {
      id: "standard",
      name: "Standard",
      price: "$9.99",
      duration: "per month",
      icon: Star,
      iconColor: "text-blue-500",
      popular: false,
      perks: [
        "50% trading fee discount",
        "2x referral commission",
        "Priority customer support",
        "Advanced trading tools",
        "Monthly market insights"
      ]
    },
    {
      id: "vip",
      name: "VIP",
      price: "$29.99",
      duration: "per month",
      icon: Crown,
      iconColor: "text-yellow-500",
      popular: true,
      perks: [
        "75% trading fee discount",
        "5x referral commission",
        "24/7 dedicated support",
        "All premium features",
        "Exclusive VIP events",
        "Personal account manager",
        "Higher withdrawal limits"
      ]
    }
  ];

  const handleSubscribe = (planId: string, planName: string) => {
    // For demo purposes, just show success
    toast({
      title: "Subscription Updated",
      description: `Successfully subscribed to ${planName} plan`,
    });
    setCurrentPlan(planId);
  };

  const currentSubscription = {
    plan: currentPlan,
    renewalDate: "Dec 25, 2024",
    expirationDate: "Jan 25, 2025"
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/app/home")}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Subscriptions</h1>
      </div>

      {/* Current Subscription Status */}
      {currentPlan !== "free" && (
        <Card className="bg-gradient-card shadow-card border-0 mb-6">
          <CardHeader>
            <CardTitle className="text-base">Current Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-medium capitalize">{currentSubscription.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Renewal:</span>
              <span className="font-medium">{currentSubscription.renewalDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires:</span>
              <span className="font-medium">{currentSubscription.expirationDate}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {subscriptionPlans.map((plan) => (
          <Card 
            key={plan.id}
            className={`bg-gradient-card shadow-card border-0 relative ${
              plan.popular ? "ring-2 ring-primary" : ""
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            )}
            
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <plan.icon className={`w-6 h-6 ${plan.iconColor}`} />
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.duration}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{plan.price}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Perks & Benefits:</h4>
                <div className="space-y-2">
                  {plan.perks.map((perk, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => handleSubscribe(plan.id, plan.name)}
                className="w-full"
                variant={currentPlan === plan.id ? "outline" : "default"}
                disabled={currentPlan === plan.id}
              >
                {currentPlan === plan.id ? "Current Plan" : 
                 currentPlan !== "free" ? "Upgrade" : "Subscribe"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Free Plan Info */}
      <Card className="bg-gradient-card shadow-card border-0 mt-4">
        <CardContent className="p-4">
          <div className="text-center">
            <h3 className="font-medium mb-2">Free Plan</h3>
            <p className="text-sm text-muted-foreground">
              Standard trading fees apply. Limited features. No referral commissions.
            </p>
            {currentPlan === "free" && (
              <Badge variant="outline" className="mt-2">Currently Active</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionsScreen;