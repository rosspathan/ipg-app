import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const EmailVerifiedScreen = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Check if user is authenticated and verified
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email_confirmed_at) {
        // If not verified, redirect to verification screen
        navigate('/email-verification');
        return;
      }
    };

    checkAuth();

    // Start countdown for auto-redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleContinue = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-success" />
              <div className="absolute inset-0 animate-ping">
                <CheckCircle className="h-16 w-16 text-success opacity-30" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl text-success">Email Verified!</CardTitle>
          <CardDescription className="text-success/90">
            Your email has been successfully verified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="bg-success/10 border border-success/30 rounded-lg p-4">
            <p className="text-success font-medium">
              Welcome to IPG i-SMART! 🎉
            </p>
            <p className="text-success/90 text-sm mt-2">
              You can now access all features including trading, deposits, withdrawals, and more.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Redirecting to your dashboard in {countdown} seconds...
            </p>

            <Button 
              onClick={handleContinue}
              className="w-full"
              size="lg"
            >
              Continue to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Ready to start trading? Explore markets, deposit funds, or set up your wallet security.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerifiedScreen;