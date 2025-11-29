import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, Check, X } from 'lucide-react';
import { z } from 'zod';
import Confetti from 'react-confetti';
import { PasswordResetProgress } from '@/components/auth/PasswordResetProgress';

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const ResetPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Get email and code from location state
    const emailFromState = location.state?.email;
    const codeFromState = location.state?.code;
    const verifiedFromState = location.state?.verified;

    if (!emailFromState || !codeFromState || !verifiedFromState) {
      toast({
        title: "Invalid Access",
        description: "Please verify your code first.",
        variant: "destructive"
      });
      navigate('/auth/forgot-password');
      return;
    }

    setEmail(emailFromState);
    setCode(codeFromState);
  }, [location, navigate, toast]);

  const passwordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (pass.length >= 12) strength++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[^a-zA-Z\d]/.test(pass)) strength++;
    return strength;
  };

  const getStrengthColor = (strength: number) => {
    if (strength <= 1) return 'bg-red-500';
    if (strength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength <= 1) return 'Weak';
    if (strength <= 3) return 'Medium';
    return 'Strong';
  };

  const handleResetPassword = async () => {
    // Validate passwords
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('complete-password-reset', {
        body: {
          email,
          code,
          newPassword: password,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setSuccess(true);
        setShowConfetti(true);
        toast({
          title: "Password Reset Successful!",
          description: "Your password has been updated. Redirecting to login...",
        });

        // Stop confetti after 5 seconds
        setTimeout(() => setShowConfetti(false), 5000);
        
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/auth/login'), 3000);
      } else {
        throw new Error(data?.error || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !success) {
      handleResetPassword();
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col items-center justify-center px-6">
        {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Password Reset!</h2>
            <p className="text-white/70">
              Your password has been successfully updated.
            </p>
            <p className="text-white/60 text-sm">
              Redirecting you to sign in...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const strength = passwordStrength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col">
      <div className="flex-1 flex flex-col px-6 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auth/verify-reset-code', { state: { email } })}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white ml-4">Reset Password</h1>
        </div>

        {/* Progress Indicator */}
        <PasswordResetProgress currentStep={3} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col justify-center space-y-6 max-w-md mx-auto w-full"
        >
          {/* Header */}
          <div className="text-center space-y-2 mb-4">
            <h2 className="text-3xl font-bold text-white">Create New Password</h2>
            <p className="text-white/70">
              Enter a strong password to secure your account
            </p>
          </div>

          {/* Password Requirements Checklist */}
          {password && (
            <div className="bg-white/10 rounded-lg p-4 space-y-2 mb-4">
              <p className="text-white/90 font-medium text-sm mb-2">Password Requirements:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {password.length >= 8 ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${password.length >= 8 ? 'text-green-300' : 'text-white/60'}`}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/[A-Z]/.test(password) ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${/[A-Z]/.test(password) ? 'text-green-300' : 'text-white/60'}`}>
                    One uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/[a-z]/.test(password) ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${/[a-z]/.test(password) ? 'text-green-300' : 'text-white/60'}`}>
                    One lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/\d/.test(password) ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${/\d/.test(password) ? 'text-green-300' : 'text-white/60'}`}>
                    One number
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {password === confirmPassword && password.length > 0 ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${password === confirmPassword && password.length > 0 ? 'text-green-300' : 'text-white/60'}`}>
                    Passwords match
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 pr-10"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded ${
                        i < strength ? getStrengthColor(strength) : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  strength <= 1 ? 'text-red-300' : 
                  strength <= 3 ? 'text-yellow-300' : 
                  'text-green-300'
                }`}>
                  Password strength: {getStrengthText(strength)}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleResetPassword}
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl text-lg mt-4"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
