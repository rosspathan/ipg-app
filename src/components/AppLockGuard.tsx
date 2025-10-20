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
  const { isUnlockRequired, lockState } = useAuthLock();

  useEffect(() => {
    // Don't guard auth/lock screens or recovery
    if (location.pathname.startsWith('/auth/lock') || location.pathname.startsWith('/onboarding') || location.pathname === '/recovery/verify') {
      return;
    }

    // Only apply lock guard if user is authenticated
    if (!user) {
      return;
    }

    // Check if unlock is required
    if (isUnlockRequired()) {
      console.log('🔒 Lock required, redirecting to /auth/lock');
      navigate('/auth/lock', { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [location.pathname, navigate, user, isUnlockRequired]);

  useEffect(() => {
    if (!user) return;

    console.log('✅ SAFE_AREA_APPLIED (AppLockGuard)');

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🔒 App hidden, will check lock on return');
      } else {
        // App visible - check if should be locked
        if (isUnlockRequired()) {
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
