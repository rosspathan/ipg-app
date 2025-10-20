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
        console.log('[AppInitializer] Checking app state...');
        
        // Add small delay to ensure storage is ready in native apps
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check for active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AppInitializer] Session error:', sessionError);
        }
        
        console.log('[AppInitializer] Session check result:', session ? 'Session found' : 'No session');
        
        if (session?.user) {
          console.log('[AppInitializer] User session found:', session.user.id);
          
          // Check if user has a wallet
          const { data: wallets, error } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1);
          
          if (error) {
            console.error('[AppInitializer] Error checking wallets:', error);
            // Continue to onboarding on error
            navigate('/onboarding', { replace: true });
            return;
          }
          
          const hasWallet = wallets && wallets.length > 0;
          console.log('[AppInitializer] User has wallet:', hasWallet);
          
          if (hasWallet) {
            // User has wallet - check if security is set up
            const hasSecurity = hasLocalSecurity();
            console.log('[AppInitializer] Security set up:', hasSecurity);
            
            if (hasSecurity) {
              // Check if this is a returning user (has unlock history)
              const lockState = localStorage.getItem('cryptoflow_lock_state');
              const hasUnlockHistory = lockState && JSON.parse(lockState).lastUnlockAt;
              
              if (hasUnlockHistory) {
                // Returning user from previous session -> lock screen
                console.log('[AppInitializer] Returning user, redirecting to lock screen');
                navigate('/auth/lock', { replace: true });
              } else {
                // Fresh session after onboarding -> go to home
                console.log('[AppInitializer] Fresh session, redirecting to home');
                navigate('/app/home', { replace: true });
              }
            } else {
              // Has wallet but no security -> complete security setup
              console.log('[AppInitializer] Redirecting to security setup');
              navigate('/onboarding/security', { replace: true });
            }
          } else {
            // User session exists but no wallet -> go to onboarding
            console.log('[AppInitializer] No wallet found, redirecting to onboarding');
            navigate('/onboarding', { replace: true });
          }
        } else {
          // No session - new user
          console.log('[AppInitializer] No session found, redirecting to onboarding');
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        console.error('[AppInitializer] Initialization error:', error);
        // On error, default to onboarding
        navigate('/onboarding', { replace: true });
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
