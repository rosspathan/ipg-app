import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setCurrentUserId } from '@/utils/lockState';
import { setSecurityUserId } from '@/utils/localSecurityStorage';
import { validateSessionOwnership, autoResolveIfSafe } from '@/utils/sessionOwnershipValidator';

interface AuthSessionState {
  session: Session | null;
  user: User | null;
  userId: string | null;
  status: 'loading' | 'ready';
}

export const useAuthSession = () => {
  const [state, setState] = useState<AuthSessionState>({
    session: null,
    user: null,
    userId: null,
    status: 'loading'
  });
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Get session FIRST
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted) {
        // Set user ID in storage systems
        const userId = session?.user?.id ?? null;
        setCurrentUserId(userId);
        setSecurityUserId(userId);
        
        // Validate session ownership
        if (session) {
          const validation = await validateSessionOwnership(session);
          
          if (validation.conflict) {
            console.warn('[useAuthSession] Session ownership conflict on init');
            // Auto-resolve by clearing mismatched data
            await autoResolveIfSafe(session);
            
            // Emit event for UI handling
            window.dispatchEvent(new CustomEvent('auth:session_conflict', {
              detail: validation.details
            }));
          }
        }
        
        setState({
          session,
          user: session?.user ?? null,
          userId,
          status: 'ready'
        });
        setInitialCheckDone(true);
      }
    });

    // THEN set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted && initialCheckDone) {
          // Update user ID in storage systems
          const userId = session?.user?.id ?? null;
          setCurrentUserId(userId);
          setSecurityUserId(userId);
          
          // Validate session ownership on auth changes
          if (session) {
            const validation = await validateSessionOwnership(session);
            
            if (validation.conflict) {
              console.warn('[useAuthSession] Session ownership conflict on auth change');
              await autoResolveIfSafe(session);
              
              window.dispatchEvent(new CustomEvent('auth:session_conflict', {
                detail: validation.details
              }));
            }
          }
          
          setState({
            session,
            user: session?.user ?? null,
            userId,
            status: 'ready'
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialCheckDone]);

  return state;
};