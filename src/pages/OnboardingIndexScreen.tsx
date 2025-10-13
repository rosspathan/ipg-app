import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const OnboardingIndexScreen = () => {
  const navigate = useNavigate();

  const options = [
    {
      title: "Create New Wallet",
      description: "Generate a new wallet with a secure seed phrase",
      action: () => navigate("/onboarding/create-wallet"),
      primary: true
    },
    {
      title: "Import Existing Wallet",
      description: "Restore your wallet using your seed phrase",
      action: () => navigate("/onboarding/import-wallet")
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 pb-safe">
      <div className="flex flex-col items-center space-y-8 max-w-md w-full">
        <div className="flex flex-col items-center space-y-4">
          <img 
            src="/lovable-uploads/a9cfc5de-7126-4662-923b-cc0348077e3d.png" 
            alt="I-SMART Logo" 
            className="w-24 h-24 rounded-2xl object-contain"
          />
          <h1 className="text-2xl font-bold text-foreground text-center">
            Wallet Setup
          </h1>
          <p className="text-muted-foreground text-center">
            Choose how you'd like to set up your wallet
          </p>
        </div>
        
        <div className="space-y-4 w-full">
          {options.map((option) => (
            <Card 
              key={option.title}
              className="bg-card border border-border"
            >
              <CardHeader>
                <CardTitle className="text-base">{option.title}</CardTitle>
                <CardDescription className="text-sm">{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  data-testid={option.primary ? "onb-create" : "onb-import"}
                  variant={option.primary ? "default" : "outline"}
                  className="w-full"
                  onClick={option.action}
                >
                  {option.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          variant="ghost" 
          onClick={() => navigate("/auth")}
          className="text-muted-foreground"
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
};

export default OnboardingIndexScreen;