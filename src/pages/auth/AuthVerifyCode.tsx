import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { OTPInput } from "@/components/auth/OTPInput";
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
  const [otpError, setOtpError] = useState(false);

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

      if (error) {
        // Check if user already exists and needs password login
        if (error.message.includes('User already registered') || 
            error.message.includes('Email link is invalid') ||
            error.message.includes('Token has expired') ||
            error.message.includes('already confirmed')) {
          toast({
            title: "Account Already Exists",
            description: "Please sign in with your password instead",
          });
          navigate("/auth", { 
            state: { email, mode: 'login' },
            replace: true 
          });
          return;
        }
        throw error;
      }

      if (data.user) {
        // Capture referral after email verification
        const { captureReferralAfterEmailVerify } = await import('@/utils/referralCapture');
        await captureReferralAfterEmailVerify(data.user.id);

        // Check if user has completed security setup
        const { data: profile } = await supabase
          .from('profiles')
          .select('setup_complete')
          .eq('user_id', data.user.id)
          .maybeSingle();

        toast({
          title: "Email Verified! ✓",
          description: "Your account is now active",
          className: "bg-success/10 border-success/50 text-success",
        });

        if (!profile?.setup_complete) {
          navigate("/onboarding/security", { replace: true });
        } else {
          navigate("/app/home", { replace: true });
        }
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired code",
        variant: "destructive"
      });
      setOtp("");
      setOtpError(true);
      setTimeout(() => setOtpError(false), 2000);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    setOtpError(false);
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
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground mb-2">
                Enter the 6-digit code
              </div>
              
              <OTPInput
                value={otp}
                onChange={handleOtpChange}
                disabled={isVerifying}
                error={otpError}
                length={6}
                autoFocus
              />
            </div>

            {isVerifying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </motion.div>
            )}

            <div className="space-y-3 pt-2">
              <div className="pt-3 border-t border-border/50">
                <details className="group">
                  <summary className="flex items-center justify-center gap-2 text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors">
                    <AlertCircle className="w-4 h-4" />
                    <span>Didn't receive the code?</span>
                  </summary>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground px-4">
                    <p>• Check your spam/junk folder</p>
                    <p>• Verify the email address is correct</p>
                    <p>• Wait for the timer to request a new code</p>
                  </div>
                </details>
              </div>

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
                  <div className="flex items-center gap-2">
                    <div className="relative w-4 h-4">
                      <svg className="transform -rotate-90 w-4 h-4">
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 6}`}
                          strokeDashoffset={`${2 * Math.PI * 6 * (1 - resendCooldown / 30)}`}
                          className="text-primary transition-all duration-1000"
                        />
                      </svg>
                    </div>
                    Resend Code ({resendCooldown}s)
                  </div>
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
                  Code expires in 1 hour • Paste support enabled
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
