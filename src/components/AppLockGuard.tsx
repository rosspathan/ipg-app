/* ═══════════════════════════════════════════════════════════
   APP LOCK GUARD - Module B
   Route guard + visibility change handler for /app/* routes
   ═══════════════════════════════════════════════════════════ */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getLockState, lockApp, shouldLock, updateLastActivity, hasPinConfigured } from '@/utils/lockState';

interface AppLockGuardProps {
  children: React.ReactNode;
}

export function AppLockGuard({ children }: AppLockGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't guard lock screens themselves
    if (location.pathname.startsWith('/lock')) {
      return;
    }

    // Check if PIN is configured
    if (!hasPinConfigured()) {
      navigate('/lock/setup-pin', { replace: true });
      return;
    }

    // Check lock status
    if (shouldLock()) {
      lockApp();
      navigate('/lock', { replace: true });
      return;
    }

    // Update activity on navigation
    updateLastActivity();
  }, [location.pathname, navigate]);

  useEffect(() => {
    console.log('✅ SAFE_AREA_APPLIED (AppLockGuard)');

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App hidden - lock it
        lockApp();
        console.log('🔒 App hidden, locked');
      } else {
        // App visible - check if should be locked
        if (shouldLock()) {
          lockApp();
          navigate('/lock', { replace: true });
        } else {
          updateLastActivity();
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for activity events to update last active
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      const { state } = getLockState();
      if (state === 'unlocked') {
        updateLastActivity();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [navigate]);

  return <>{children}</>;
}
