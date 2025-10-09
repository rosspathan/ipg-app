import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle2, RefreshCw, Link as LinkIcon } from "lucide-react";
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractUsernameFromEmail } from "@/lib/user/username";

/**
 * AuthEmailVerification - Post-signup email confirmation screen
 * Shows verification status and resend option
 */
export default function AuthEmailVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes
  const [code, setCode] = useState("");
  const [showMagicLink, setShowMagicLink] = useState(false);

  const email = location.state?.email || "";

  // Log OTP mode
  useEffect(() => {
    console.info('OTP_EMAIL_V1_ACTIVE');
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Cache verification email so the app can derive a username without an auth session
  useEffect(() => {
    try {
      const directEmail = email;
      let fallbackEmail = '';
      if (!directEmail) {
        const raw = localStorage.getItem('ipg_onboarding_state');
        if (raw) {
          try { fallbackEmail = JSON.parse(raw)?.email || ''; } catch {}
        }
      }
      const toCache = directEmail || fallbackEmail;
      if (toCache) {
        sessionStorage.setItem('verificationEmail', toCache);
        window.dispatchEvent(new Event('verification:email-updated'));
      }
    } catch {}
  }, [email]);

  const handleVerifyCode = async () => {
    const cleaned = code.replace(/\D/g, '').trim();
    if (cleaned.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleaned,
        type: 'email'
      });

      if (error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('expired') || errorMsg.includes('invalid')) {
          toast({
            title: "Code Expired",
            description: "We sent a new code to your email",
          });
          await handleResendEmail();
          return;
        }

        if (errorMsg.includes('email_provider') || errorMsg.includes('disabled')) {
          setShowMagicLink(true);
          toast({
            title: "Configuration Issue",
            description: "Please use the magic link option below",
            variant: "destructive"
          });
          return;
        }

        throw error;
      }

      if (data.session) {
        const user = data.session.user;

        // Cache verified email for immediate display name derivation
        try {
          if (user?.email) {
            sessionStorage.setItem('verificationEmail', user.email);
          } else if (email) {
            sessionStorage.setItem('verificationEmail', email);
          }
          window.dispatchEvent(new Event('verification:email-updated'));
        } catch {}
        
        // Backfill username
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!profile?.username) {
            const username = extractUsernameFromEmail(user.email, user.id);
            await supabase
              .from('profiles')
              .update({ username })
              .eq('user_id', user.id);
          }
        } catch (e) {
          console.warn('Username backfill failed:', e);
        }

        toast({
          title: "Email Verified!",
          description: "Welcome to IPG I-SMART"
        });

        setTimeout(() => {
          navigate("/app/home", { replace: true });
        }, 800);
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setShowMagicLink(true);
    } finally {
      setIsVerifying(false);
    }
  };

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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      toast({
        title: "Code Resent",
        description: "A new 6-digit code has been sent to " + email
      });
      setCountdown(600);
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

  const handleMagicLink = async () => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      toast({
        title: "Magic Link Sent",
        description: "Check your email for the sign-in link"
      });
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCodeChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(cleanValue);
    
    if (cleanValue.length === 6) {
      setTimeout(() => handleVerifyCode(), 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Dev ribbon */}
      <div data-testid="dev-ribbon" className="fixed top-1 right-1 z-50 text-[10px] px-2 py-1 rounded bg-indigo-600/80 text-white">
        OTP EMAIL v1
      </div>

      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <HeaderLogoFlipper size="lg" />
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Mail className="h-16 w-16 text-primary animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
            <CardDescription>
              We sent a 6-digit code to
              <br />
              <span className="font-semibold text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                data-testid="email-otp-input"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                  handleCodeChange(paste);
                }}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                disabled={isVerifying}
                maxLength={6}
              />
              
              <div className="flex justify-center space-x-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i < code.length ? 'bg-primary scale-110' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>

            <Button
              data-testid="email-otp-submit"
              onClick={handleVerifyCode}
              disabled={isVerifying || code.length !== 6}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verify Code
                </>
              )}
            </Button>

            <div className="space-y-2">
              <Button
                data-testid="email-otp-resend"
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
                  `Resend in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>

              {showMagicLink && (
                <Button
                  data-testid="email-otp-fallback-magic"
                  variant="outline"
                  className="w-full border-amber-400/50 text-amber-600 hover:bg-amber-50"
                  onClick={handleMagicLink}
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Send Magic Link Instead
                </Button>
              )}
            </div>

            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Code expires in 10 minutes. Check spam folder if not received.
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
