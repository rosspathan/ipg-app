import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Shield } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { extractUsernameFromEmail } from "@/lib/user/username";
import { storeEvmAddressTemp } from "@/lib/wallet/evmAddress";
import { useWeb3 } from "@/contexts/Web3Context";

const AuthEmailOTP = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { wallet } = useWeb3();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/app/home`,
        },
      });

      if (error) throw error;

      console.log('OTP_SENT');
      
      toast({
        title: "OTP Sent!",
        description: "Check your email for the verification code",
      });
      
      setStep("verify");
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      console.log('OTP_OK');

      const userId = data.user?.id;
      if (!userId) throw new Error('No user ID');

      // Create/upsert profile with username
      const username = extractUsernameFromEmail(email, userId);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          email: email.trim().toLowerCase(),
          username,
          wallet_address: wallet?.address || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        });

      if (profileError) {
        console.error('Profile upsert error:', profileError);
      }

      // If wallet exists, store address temporarily
      if (wallet?.address) {
        storeEvmAddressTemp(wallet.address);
      }

      toast({
        title: "Success!",
        description: "You're logged in",
      });

      setTimeout(() => {
        navigate("/app/home");
      }, 500);

    } catch (error: any) {
      console.error('OTP verify error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 pb-safe">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img 
            src="/lovable-uploads/a9cfc5de-7126-4662-923b-cc0348077e3d.png" 
            alt="I-SMART Logo" 
            className="w-20 h-20 rounded-2xl mx-auto object-contain mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">
            {step === "email" ? "Sign In" : "Verify Email"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === "email" 
              ? "Enter your email to receive a login code" 
              : "Enter the 6-digit code sent to your email"}
          </p>
        </div>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {step === "email" ? <Mail className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              {step === "email" ? "Email Login" : "Verification Code"}
            </CardTitle>
            <CardDescription className="text-sm">
              {step === "email" 
                ? "We'll send you a one-time code" 
                : `Code sent to ${email}`}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {step === "email" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="otp-email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    disabled={loading}
                  />
                </div>

                <Button 
                  data-testid="otp-send"
                  onClick={handleSendOTP}
                  disabled={loading || !email.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Code
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={loading}
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
                </div>

                <Button 
                  data-testid="otp-verify"
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full"
                  size="lg"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify & Login
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setStep("email")}
                  disabled={loading}
                  className="w-full"
                  size="sm"
                >
                  Use Different Email
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {step === "email" && (
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate("/onboarding")}
              className="text-sm text-muted-foreground"
            >
              Don't have a wallet? Create one
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthEmailOTP;
