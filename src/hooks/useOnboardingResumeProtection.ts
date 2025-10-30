import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to detect and resume incomplete onboarding
 * If user has verified email + wallet but hasn't completed onboarding,
 * automatically navigate them to the success screen
 */
export function useOnboardingResumeProtection() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user?.id) return;
    
    // Don't run on onboarding pages to avoid loops
    if (location.pathname.startsWith('/onboarding')) return;
    if (location.pathname.startsWith('/auth')) return;

    const checkIncompleteOnboarding = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed_at, email_confirmed_at, wallet_address')
          .eq('user_id', user.id)
          .maybeSingle();

        // If email verified + wallet exists but onboarding not complete
        if (profile?.email_confirmed_at && 
            profile?.wallet_address && 
            !profile?.onboarding_completed_at) {
          
          console.log('[RESUME] Detected incomplete onboarding, navigating to success screen');
          navigate('/onboarding/success', { replace: true });
        }
      } catch (error) {
        console.error('[RESUME] Error checking onboarding status:', error);
      }
    };

    // Check on mount and on auth state change
    checkIncompleteOnboarding();
  }, [user?.id, navigate, location.pathname]);
}
