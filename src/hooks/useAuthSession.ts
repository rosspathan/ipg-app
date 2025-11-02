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

  useEffect(() => {
    let mounted = true;
    let isInitialized = false;
    
    // Set up auth state listener FIRST - FULLY SYNCHRONOUS to prevent deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log('[useAuthSession] Auth event:', event, session?.user?.email);
        
        // Handle sign out or invalid session
        if (event === 'SIGNED_OUT' || !session) {
          console.log('[useAuthSession] User signed out or session invalid');
          setCurrentUserId(null);
          setSecurityUserId(null);
          
          setState({
            session: null,
            user: null,
            userId: null,
            status: 'ready'
          });
          return;
        }

        // Update user ID in storage systems (synchronous)
        const userId = session?.user?.id ?? null;
        setCurrentUserId(userId);
        setSecurityUserId(userId);
        
        // Update state immediately (synchronous)
        setState({
          session,
          user: session?.user ?? null,
          userId,
          status: 'ready'
        });
        
        // Defer session validation to prevent blocking the auth callback
        const loginInProgress = sessionStorage.getItem('login_in_progress');
        
        if (event === 'SIGNED_IN' && session && !loginInProgress && isInitialized) {
          setTimeout(async () => {
            try {
              const validation = await validateSessionOwnership(session);
              
              if (validation.conflict) {
                console.warn('[useAuthSession] Session ownership conflict - clearing old data');
                await autoResolveIfSafe(session);
                
                window.dispatchEvent(new CustomEvent('auth:session_conflict', {
                  detail: validation.details
                }));
              }
            } catch (error) {
              console.error('[useAuthSession] Validation error:', error);
            }
          }, 0);
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      const userId = session?.user?.id ?? null;
      setCurrentUserId(userId);
      setSecurityUserId(userId);
      
      setState({
        session,
        user: session?.user ?? null,
        userId,
        status: 'ready'
      });
      
      isInitialized = true;
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
};