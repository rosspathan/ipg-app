import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper";

/**
 * AuthCheckEmail - Simple "check your email" screen
 * Shows after signup, tells user to click the magic link
 */
export default function AuthCheckEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const email = location.state?.email || "";

  const handleResendCode = async () => {
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      });

      if (error) throw error;

      toast({
        title: "Code Resent",
        description: "Check your inbox for the new verification code"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend code",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
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
              <Mail className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We sent a 6-digit verification code to
              <br />
              <span className="font-semibold text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert className="border-primary/30 bg-primary/5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription>
                Enter the code on the next screen to verify your account.
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              onClick={() => navigate("/auth/verify-code", { state: { email }, replace: true })}
            >
              I Have My Code →
            </Button>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Don't see the code? Check your spam folder.
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendCode}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Verification Code
                  </>
                )}
              </Button>
            </div>

            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                The verification code expires in 1 hour.
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
