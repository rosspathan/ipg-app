import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("cryptoflow_pin");
    localStorage.removeItem("cryptoflow_biometric");
    localStorage.removeItem("cryptoflow_antiphishing");
    localStorage.removeItem("cryptoflow_setup_complete");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="text-center space-y-6 max-w-sm">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-xl text-muted-foreground">
          Welcome to your CryptoFlow wallet!
        </p>
        <p className="text-sm text-muted-foreground">
          This is where your crypto trading dashboard would be implemented with features like portfolio tracking, trading interface, and transaction history.
        </p>
        
        <div className="space-y-4 pt-6">
          <Button 
            onClick={() => navigate("/wallet-home")}
            className="w-full"
            size="lg"
          >
            Go to Wallet
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate("/app-lock")}
            className="w-full"
          >
            Test App Lock
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={handleLogout}
            className="w-full"
          >
            Reset App (Logout)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
