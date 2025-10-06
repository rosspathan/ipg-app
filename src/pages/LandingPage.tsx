import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Wallet, ArrowRight, Shield, Users, Zap, Gift } from "lucide-react";
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper";

/**
 * LandingPage - Entry point for new and returning users
 * Options: Email/Password signup or Web3 Wallet Connection
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();

  // Redirect authenticated users to home
  useEffect(() => {
    if (!loading && user) {
      navigate("/app/home", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <HeaderLogoFlipper size="xl" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Header */}
      <header className="p-4 md:p-6">
        <div className="container mx-auto flex justify-between items-center">
          <HeaderLogoFlipper size="md" />
          <Button variant="ghost" onClick={() => navigate("/auth/login")}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8 mb-12">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-fade-in">
              Welcome to IPG I-SMART
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Earn BSK tokens through ads, referrals, staking, and more. Join thousands of users building wealth together.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-8">
              <div className="p-4 rounded-lg bg-card/50 backdrop-blur">
                <Zap className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Earn BSK</p>
              </div>
              <div className="p-4 rounded-lg bg-card/50 backdrop-blur">
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Referral Rewards</p>
              </div>
              <div className="p-4 rounded-lg bg-card/50 backdrop-blur">
                <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Secure Platform</p>
              </div>
              <div className="p-4 rounded-lg bg-card/50 backdrop-blur">
                <Gift className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Daily Rewards</p>
              </div>
            </div>
          </div>

          {/* Sign Up Options */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Email Sign Up */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl hover:shadow-primary/20 transition-all hover:scale-105">
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center text-2xl">Sign Up with Email</CardTitle>
                <CardDescription className="text-center">
                  Quick and easy registration with your email address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Instant account creation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Email verification required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Password recovery available</span>
                  </div>
                </div>
                <Button 
                  className="w-full group" 
                  size="lg"
                  onClick={() => navigate("/auth/register")}
                >
                  Get Started with Email
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Web3 Wallet Sign Up */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl hover:shadow-accent/20 transition-all hover:scale-105">
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 rounded-full bg-accent/10">
                    <Wallet className="h-8 w-8 text-accent" />
                  </div>
                </div>
                <CardTitle className="text-center text-2xl">Connect Web3 Wallet</CardTitle>
                <CardDescription className="text-center">
                  Use MetaMask or create a new wallet to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>Full Web3 integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>Create or import wallet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>Connect MetaMask/WalletConnect</span>
                  </div>
                </div>
                <Button 
                  className="w-full group" 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/onboarding")}
                >
                  Connect Wallet
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Already Have Account */}
          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Button 
                variant="link" 
                className="text-primary hover:text-primary/80 p-0 h-auto"
                onClick={() => navigate("/auth/login")}
              >
                Sign in here →
              </Button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground border-t border-border/50">
        <p>© 2025 IPG I-SMART. All rights reserved.</p>
        <p className="mt-2">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </footer>
    </div>
  );
}
