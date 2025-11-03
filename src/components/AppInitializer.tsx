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
      console.log('[AppInitializer] Not a protected route, skipping checks');
      setIsChecking(false);
      return;
    }

    const initializeApp = async () => {
      try {
        // Skip if login is in progress
        if (sessionStorage.getItem('login_in_progress')) {
          console.log('[AppInitializer] Skipping - login in progress');
          setIsChecking(false);
          return;
        }

        console.log('[AppInitializer] Starting initialization...');
        
        // Verify session integrity before proceeding
        console.log('[AppInitializer] Checking session integrity');
        const sessionValid = await SessionIntegrityService.verifySessionIntegrity();
        if (!sessionValid) {
          console.warn('[AppInitializer] Session integrity check failed, redirecting to login');
          navigateSafely('/auth/login');
          setIsChecking(false);
          return;
        }

        // Check for active session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AppInitializer] Session check:', session ? 'Active' : 'None');
        
        if (!session) {
          console.log('[AppInitializer] No session - Stay on current page (landing/auth)');
          // Clear user IDs from storage systems
          setCurrentUserId(null);
          setSecurityUserId(null);
          return;
        }

        const userId = session.user.id;
        console.log('[AppInitializer] User ID:', userId);
        
        // Set user ID in storage systems
        setCurrentUserId(userId);
        setSecurityUserId(userId);
        
        // CRITICAL: Validate session ownership
        const validation = await validateSessionOwnership(session);
        
        if (validation.conflict) {
          console.error('[AppInitializer] ⚠️ Session ownership conflict detected!', validation.details);
          
          // Auto-resolve by clearing mismatched security data
          const resolved = await autoResolveIfSafe(session);
          
          if (resolved) {
            console.log('[AppInitializer] Conflict resolved - redirecting to security setup');
            navigateSafely('/onboarding/security');
            return;
          }
        }

        // Check if user has a wallet
        const { data: walletData, error: walletError } = await supabase
          .from('user_wallets')
          .select('wallet_address')
          .eq('user_id', userId)
          .maybeSingle();

        if (walletError) {
          console.error('[AppInitializer] Wallet check error:', walletError);
        }

        console.log('[AppInitializer] Wallet exists:', !!walletData);

        if (!walletData) {
          console.log('[AppInitializer] No wallet - redirect to wallet creation');
          navigateSafely('/onboarding/wallet');
          return;
        }

        // Check if user has security setup (PIN or biometrics)
        const hasSecurity = hasLocalSecurity();
        console.log('[AppInitializer] Local security setup:', hasSecurity);

        if (!hasSecurity) {
          console.log('[AppInitializer] No security - redirect to security setup');
          navigateSafely('/onboarding/security');
          return;
        }

        // Check if this is a fresh setup (just completed security onboarding)
        const isFreshSetup = localStorage.getItem('ipg_fresh_setup') === 'true';
        
        if (isFreshSetup) {
          console.log('[AppInitializer] Fresh setup - skip lock screen, go to home');
          localStorage.removeItem('ipg_fresh_setup'); // Clear flag after first use
          navigateSafely('/app/home');
          return;
        }

        // Check if session is still unlocked
        const lockStateKey = `cryptoflow_lock_state_${userId}`;
        let lockState = localStorage.getItem(lockStateKey);
        
        // Fallback to non-scoped key for backward compatibility
        if (!lockState) {
          lockState = localStorage.getItem('cryptoflow_lock_state');
        }
        
        let isUnlocked = false;
        try {
          if (lockState) {
            const parsed = JSON.parse(lockState);
            const sessionTimeout = (parsed.sessionLockMinutes || 30) * 60 * 1000;
            const timeSinceUnlock = Date.now() - (parsed.lastUnlockAt || 0);
            isUnlocked = parsed.isUnlocked && timeSinceUnlock < sessionTimeout;
          }
        } catch (e) {
          console.error('[AppInitializer] Error parsing lock state:', e);
        }
        
        if (isUnlocked) {
          console.log('[AppInitializer] Session still unlocked - go to home');
          navigateSafely('/app/home');
          return;
        }

        // Session expired - require unlock
        console.log('[AppInitializer] Session expired - redirect to lock screen');
        navigateSafely('/auth/lock');
        
      } catch (error) {
        console.error('[AppInitializer] Initialization error:', error);
        // On error, don't redirect - let user stay on current page
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
