import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

/**
 * AuthVerifyCode - 6-digit OTP verification screen
 * Professional, fast, and familiar UX (like WhatsApp/Telegram)
 */
export default function AuthVerifyCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const email = location.state?.email || "";

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Email Verified! ✓",
          description: "Your account is now active"
        });

        // Navigate to security setup (profile creation handled by DB trigger)
        navigate("/onboarding/security", { replace: true });
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired code",
        variant: "destructive"
      });
      setOtp(""); // Clear OTP on error
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    // Auto-submit when 6 digits entered
    if (value.length === 6) {
      handleVerifyOtp(value);
    }
  };

  const handleResendCode = async () => {
    if (!email || resendCooldown > 0) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false // Don't create new user, just resend
        }
      });

      if (error) throw error;

      toast({
        title: "Code Resent",
        description: "Check your inbox for the new verification code"
      });

      // Start 30s cooldown
      setResendCooldown(30);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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
            <CardTitle className="text-2xl">Verify Your Email</CardTitle>
            <CardDescription>
              Enter the 6-digit code sent to
              <br />
              <span className="font-semibold text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={handleOtpChange}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Don't see the code? Check your spam folder.
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendCode}
                disabled={isResending || resendCooldown > 0}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>Resend Code ({resendCooldown}s)</>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>

            <div className="pt-4 border-t border-border/50">
              <Alert className="border-primary/30 bg-primary/5">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  Code expires in 1 hour. Paste support enabled.
                </AlertDescription>
              </Alert>
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
