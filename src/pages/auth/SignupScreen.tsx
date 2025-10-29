import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, ArrowLeft, Loader2, Check, CheckCircle, X, Gift, AlertTriangle, Mail } from 'lucide-react';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useReferralCodeValidation } from '@/hooks/useReferralCodeValidation';
// @ts-ignore
import Mailcheck from 'mailcheck';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  confirmEmail: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.email === data.confirmEmail, {
  message: "Email addresses don't match",
  path: ["confirmEmail"]
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
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referralCode, setReferralCode] = useState<string>('');
  const [emailSuggestion, setEmailSuggestion] = useState<string>('');
  
  // Real-time referral code validation (ignore self-referral during signup)
  const { isValid, sponsorUsername, loading: validating, error: validationError } = useReferralCodeValidation(referralCode, { ignoreSelfReferral: true });

  // Smart email typo detection
  useEffect(() => {
    if (email && email.includes('@')) {
      Mailcheck.run({
        email: email,
        suggested: (suggestion: { full: string }) => {
          setEmailSuggestion(suggestion.full);
        },
        empty: () => {
          setEmailSuggestion('');
        }
      });
    } else {
      setEmailSuggestion('');
    }
  }, [email]);

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

  const handleSignup = async () => {
    setErrors({});
    
    // Validate input
    const validation = signupSchema.safeParse({ email, confirmEmail, password, confirmPassword });
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

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      if (data.user) {
        // Store referral code for later processing
        if (referralCode.trim()) {
          localStorage.setItem('ismart_signup_ref', referralCode.toUpperCase());
        }
        navigate('/onboarding/account-created');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive"
      });
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
          {/* Referral Code Input */}
          <div className="space-y-2">
            <Label htmlFor="referralCode" className="text-white">
              Referral Code (Optional)
            </Label>
            <div className="relative">
              <Input
                id="referralCode"
                type="text"
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 uppercase"
                maxLength={36}
              />
              {referralCode && validating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                </div>
              )}
              {referralCode && !validating && isValid && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
              )}
              {referralCode && !validating && !isValid && validationError && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-red-400" />
                </div>
              )}
            </div>
            
            {/* Validation Feedback */}
            {referralCode && !validating && isValid && sponsorUsername && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-300 text-sm font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Sponsor Confirmed: {sponsorUsername}
                </p>
              </div>
            )}
            
            {referralCode && !validating && validationError && (
              <p className="text-red-300 text-sm flex items-center gap-1">
                <X className="w-4 h-4" /> {validationError}
              </p>
            )}
            
            {!referralCode && (
              <p className="text-white/60 text-xs">
                Have a referral code? Enter it to join your sponsor's network
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
              <p className="text-red-300 text-sm flex items-center gap-1">
                <X className="w-4 h-4" /> {errors.email}
              </p>
            )}
            {emailSuggestion && emailSuggestion !== email && (
              <Alert className="bg-blue-500/20 border-blue-500/30">
                <AlertTriangle className="h-4 w-4 text-blue-300" />
                <AlertDescription className="text-blue-300 text-sm">
                  Did you mean{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setEmail(emailSuggestion);
                      setEmailSuggestion('');
                    }} 
                    className="underline font-medium hover:text-blue-200"
                  >
                    {emailSuggestion}
                  </button>?
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Confirm Email */}
          <div className="space-y-2">
            <Label htmlFor="confirmEmail" className="text-white">Confirm Email Address</Label>
            <Input
              id="confirmEmail"
              type="email"
              placeholder="Confirm your email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
            />
            {errors.confirmEmail && (
              <p className="text-red-300 text-sm flex items-center gap-1">
                <X className="w-4 h-4" /> {errors.confirmEmail}
              </p>
            )}
            {email && confirmEmail && email === confirmEmail && !errors.email && !errors.confirmEmail && (
              <p className="text-green-300 text-sm flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Email addresses match
              </p>
            )}
          </div>

          {/* Email Preview - Show where verification will be sent */}
          {email && confirmEmail && email === confirmEmail && !errors.email && (
            <Alert className="bg-white/10 border-white/30">
              <Mail className="h-4 w-4 text-white" />
              <AlertDescription className="text-white text-sm">
                <strong>Verification code will be sent to:</strong><br/>
                <span className="text-base font-mono mt-1 block">{email}</span>
              </AlertDescription>
            </Alert>
          )}

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
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                <X className="w-4 h-4" /> {errors.password}
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
                <Check className="w-4 h-4" /> Passwords match
              </p>
            )}
            {errors.confirmPassword && (
              <p className="text-red-300 text-sm flex items-center gap-1">
                <X className="w-4 h-4" /> {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-primary"
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
