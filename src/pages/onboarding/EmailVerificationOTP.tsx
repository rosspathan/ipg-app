import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, RefreshCw, Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { OTPInput } from "@/components/auth/OTPInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper";

interface EmailVerificationOTPProps {
  email: string;
  onVerified: (userId: string) => void;
  onBack: () => void;
}

/**
 * EmailVerificationOTP - Onboarding-specific OTP verification
 * Verifies email and establishes session before proceeding to wallet
 */
export default function EmailVerificationOTP({ email, onVerified, onBack }: EmailVerificationOTPProps) {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState(false);

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
        throw error;
      }

      if (data.user) {
        console.log('[ONBOARDING OTP] Email verified successfully:', data.user.id);
        
        // Auto-login with stored password if available
        const storedPassword = sessionStorage.getItem('verificationPassword');
        if (storedPassword) {
          await supabase.auth.signInWithPassword({
            email,
            password: storedPassword
          });
          sessionStorage.removeItem('verificationPassword');
        }

        toast.success("Email verified! ✓");
        onVerified(data.user.id);
      }
    } catch (error: any) {
      console.error('[ONBOARDING OTP] Verification failed:', error);
      toast.error(error.message || "Invalid or expired code");
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
          shouldCreateUser: false
        }
      });

      if (error) throw error;

      toast.success("Code resent! Check your inbox");

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
      toast.error(error.message || "Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-primary/5">
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
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code ({resendCooldown}s)
                  </>
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
          className="w-full"
          onClick={onBack}
          disabled={isVerifying}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Sign Up
        </Button>
      </div>
    </div>
  );
}
