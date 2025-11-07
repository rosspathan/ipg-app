import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, ArrowLeft, Loader2, Check, X, Gift } from 'lucide-react';
import { z } from 'zod';
import { useReferralCodeValidation } from '@/hooks/useReferralCodeValidation';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const SignupScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referralCode, setReferralCode] = useState<string>('');
  const [isAlreadyAuthenticated, setIsAlreadyAuthenticated] = useState(false);
  
  // Real-time referral code validation (ignore self-referral during signup)
  const { isValid, sponsorUsername, loading: validating, error: validationError } = useReferralCodeValidation(referralCode, { ignoreSelfReferral: true });

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthenticated = async () => {
      if (loading) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[SIGNUP] User already authenticated:', session.user.email);
        setIsAlreadyAuthenticated(true);
      }
    };
    
    checkAuthenticated();
  }, [loading]);

  // Optional: Pre-populate referral code from URL parameter (?ref=CODE) for convenience
  useEffect(() => {
    const refFromUrl = searchParams.get('ref') || searchParams.get('code') || searchParams.get('r') || undefined;
    if (refFromUrl && !referralCode) {
      const upperCode = refFromUrl.toUpperCase();
      setReferralCode(upperCode);
      console.log('[SIGNUP] Pre-populated referral code from URL:', upperCode);
    }
  }, [searchParams, referralCode]);

  const passwordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) strength++;
    if (pwd.match(/[0-9]/)) strength++;
    if (pwd.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const strength = passwordStrength(password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setIsAlreadyAuthenticated(false);
      toast({
        title: "Signed Out",
        description: "You've been signed out successfully"
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign Out Failed",
        description: error.message || "Could not sign out",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setErrors({});
    
    // Validate input
    const validation = signupSchema.safeParse({ email, password, confirmPassword });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the Terms of Service",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Create timeout promise (30 seconds)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Signup timeout - please try again')), 30000)
    );

    // Create signup promise
    const signupPromise = async () => {
      const redirectUrl = `${window.location.origin}/`;

      // Save referral code before signUp to avoid race conditions
      if (referralCode.trim()) {
        localStorage.setItem('ismart_signup_ref', referralCode.toUpperCase());
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        // Handle "user already exists" error specifically
        if (error.message?.toLowerCase().includes('already') || error.status === 400 || error.status === 422) {
          toast({
            title: "Account Exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive"
          });
          setTimeout(() => navigate('/auth/login'), 2000);
          return;
        }
        throw error;
      }

      if (data.user) {
        console.log('[SIGNUP] User created:', data.user.id);
        
        // Store referral code and email for later processing
        if (referralCode.trim()) {
          localStorage.setItem('ismart_signup_ref', referralCode.toUpperCase());
        }
        sessionStorage.setItem('lastSignupEmail', email.trim());

        // Check if email confirmation is required
        if (data.session) {
          // Session exists - user is signed in, proceed to celebration
          console.log('✅ Account created with active session');
          
          // Capture referral in background (non-blocking)
          try {
            const { captureReferralAfterSignup } = await import('@/utils/referralCapture');
            // Fire-and-forget with a 10s cap so it never blocks navigation
            Promise.race([
              captureReferralAfterSignup(data.user.id),
              new Promise<void>((resolve) => setTimeout(resolve, 10000))
            ])
              .then(() => {
                console.log('[SIGNUP] ✓ Referral capture triggered');
              })
              .catch((err) => {
                console.warn('[SIGNUP] Referral capture error (non-blocking):', err);
              });
          } catch (err) {
            console.warn('[SIGNUP] Failed to trigger referral capture:', err);
          }
          
          navigate('/onboarding/account-created');
        } else {
          // No session - email confirmation required
          console.log('📧 Email confirmation required');
          navigate('/auth/check-email');
        }
      }
    };

    try {
      // Race between signup and timeout
      await Promise.race([signupPromise(), timeoutPromise]);
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Only show error toast if we haven't already handled it
      if (!error.message?.includes('timeout')) {
        toast({
          title: "Signup Failed",
          description: error.message || "Could not create account. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Request Timeout",
          description: "The request took too long. Please check your connection and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col">
      <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white ml-4">Create Account</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 space-y-6 max-w-md mx-auto w-full"
        >
          {/* Already Authenticated Message */}
          {isAlreadyAuthenticated && (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-4">
              <div className="text-center space-y-2">
                <p className="text-white font-semibold">You're already signed in</p>
                <p className="text-white/70 text-sm">You need to sign out before creating a new account</p>
              </div>
              <Button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full bg-white text-primary hover:bg-white/90 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing Out...
                  </>
                ) : (
                  'Sign Out'
                )}
              </Button>
            </div>
          )}

          {/* Referral Code Input - Made fully optional */}
          <div className="space-y-2">
            <Label htmlFor="referralCode" className="text-white/80 flex items-center gap-2 text-sm">
              <Gift className="w-4 h-4" />
              Referral Code (Optional - Skip if you don't have one)
            </Label>
            <div className="relative">
              <Input
                id="referralCode"
                type="text"
                placeholder="Enter sponsor's code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 uppercase"
                maxLength={36}
              />
              {referralCode && validating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-white/60" />
                </div>
              )}
              {referralCode && !validating && isValid && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
              )}
              {referralCode && !validating && !isValid && validationError && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-5 h-5 text-red-400" />
                </div>
              )}
            </div>
            
            {/* Validation Feedback */}
            {referralCode && !validating && isValid && sponsorUsername && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-300 text-sm font-medium flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Sponsor Confirmed: {sponsorUsername}
                </p>
              </div>
            )}
            
            {referralCode && !validating && validationError && (
              <p className="text-red-300 text-sm flex items-center gap-1">
                <X className="w-5 h-5" /> {validationError}
              </p>
            )}
            
            {!referralCode && (
              <p className="text-white/50 text-xs">
                Don't have a code? No problem! You can continue without one.
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
            />
            {errors.email && (
              <p className="text-red-300 text-sm">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Strength */}
            {password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i < strength ? strengthColors[strength - 1] : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                {strength > 0 && (
                  <p className="text-white/70 text-xs">{strengthLabels[strength - 1]} password</p>
                )}
              </div>
            )}
            
            {errors.password && (
              <p className="text-red-300 text-sm flex items-center gap-1">
                <X className="w-5 h-5" /> {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
            />
            {confirmPassword && password === confirmPassword && (
              <p className="text-green-300 text-sm flex items-center gap-1">
                <Check className="w-5 h-5" /> Passwords match
              </p>
            )}
            {errors.confirmPassword && (
              <p className="text-red-300 text-sm flex items-center gap-1">
                <X className="w-5 h-5" /> {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-primary"
            />
            <Label
              htmlFor="terms"
              className="text-white/80 text-sm leading-relaxed cursor-pointer"
            >
              I agree to the{' '}
              <a href="#" className="text-white underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-white underline">Privacy Policy</a>
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSignup}
            disabled={loading || !agreedToTerms}
            className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-white/70 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/auth/login')}
                className="text-white font-semibold underline hover:no-underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignupScreen;
