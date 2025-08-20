import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Shield, Zap, Trophy } from "lucide-react";

const WelcomeScreen = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: "Secure Wallet",
      description: "Your crypto assets are protected with advanced security features"
    },
    {
      icon: Zap,
      title: "Trade Instantly",
      description: "Execute trades quickly with our lightning-fast trading engine"
    },
    {
      icon: Trophy,
      title: "Earn Rewards",
      description: "Participate in staking and earning programs to grow your portfolio"
    }
  ];

  const handleNext = () => {
    navigate("/wallet-selection");
  };

  const handleSkip = () => {
    navigate("/create-wallet");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to CryptoFlow
          </h1>
          <p className="text-muted-foreground text-sm">
            Everything you need to manage your crypto portfolio
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
            onClick={handleNext}
            className="w-full"
          >
            Get Started
          </Button>
          <Button 
            variant="ghost" 
            size="lg" 
            onClick={handleSkip}
            className="w-full"
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;