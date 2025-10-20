import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { hasLocalSecurity } from '@/utils/localSecurityStorage';
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
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[AppInitializer] Starting initialization...');
        
        // Check for active session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AppInitializer] Session check:', session ? 'Active' : 'None');
        
        if (!session) {
          console.log('[AppInitializer] No session - Stay on current page (landing/auth)');
          // Don't redirect, let user stay on landing/auth pages
          return;
        }

        const userId = session.user.id;
        console.log('[AppInitializer] User ID:', userId);

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
          navigate('/onboarding/wallet', { replace: true });
          return;
        }

        // Check if user has security setup (PIN or biometrics)
        const hasSecurity = hasLocalSecurity();
        console.log('[AppInitializer] Local security setup:', hasSecurity);

        if (!hasSecurity) {
          console.log('[AppInitializer] No security - redirect to security setup');
          navigate('/onboarding/security', { replace: true });
          return;
        }

        // Check if this is a fresh session (no unlock history)
        const lockState = localStorage.getItem('cryptoflow_lock_state');
        const hasUnlockHistory = lockState && JSON.parse(lockState).lastUnlockAt;
        
        if (!hasUnlockHistory) {
          console.log('[AppInitializer] Fresh session after onboarding - go to home');
          navigate('/app/home', { replace: true });
          return;
        }

        // Returning user with security - require unlock
        console.log('[AppInitializer] Returning user - redirect to lock screen');
        navigate('/auth/lock', { replace: true });
        
      } catch (error) {
        console.error('[AppInitializer] Initialization error:', error);
        // On error, don't redirect - let user stay on current page
      } finally {
        setIsChecking(false);
      }
    };

    initializeApp();
  }, [navigate]);

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
