import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react";
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * AuthEmailVerification - Post-signup email confirmation screen
 * Shows verification status and resend option
 */
export default function AuthEmailVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const email = location.state?.email || "";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address not found",
        variant: "destructive"
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/app/home`
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: "Verification email has been resent to " + email
      });
      setCountdown(60); // 60 second cooldown
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend email",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleProceedAnyway = () => {
    navigate("/app/home", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <HeaderLogoFlipper size="lg" />
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Mail className="h-16 w-16 text-primary animate-pulse" />
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-accent-foreground">1</span>
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to
              <br />
              <span className="font-semibold text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert className="border-primary/20 bg-primary/5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                Click the link in your email to verify your account and access the app
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={isResending || countdown > 0}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={handleProceedAnyway}
              >
                Proceed to App
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Didn't receive the email? Check your spam folder or contact support
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          className="w-full text-sm"
          onClick={() => navigate("/auth", { replace: true })}
        >
          ← Back to Sign In
        </Button>
      </div>
    </div>
  );
}
