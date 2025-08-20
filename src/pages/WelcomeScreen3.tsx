import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Trophy, Coins, Gift } from "lucide-react";

const WelcomeScreen3 = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Trophy,
      title: "Earn Rewards",
      description: "Get rewarded for trading and holding your favorite coins"
    },
    {
      icon: Coins,
      title: "Staking Programs",
      description: "Earn passive income by staking your crypto assets"
    },
    {
      icon: Gift,
      title: "Referral Bonus",
      description: "Invite friends and earn bonus rewards together"
    }
  ];

  const handleGetStarted = () => {
    navigate("/wallet-selection");
  };

  const handleBack = () => {
    navigate("/welcome-2");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Grow Your Wealth
          </h1>
          <p className="text-muted-foreground text-sm">
            Multiple ways to earn and grow your crypto portfolio
          </p>
        </div>

        <div className="space-y-4">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <Button 
            variant="default" 
            size="lg" 
            onClick={handleGetStarted}
            className="w-full"
          >
            Get Started
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleBack}
            className="w-full"
          >
            Back
          </Button>
        </div>

        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-muted rounded-full"></div>
          <div className="w-2 h-2 bg-muted rounded-full"></div>
          <div className="w-2 h-2 bg-primary rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen3;