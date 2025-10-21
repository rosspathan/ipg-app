import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';
import { hasLocalSecurity } from '@/utils/localSecurityStorage';
import { hasPinConfigured as hasLegacyPin } from '@/utils/lockState';

interface UnlockGateProps {
  children: React.ReactNode;
}

export const UnlockGate = ({ children }: UnlockGateProps) => {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSecurity = async () => {
      if (!user) return;

      // Skip for auth, onboarding, and profile routes
      if (location.pathname.startsWith('/auth') || 
          location.pathname.startsWith('/onboarding') ||
          location.pathname.startsWith('/app/profile') ||
          location.pathname === '/recovery/verify') {
        return;
      }

      try {
        // Check both database and local security
        let hasPinConfigured = false;

        // Check database security if user is logged in
        if (user) {
          const { data: security } = await supabase
            .from('security')
            .select('pin_set')
            .eq('user_id', user.id)
            .maybeSingle();

          hasPinConfigured = security?.pin_set === true;
        }

        // Also check local security and legacy ipg_* storage
        if (!hasPinConfigured) {
          hasPinConfigured = hasLocalSecurity() || hasLegacyPin();
        }

        // If no PIN is configured, redirect to security setup
        if (!hasPinConfigured) {
          navigate('/onboarding/security', { 
            state: { from: location.pathname },
            replace: true 
          });
          return;
        }

        // Check if this is a fresh setup (skip lock requirement)
        const isFreshSetup = localStorage.getItem('ipg_fresh_setup') === 'true';
        if (isFreshSetup) {
          console.log('[UnlockGate] Fresh setup detected - allowing access');
          return;
        }

        // Check if we need to show lock screen using unified lock state
        const isUnlocked = (() => {
          try {
            const raw = localStorage.getItem('cryptoflow_lock_state');
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            
            // Check session timeout
            const sessionTimeout = (parsed.sessionLockMinutes || 30) * 60 * 1000;
            const timeSinceUnlock = Date.now() - (parsed.lastUnlockAt || 0);
            
            return parsed.isUnlocked === true && timeSinceUnlock < sessionTimeout;
          } catch {
            return false;
          }
        })();
        
        if (!isUnlocked) {
          navigate('/auth/lock', { 
            state: { from: location.pathname },
            replace: true 
          });
        }
      } catch (error) {
        console.error('Error checking security status:', error);
        // Fallback to local security check
        if (!hasLocalSecurity()) {
          navigate('/onboarding/security', { 
            state: { from: location.pathname },
            replace: true 
          });
        }
      }
    };

    checkSecurity();
  }, [user, navigate, location]);

  return <>{children}</>;
};