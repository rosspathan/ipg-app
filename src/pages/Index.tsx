import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin, loading } = useAuth();

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

  // Redirect authenticated users after role resolution
  useEffect(() => {
    // Wait until loading is complete (both auth and role check)
    if (loading) return;
    
    if (user && isAdmin) {
      console.log('[INDEX] Admin user, redirecting to /admin');
      navigate("/admin", { replace: true });
    } else if (user && !isAdmin) {
      console.log('[INDEX] Regular user, redirecting to /app/home');
      navigate("/app/home", { replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  // Don't show anything while loading
  if (loading) {
    return null;
  }

  // Show admin dashboard for admins (fallback, shouldn't render due to redirect)
  if (isAdmin && user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center space-y-6 max-w-sm">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Welcome to the Admin Control Panel
          </p>
          <p className="text-sm text-muted-foreground">
            Manage users, systems, and platform operations from this centralized dashboard.
          </p>
          
          <div className="space-y-4 pt-6">
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
            
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Professional landing page for unauthenticated users and regular users
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center space-y-8 max-w-2xl">
          {/* Logo & Title */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              IPG i-SMART
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Your Gateway to Smart Crypto Trading & Earning
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
            <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">💼</div>
              <h3 className="font-semibold text-lg mb-2">Secure Trading</h3>
              <p className="text-sm text-muted-foreground">
                Trade cryptocurrencies with enterprise-grade security
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-semibold text-lg mb-2">Earn Rewards</h3>
              <p className="text-sm text-muted-foreground">
                Multiple earning programs with daily payouts
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="font-semibold text-lg mb-2">Enhanced Security</h3>
              <p className="text-sm text-muted-foreground">
                PIN protection & biometric authentication
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">📞</div>
              <h3 className="font-semibold text-lg mb-2">24/7 Support</h3>
              <p className="text-sm text-muted-foreground">
                Expert assistance whenever you need it
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-4 pt-8">
            {user ? (
              <>
                <Button 
                  onClick={() => navigate("/app/home")}
                  className="w-full max-w-md"
                  size="lg"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="w-full max-w-md"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => navigate("/auth/signup")}
                  className="w-full max-w-md"
                  size="lg"
                >
                  Get Started
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/auth/login")}
                  className="w-full max-w-md"
                  size="lg"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-border/40">
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 IPG i-SMART. All rights reserved.</p>
          <button
            onClick={() => navigate("/admin/login")}
            className="hover:text-foreground transition-colors"
          >
            Admin Login
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Index;
