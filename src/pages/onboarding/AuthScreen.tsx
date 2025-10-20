import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, Shield, ArrowRight, ChevronLeft } from "lucide-react";
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

interface AuthScreenProps {
  onAuthComplete: (email: string, userId: string) => void;
  onBack: () => void;
}

/**
 * AuthScreen - Onboarding-specific auth (sign up/login)
 * Establishes Supabase session before wallet creation
 */
export default function AuthScreen({ onAuthComplete, onBack }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message || "Failed to sign in");
        return;
      }

      if (data.user) {
        console.log('[ONBOARDING AUTH] Sign in successful:', data.user.id);
        onAuthComplete(email, data.user.id);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = registerSchema.safeParse({ email, password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store credentials temporarily for later user creation (after OTP verification)
      sessionStorage.setItem('verificationEmail', email);
      sessionStorage.setItem('verificationPassword', password);
      sessionStorage.setItem('verificationCode', verificationCode);
      
      console.log('🚀 [AUTH] Sending verification email to:', email);
      console.log('📧 [AUTH] Generated code:', verificationCode);
      
      // Send custom branded email with verification code
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: email.trim(),
          verificationCode: verificationCode,
          userName: email.split('@')[0],
          isOnboarding: true
        }
      });

      console.log('✅ [AUTH] Edge function response:', { data: emailData, error: emailError });

      if (emailError) {
        console.error('❌ [AUTH] Email send failed:', emailError);
        setError('Failed to send verification email. Please try again.');
        toast.error('Failed to send verification email');
        return;
      }

      console.log('✅ [AUTH] Verification email sent successfully');
      toast.success('Verification email sent! Check your inbox');
      onAuthComplete(email, ''); // userId will be set after OTP verification
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <HeaderLogoFlipper size="lg" />
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Create Your Account</CardTitle>
            <CardDescription className="text-center">
              {mode === "login" 
                ? "Sign in to continue setup" 
                : "First, let's secure your account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="register">
                  Sign Up
                </TabsTrigger>
                <TabsTrigger value="login">
                  Sign In
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-4 animate-fade-in">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                  </div>

                  <Button type="submit" className="w-full mt-6 group" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        Sign In & Continue
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password
                    </Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Confirm Password
                    </Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                  </div>

                  <Button type="submit" className="w-full mt-6 group" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          className="w-full"
          onClick={onBack}
          disabled={isLoading}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Welcome
        </Button>
      </div>
    </div>
  );
}
