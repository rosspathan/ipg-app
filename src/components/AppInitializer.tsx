import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { hasLocalSecurity } from '@/utils/localSecurityStorage';
import { validateSessionOwnership, autoResolveIfSafe } from '@/utils/sessionOwnershipValidator';
import { setCurrentUserId } from '@/utils/lockState';
import { setSecurityUserId } from '@/utils/localSecurityStorage';
import { SessionIntegrityService } from '@/services/SessionIntegrityService';
import { Loader2 } from 'lucide-react';

/**
 * AppInitializer - Determines where to route users on app launch
 * 
 * Flow for returning users (APK):
 * 1. Check if wallet exists (user_wallets table)
 * 2. Check if security is set up (PIN/biometric)
 * 3. If both exist -> /auth/lock (PIN/biometric screen)
 * 4. If wallet exists but no security -> /onboarding/security
 * 5. If no wallet -> /onboarding (create/import wallet)
 */
export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  // Helper to prevent navigation loops
  const navigateSafely = (path: string) => {
    if (location.pathname !== path) {
      navigate(path, { replace: true });
    }
  };

  useEffect(() => {
    // Only run initialization checks for protected /app/* routes
    const isProtectedRoute = location.pathname.startsWith('/app');
    
    if (!isProtectedRoute) {
      setIsChecking(false);
      return;
    }

    const initializeApp = async () => {
      try {
        // Skip if login is in progress
        if (sessionStorage.getItem('login_in_progress')) {
          setIsChecking(false);
          return;
        }
        
        // Check for active session (single call, no redundant checks)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setCurrentUserId(null);
          setSecurityUserId(null);
          setIsChecking(false);
          return;
        }

        const userId = session.user.id;
        setCurrentUserId(userId);
        setSecurityUserId(userId);
        
        // Streamlined validation - only check if conflict exists
        const validation = await validateSessionOwnership(session);
        if (validation.conflict) {
          await autoResolveIfSafe(session);
          navigateSafely('/onboarding/security');
          return;
        }

        // Parallel data fetching for better performance
        const [walletResult, hasSecurity] = await Promise.all([
          supabase.from('user_wallets').select('wallet_address').eq('user_id', userId).maybeSingle(),
          Promise.resolve(hasLocalSecurity())
        ]);

        if (!walletResult.data) {
          navigateSafely('/onboarding/wallet');
          return;
        }

        if (!hasSecurity) {
          navigateSafely('/onboarding/security');
          return;
        }

        // Fast fresh setup check
        if (localStorage.getItem('ipg_fresh_setup') === 'true') {
          localStorage.removeItem('ipg_fresh_setup');
          navigateSafely('/app/home');
          return;
        }

        // Optimized unlock check
        const lockState = localStorage.getItem(`cryptoflow_lock_state_${userId}`) || 
                         localStorage.getItem('cryptoflow_lock_state');
        
        if (lockState) {
          try {
            const parsed = JSON.parse(lockState);
            const timeout = (parsed.sessionLockMinutes || 30) * 60 * 1000;
            const isUnlocked = parsed.isUnlocked && (Date.now() - (parsed.lastUnlockAt || 0)) < timeout;
            
            navigateSafely(isUnlocked ? '/app/home' : '/auth/lock');
            return;
          } catch (e) {
            // Invalid lock state - require unlock
          }
        }

        navigateSafely('/auth/lock');
        
      } catch (error) {
        console.error('[AppInitializer] Error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    initializeApp();
  }, [location.pathname]);

  // Show loading screen while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-white" />
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
