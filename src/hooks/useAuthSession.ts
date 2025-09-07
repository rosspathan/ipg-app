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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState({
          session,
          user: session?.user ?? null,
          userId: session?.user?.id ?? null,
          status: 'ready'
        });
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        session,
        user: session?.user ?? null,
        userId: session?.user?.id ?? null,
        status: 'ready'
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
};