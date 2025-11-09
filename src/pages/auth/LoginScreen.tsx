import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// Role check with timeout to prevent hangs - increased timeout for better reliability
async function checkAdminWithTimeout(userId: string, ms = 3000): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms));
  const rpc = (async () => {
    try {
      const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      return !!data;
    } catch (error) {
      console.error('[LOGIN] Admin check error:', error);
      return false;
    }
  })();
  return Promise.race([rpc, timeout]);
}

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string>('');
  
  // Refs for safety checks
  const isProcessingRef = useRef(false);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  // Optional: Force logout on ?force=1 for testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('force') === '1') {
      supabase.auth.signOut().catch(() => {});
      // Clear legacy keys
      localStorage.removeItem('cryptoflow_lock_state');
      localStorage.removeItem('user_pin_hash');
      localStorage.removeItem('user_pin_salt');
      localStorage.removeItem('biometric_enabled');
      localStorage.removeItem('biometric_cred_id');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      setLoading(false);
      loadingRef.current = false;
      isProcessingRef.current = false;
      sessionStorage.removeItem('login_in_progress');
    };
  }, []);


  const handleLogin = async () => {
    // Prevent double-clicks
    if (isProcessingRef.current || loadingRef.current) {
      return;
    }

    // Validate input
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      setInlineError(firstError.message);
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive"
      });
      return;
    }

    setInlineError('');
    isProcessingRef.current = true;
    loadingRef.current = true;
    setLoading(true);
    sessionStorage.setItem('login_in_progress', 'true');

    try {
      // Clear legacy security keys
      localStorage.removeItem('cryptoflow_lock_state');
      localStorage.removeItem('user_pin_hash');
      localStorage.removeItem('user_pin_salt');
      localStorage.removeItem('biometric_enabled');
      localStorage.removeItem('biometric_cred_id');

      // Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        let userMessage = "Invalid email or password";
        if (error.status === 400 || error.message?.toLowerCase().includes('invalid')) {
          userMessage = "Invalid email or password. Please check and try again.";
        } else if (!navigator.onLine) {
          userMessage = "You're offline. Please check your connection.";
        }
        setInlineError(userMessage);
        throw error;
      }

      if (!data.session) {
        throw new Error('No session returned');
      }

      // Session integrity check
      const sessionEmail = data.session.user.email?.toLowerCase();
      const enteredEmail = email.trim().toLowerCase();
      if (sessionEmail !== enteredEmail) {
        await supabase.auth.signOut();
        setInlineError('Account mismatch detected. Please try again.');
        throw new Error('Session verification failed');
      }

      // ✅ Auth successful - clear flags and navigate
      console.log('[LOGIN] Auth successful, redirecting...');
      sessionStorage.removeItem('login_in_progress');
      setLoading(false);
      loadingRef.current = false;
      isProcessingRef.current = false;

      // ✅ Navigate immediately
      navigate('/dashboard', { 
        replace: true,
        state: { fromLogin: true }
      });
      
      // ✅ Show success toast (non-blocking)
      setTimeout(() => {
        toast({
          title: "Signed in successfully",
          description: "Welcome back!",
        });
      }, 100);

      // ✅ Check admin role silently in background (completely async)
      setTimeout(async () => {
        try {
          const isAdmin = await checkAdminWithTimeout(data.session.user.id, 2000);
          if (isAdmin && mountedRef.current) {
            console.log('[LOGIN] Admin detected, redirecting to admin...');
            navigate('/admin/dashboard', { replace: true });
          }
        } catch (err) {
          console.log('[LOGIN] Admin check failed, user stays at /app/home');
        }
      }, 0);

      return; // Exit early to avoid finally block

    } catch (error: any) {
      console.error('[LOGIN] Login failed:', error);
      
      // ✅ Clear loading states on error
      sessionStorage.removeItem('login_in_progress');
      setLoading(false);
      loadingRef.current = false;
      isProcessingRef.current = false;
      
      if (mountedRef.current) {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid email or password",
          variant: "destructive"
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleLogin();
    }
  };

  // Clear inline error when user types
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (inlineError) setInlineError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (inlineError) setInlineError('');
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
              onChange={handleEmailChange}
              onKeyDown={handleKeyDown}
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
                onChange={handlePasswordChange}
                onKeyDown={handleKeyDown}
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
          
          {inlineError && (
            <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg text-center -mt-2">
              {inlineError}
            </p>
          )}

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
