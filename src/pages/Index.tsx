import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      localStorage.removeItem("cryptoflow_pin");
      localStorage.removeItem("cryptoflow_biometric");
      localStorage.removeItem("cryptoflow_antiphishing");
      localStorage.removeItem("cryptoflow_setup_complete");
      console.log('Calling signOut...');
      await signOut();
      console.log('SignOut completed, navigating to onboarding...');
      navigate("/onboarding");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Redirect authenticated users to the proper app routes
  useEffect(() => {
    if (user && !isAdmin) {
      navigate("/app/home");
      return;
    }
  }, [user, isAdmin, navigate]);

  // Admin dashboard (current interface)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="text-center space-y-6 max-w-sm">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
          {isAdmin ? 'Admin Dashboard' : 'Dashboard'}
        </h1>
        <p className="text-xl text-muted-foreground">
          {isAdmin ? 'Welcome to the Admin Control Panel' : 'Welcome to your IPG i-SMART wallet!'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isAdmin 
            ? 'Manage users, systems, and platform operations from this centralized dashboard.'
            : 'This is where your crypto trading dashboard would be implemented with features like portfolio tracking, trading interface, and transaction history.'
          }
        </p>
        
        <div className="space-y-4 pt-6">
          {user ? (
            <>
              {!isAdmin && (
                <Button 
                  onClick={() => navigate("/app/wallet")}
                  className="w-full"
                  size="lg"
                >
                  Go to Wallet
                </Button>
              )}
              
              {isAdmin ? (
                <>
                  <Button 
                    onClick={() => navigate("/admin")}
                    className="w-full"
                    size="lg"
                  >
                    Admin Panel
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/create-real-user")}
                    className="w-full"
                  >
                    Create Real User
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/test-users")}
                    className="w-full"
                  >
                    Create Test Users
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/admin-login")}
                  className="w-full"
                >
                  Web3 Admin Login
                </Button>
              )}
              
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
                Sign Out
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => navigate("/onboarding")}
              className="w-full"
              size="lg"
            >
              Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
