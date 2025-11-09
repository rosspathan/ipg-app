import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setIsAdmin: (admin: boolean) => void;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  setIsAdmin: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authInitializing, setAuthInitializing] = useState(true);

  // ✅ Loading is only auth initialization - admin check runs silently
  const loading = authInitializing;

  // ✅ Removed - admin check now runs inline without blocking

  useEffect(() => {
    // Set up auth state listener - server-side validation only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // ✅ Set auth as ready immediately - don't block on admin check
          setAuthInitializing(false);
          
          // ✅ Check admin role silently in background (non-blocking)
          setTimeout(async () => {
            try {
              const { data } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user!.id)
                .eq('role', 'admin')
                .maybeSingle();
              setIsAdmin(!!data);
            } catch {
              setIsAdmin(false);
            }
          }, 0);
        } else {
          // Clear admin status on logout
          setIsAdmin(false);
          setAuthInitializing(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // ✅ Set auth as ready immediately
        setAuthInitializing(false);
        
        // ✅ Check admin role silently in background
        (async () => {
          try {
            const { data } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .eq('role', 'admin')
              .maybeSingle();
            setIsAdmin(!!data);
          } catch {
            setIsAdmin(false);
          }
        })();
      } else {
        setAuthInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    // Clear admin status
    setIsAdmin(false);
    await supabase.auth.signOut();
  };

  const setAdminStatus = (admin: boolean) => {
    setIsAdmin(admin);
  };

  const contextValue = {
    user,
    session,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
    setIsAdmin: setAdminStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}