import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setState({
          session,
          user: session?.user ?? null,
          userId: session?.user?.id ?? null,
          status: 'ready'
        });
        setInitialCheckDone(true);
      }
    });

    // THEN set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted && initialCheckDone) {
          setState({
            session,
            user: session?.user ?? null,
            userId: session?.user?.id ?? null,
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