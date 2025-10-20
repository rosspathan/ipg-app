/* ═══════════════════════════════════════════════════════════
   APP LOCK GUARD - Unified with useAuthLock
   Route guard + visibility change handler for /app/* routes
   ═══════════════════════════════════════════════════════════ */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthLock } from '@/hooks/useAuthLock';
import { useAuthUser } from '@/hooks/useAuthUser';

interface AppLockGuardProps {
  children: React.ReactNode;
}

export function AppLockGuard({ children }: AppLockGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthUser();
  const { isUnlockRequired, lockState, updateActivity } = useAuthLock();

  useEffect(() => {
    // Don't guard auth/lock screens or recovery
    if (location.pathname.startsWith('/auth/lock') || location.pathname.startsWith('/onboarding') || location.pathname === '/recovery/verify') {
      return;
    }

    // Only apply lock guard if user is authenticated
    if (!user) {
      return;
    }

    // Check if lock is required (async)
    const checkLock = async () => {
      try {
        const lockRequired = await isUnlockRequired();
        
        if (lockRequired) {
          console.log('🔒 Session expired, redirecting to lock screen');
          // Save return path for post-unlock navigation
          localStorage.setItem('ipg_return_path', location.pathname);
          navigate('/auth/lock', { 
            state: { from: location.pathname },
            replace: true 
          });
        }
      } catch (error) {
        console.error('Failed to check lock state:', error);
      }
    };

    checkLock();
  }, [location.pathname, navigate, user, isUnlockRequired]);

  // Update activity on route changes to keep idle timer accurate
  useEffect(() => {
    if (user && lockState.isUnlocked) {
      updateActivity();
    }
  }, [location.pathname, user, lockState.isUnlocked, updateActivity]);

  useEffect(() => {
    if (!user) return;

    console.log('✅ SAFE_AREA_APPLIED (AppLockGuard)');

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('🔒 App hidden, will check lock on return');
      } else {
        // App visible - check session
        const lockRequired = await isUnlockRequired();
        if (lockRequired) {
          // Save return path for post-unlock navigation
          localStorage.setItem('ipg_return_path', location.pathname);
          navigate('/auth/lock', { 
            state: { from: location.pathname },
            replace: true 
          });
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate, location.pathname, user, isUnlockRequired]);

  return <>{children}</>;
}
