import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import cryptoLogo from "@/assets/crypto-logo.jpg";

const SplashScreen = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/welcome");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-primary px-6">
      <div className="flex flex-col items-center space-y-8 max-w-sm w-full">
        <div className="flex flex-col items-center space-y-4">
          <img 
            src="/lovable-uploads/a9cfc5de-7126-4662-923b-cc0348077e3d.png" 
            alt="iPG I-SMART Logo" 
            className="w-32 h-32 rounded-2xl shadow-card object-contain"
          />
          <h1 className="text-3xl font-bold text-primary-foreground text-center">
            I-SMART
          </h1>
          <p className="text-primary-foreground/80 text-center text-sm">
            I-SMART crypto exchange
          </p>
        </div>
        
        <Button 
          variant="hero"
          size="lg" 
          onClick={handleContinue}
          className="w-full bg-card text-card-foreground hover:bg-card/90"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default SplashScreen;