import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { hasAnySecurity } from '@/utils/localSecurityStorage';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validate input
    const validation = loginSchema.safeParse({ email, password });
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.session) {
        toast({
          title: "Welcome Back!",
          description: "Signing you in...",
        });

        // Check if user has security setup (modern or legacy)
        const hasSecurity = hasAnySecurity();
        
        if (!hasSecurity) {
          // First time user or no security setup yet
          navigate('/onboarding/security');
        } else {
          // Has security, check if already unlocked
          const lockStateRaw = localStorage.getItem('cryptoflow_lock_state');
          let isUnlocked = false;
          try {
            isUnlocked = lockStateRaw ? JSON.parse(lockStateRaw).isUnlocked === true : false;
          } catch {
            isUnlocked = false;
          }
          
          if (isUnlocked) {
            navigate('/app/home');
          } else {
            navigate('/auth/lock');
          }
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col">
      <div className="flex-1 flex flex-col px-6 py-8">
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
          <h1 className="text-2xl font-bold text-white ml-4">Sign In</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col justify-center space-y-6 max-w-md mx-auto w-full"
        >
          {/* Welcome Message */}
          <div className="text-center space-y-2 mb-4">
            <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
            <p className="text-white/70">Sign in to your account to continue</p>
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
              onKeyPress={handleKeyPress}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
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
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <button
              onClick={() => navigate('/auth/forgot-password')}
              className="text-white/70 hover:text-white text-sm underline"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-white/70 text-sm">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/auth/signup')}
                className="text-white font-semibold underline hover:no-underline"
              >
                Create Account
              </button>
            </p>
          </div>

          {/* Wallet Recovery */}
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-white/70 text-sm mb-2">
              Lost access to your account?
            </p>
            <button
              onClick={() => navigate('/auth/recover')}
              className="text-white font-semibold underline hover:no-underline text-sm"
            >
              Recover wallet with recovery phrase
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginScreen;
