import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SplashScreenMVP = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('MVP_READY');
    
    // Wait 2 seconds or until app ready
    const timer = setTimeout(() => {
      navigate("/onboarding");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 safe-area-inset">
      <div className="flex flex-col items-center space-y-4">
        <img 
          src="/lovable-uploads/a9cfc5de-7126-4662-923b-cc0348077e3d.png" 
          alt="I-SMART Logo" 
          className="w-32 h-32 rounded-2xl object-contain"
        />
        <h1 className="text-2xl font-bold text-foreground">
          i-SMART Exchange
        </h1>
        <p className="text-sm text-muted-foreground">
          Digital Trading Platform
        </p>
      </div>
    </div>
  );
};

export default SplashScreenMVP;
