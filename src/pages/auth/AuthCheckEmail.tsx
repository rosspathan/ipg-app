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
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verified`
        }
      });

      if (error) throw error;

      toast({
        title: "Email Resent",
        description: "Check your inbox for the confirmation link"
      });
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
              We sent a confirmation link to
              <br />
              <span className="font-semibold text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert className="border-primary/30 bg-primary/5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription>
                Click the link in your email to verify your account and continue to security setup.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Don't see the email? Check your spam folder.
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
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
                    Resend Confirmation Email
                  </>
                )}
              </Button>
            </div>

            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                The confirmation link expires in 24 hours.
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
