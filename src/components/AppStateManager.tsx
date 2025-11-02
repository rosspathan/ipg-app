import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuthLock } from '@/hooks/useAuthLock';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export const AppStateManager = () => {
  const { lock, isUnlockRequired } = useAuthLock();
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user has completed wallet setup
  useEffect(() => {
    const checkOnboardingCompletion = async () => {
      if (!user) return;
      
      const isAuthRoute = location.pathname.startsWith('/auth');
      const isOnboardingRoute = location.pathname.startsWith('/onboarding');
      const isLandingRoute = location.pathname === '/';
      
      // Don't check on auth, onboarding, or landing routes
      if (isAuthRoute || isOnboardingRoute || isLandingRoute) return;
      
      // CRITICAL: Don't interfere during active login
      const loginInProgress = sessionStorage.getItem('login_in_progress');
      if (loginInProgress) {
        console.log('[APP_STATE] Login in progress, skipping wallet checks');
        return;
      }
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('setup_complete, wallet_address')
          .eq('user_id', user.id)
          .maybeSingle();
        
        // Check if user has wallet in database
        if (!profile?.wallet_address) {
          const hasLocalWallet = !!localStorage.getItem('cryptoflow_wallet');
          
          // If no wallet anywhere, redirect existing users to auth import
          if (!hasLocalWallet) {
            console.log('[APP_STATE] No wallet found, redirecting to import');
            localStorage.setItem('ipg_return_path', location.pathname);
            navigate('/auth/import-wallet', { replace: true });
            return;
          }
        }
        
        // If setup is not complete, redirect to onboarding
        if (!profile?.setup_complete) {
          console.log('[APP_STATE] Wallet setup incomplete, redirecting to onboarding');
          localStorage.setItem('ipg_return_path', location.pathname);
          navigate('/onboarding/wallet', { replace: true });
        }
      } catch (error) {
        console.error('[APP_STATE] Error checking onboarding status:', error);
      }
    };

    checkOnboardingCompletion();
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Check if unlock is needed on initial app load (when app is reopened from task switcher)
    const checkInitialLockState = async () => {
      const isAuthRoute = location.pathname.startsWith('/auth') || 
                         location.pathname.startsWith('/onboarding');
      
      if (user && !isAuthRoute) {
        // Check if onboarding is completed
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!profile?.onboarding_completed_at) {
          // User hasn't finished onboarding, don't lock
          return;
        }

        const needsUnlock = await isUnlockRequired(false);
        if (needsUnlock) {
          console.log('App opened - lock required, redirecting to lock screen');
          // Store the intended destination before locking
          localStorage.setItem('ipg_return_path', location.pathname);
          navigate('/auth/lock', { replace: true });
        }
      }
    };

    // Check lock state immediately on mount
    checkInitialLockState();

    let pauseListener: any;
    let resumeListener: any;
    let urlListener: any;

    const setupListeners = async () => {
      // Handle app going to background - lock the app
      pauseListener = await CapacitorApp.addListener('pause', () => {
        console.log('App going to background - locking');
        if (user) {
          lock();
        }
      });

      // Handle app coming to foreground - check if unlock needed
      resumeListener = await CapacitorApp.addListener('resume', async () => {
        console.log('App resuming from background');
        
        // Don't lock if on auth/onboarding routes
        const isAuthRoute = location.pathname.startsWith('/auth') || 
                           location.pathname.startsWith('/onboarding');
        
        if (user && !isAuthRoute) {
          // Check if onboarding is completed
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed_at')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!profile?.onboarding_completed_at) {
            // User hasn't finished onboarding, don't lock
            return;
          }

          const needsUnlock = await isUnlockRequired(false);
          if (needsUnlock) {
            console.log('Redirecting to lock screen');
            // Store the intended destination before locking
            localStorage.setItem('ipg_return_path', location.pathname);
            navigate('/auth/lock', { replace: true });
          }
        }
      });

      // Handle deep links (referral links)
      urlListener = await CapacitorApp.addListener('appUrlOpen', (event) => {
        console.log('Deep link opened:', event.url);
        
        const url = new URL(event.url);
        const path = url.pathname;
        
        // Handle referral links: ismart://i-smartapp.com/r/CODE
        if (path.includes('/r/')) {
          const referralCode = path.split('/r/')[1];
          if (referralCode) {
            console.log('Referral code detected:', referralCode);
            navigate(`/r/${referralCode}`);
          }
        } else if (path.includes('/deeplink/r/')) {
          const referralCode = path.split('/deeplink/r/')[1];
          if (referralCode) {
            console.log('Deep link referral code detected:', referralCode);
            navigate(`/deeplink/r/${referralCode}`);
          }
        } else {
          // Navigate to the path from deep link
          navigate(path + url.search);
        }
      });
    };

    setupListeners();

    // Cleanup listeners
    return () => {
      if (pauseListener) pauseListener.remove();
      if (resumeListener) resumeListener.remove();
      if (urlListener) urlListener.remove();
    };
  }, [user, lock, isUnlockRequired, navigate, location.pathname]);

  return null;
};
