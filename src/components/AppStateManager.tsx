import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuthLock } from '@/hooks/useAuthLock';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export const AppStateManager = () => {
  const { lock, isUnlockRequired } = useAuthLock();
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

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
      resumeListener = await CapacitorApp.addListener('resume', () => {
        console.log('App resuming from background');
        
        // Don't lock if on auth/onboarding routes
        const isAuthRoute = location.pathname.startsWith('/auth') || 
                           location.pathname.startsWith('/onboarding');
        
        if (user && !isAuthRoute) {
          const needsUnlock = isUnlockRequired(false);
          if (needsUnlock) {
            console.log('Redirecting to lock screen');
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
