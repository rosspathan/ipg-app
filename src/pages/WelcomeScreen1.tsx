import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Key } from "lucide-react";

const WelcomeScreen1 = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "Your assets are protected with military-grade encryption"
    },
    {
      icon: Lock,
      title: "Private Keys",
      description: "You own and control your private keys, not us"
    },
    {
      icon: Key,
      title: "Biometric Access",
      description: "Secure your wallet with fingerprint or face recognition"
    }
  ];

  const handleNext = () => {
    navigate("/welcome-2");
  };

  const handleSkip = () => {
    navigate("/wallet-selection");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Your Security First
          </h1>
          <p className="text-muted-foreground text-sm">
            Advanced security features to protect your crypto assets
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
            Next
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

        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <div className="w-2 h-2 bg-muted rounded-full"></div>
          <div className="w-2 h-2 bg-muted rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen1;