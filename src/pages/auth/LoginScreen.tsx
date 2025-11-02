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
import { hasAnySecurity } from '@/utils/localSecurityStorage';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const LOGIN_TIMEOUT = 15000; // 15 seconds timeout

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
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount - always reset loading state
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
      setLoading(false);
      loadingRef.current = false;
      isProcessingRef.current = false;
      sessionStorage.removeItem('login_in_progress');
    };
  }, []);

  const handleLogin = async () => {
    // Prevent double-clicks and multiple simultaneous login attempts
    if (isProcessingRef.current || loadingRef.current) {
      console.log('[LOGIN] Already processing, ignoring duplicate request');
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

    // Clear previous error
    setInlineError('');

    // Set all loading guards
    isProcessingRef.current = true;
    loadingRef.current = true;
    setLoading(true);
    
    console.log('[LOGIN] Step 1: Starting authentication');
    
    // Set flag to prevent validation during login
    sessionStorage.setItem('login_in_progress', 'true');

    // UI watchdog: force-reset after 20s if something hangs
    watchdogTimerRef.current = setTimeout(() => {
      console.error('[LOGIN] WATCHDOG: Login hung for 20s, forcing reset');
      sessionStorage.removeItem('login_in_progress');
      if (mountedRef.current) {
        setLoading(false);
        setInlineError('Login took too long. Please try again.');
        toast({
          title: "Login Timeout",
          description: "The request took too long. Please check your connection and try again.",
          variant: "destructive",
        });
      }
      loadingRef.current = false;
      isProcessingRef.current = false;
      watchdogTimerRef.current = null;
    }, 20000);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Login timeout - please try again')), LOGIN_TIMEOUT)
    );

    // Create login promise
    const loginPromise = async () => {
      try {
        console.log('[LOGIN] Step 2: Calling Supabase auth');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          console.error('[LOGIN] Auth error:', error);
          
          // Handle common auth errors with friendly messages
          let userMessage = error.message || "Invalid email or password";
          
          if (error.status === 400 || error.message?.toLowerCase().includes('invalid') || error.message?.toLowerCase().includes('credentials')) {
            userMessage = "Invalid email or password. Please check and try again.";
          } else if (!navigator.onLine) {
            userMessage = "You're offline. Please check your connection.";
          }
          
          setInlineError(userMessage);
          throw error;
        }
        console.log('[LOGIN] Step 3: Auth successful');

        if (!data.session) {
          throw new Error('No session returned');
        }

        // Immediately navigate to app home; AppStateManager will handle redirects
        // Use hard navigation fallback if component unmounted mid-flow
        const target = '/app/home';
        if (mountedRef.current) {
          console.log('[LOGIN] Immediate post-login navigate to', target);
          navigate(target, { replace: true });
        } else {
          console.log('[LOGIN] Component unmounted early, forcing navigation to', target);
          window.location.assign(target);
        }
        return;
        
        // Check for wallet existence - Use .maybeSingle() to prevent errors
        const hasLocalWallet = !!localStorage.getItem('cryptoflow_wallet');
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('user_id', data.user.id)
          .maybeSingle(); // ✅ Safe - returns null instead of throwing
        
        console.log('[LOGIN] Step 5: Profile fetched', { hasProfile: !!profile, hasWalletInDB: !!profile?.wallet_address });
        
        const hasWalletInDB = !!profile?.wallet_address;
        
        // Non-blocking session conflict check - runs in background
        if (hasLocalWallet) {
          console.log('[LOGIN] Step 6: Checking wallet conflicts (non-blocking)');
          const storedWallet = localStorage.getItem('cryptoflow_wallet');
          if (storedWallet) {
            // Run conflict check in background without blocking
            setTimeout(async () => {
              try {
                const walletData = JSON.parse(storedWallet);
                const { detectAndResolveSessionConflict } = await import('@/utils/sessionConflictDetector');
                const conflictResult = await detectAndResolveSessionConflict(walletData.address);
                
                if (conflictResult.conflict && !conflictResult.resolved) {
                  console.warn('[LOGIN] Wallet conflict detected, clearing local wallet');
                  toast({
                    title: "Wallet Mismatch",
                    description: "Your wallet belongs to a different account. Please reconnect your wallet.",
                    variant: "destructive"
                  });
                  localStorage.removeItem('cryptoflow_wallet');
                }
              } catch (conflictError) {
                console.error('[LOGIN] Error checking session conflict:', conflictError);
              }
            }, 0);
          }
        }
        
        console.log('[LOGIN] Step 7: Determining navigation path');
        
        // If no wallet anywhere, must import
        if (!hasLocalWallet && !hasWalletInDB) {
          console.log('[LOGIN] Step 8: No wallet found, navigating to import');
          if (mountedRef.current) {
            navigate('/auth/import-wallet');
          }
          return;
        }
        
        // If wallet in DB but not local, need to import
        if (!hasLocalWallet && hasWalletInDB) {
          console.log('[LOGIN] Step 8: Wallet in DB only, navigating to import');
          if (mountedRef.current) {
            navigate('/auth/import-wallet');
          }
          return;
        }

        console.log('[LOGIN] Step 8: Checking security status');
        
        // Check if user has security setup (modern or legacy)
        const hasSecurity = hasAnySecurity();
        
        if (!hasSecurity) {
          console.log('[LOGIN] Step 9: No security, navigating to setup');
          if (mountedRef.current) {
            navigate('/onboarding/security');
          }
        } else {
          console.log('[LOGIN] Step 9: Has security, checking lock state');
          // Has security, check if session is still valid
          const lockStateRaw = localStorage.getItem('cryptoflow_lock_state');
          let isUnlocked = false;
          try {
            if (lockStateRaw) {
              const parsed = JSON.parse(lockStateRaw);
              const sessionTimeout = (parsed.sessionLockMinutes || 30) * 60 * 1000;
              const timeSinceUnlock = Date.now() - (parsed.lastUnlockAt || 0);
              isUnlocked = parsed.isUnlocked === true && timeSinceUnlock < sessionTimeout;
            }
          } catch {
            isUnlocked = false;
          }
          
          if (isUnlocked) {
            console.log('[LOGIN] Step 10: Session valid, navigating to home');
            if (mountedRef.current) {
              navigate('/app/home');
            }
          } else {
            console.log('[LOGIN] Step 10: Session expired, navigating to lock screen');
            if (mountedRef.current) {
              navigate('/auth/lock');
            }
          }
        }

        console.log('[LOGIN] Step 11: Login flow complete');
      } catch (error: any) {
        console.error('[LOGIN] Error during login flow:', error);
        
        // Set inline error if not already set
        if (!inlineError && mountedRef.current) {
          setInlineError(error.message || "Invalid email or password");
        }
        throw error;
      }
    };

    try {
      // Race between login and timeout
      await Promise.race([loginPromise(), timeoutPromise]);
    } catch (error: any) {
      console.error('[LOGIN] Login failed:', error);
      if (mountedRef.current) {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid email or password",
          variant: "destructive"
        });
      }
    } finally {
      // Clear watchdog
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      
      // Always clean up, even if component unmounted
      sessionStorage.removeItem('login_in_progress');
      
      // Only update state if still mounted
      if (mountedRef.current) {
        setLoading(false);
      }
      
      // Always reset refs
      loadingRef.current = false;
      isProcessingRef.current = false;
      
      console.log('[LOGIN] Cleanup complete');
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
