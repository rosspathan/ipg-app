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
  const [roleChecking, setRoleChecking] = useState(false);

  // Loading is true if either auth is initializing OR role is being checked
  const loading = authInitializing || roleChecking;

  const checkAdminRole = async (userId: string) => {
    setRoleChecking(true);
    try {
      console.log('Checking admin role for user:', userId);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (error) {
        console.error('Admin role check error:', error);
        setIsAdmin(false);
        return false;
      }
      
      const isUserAdmin = !!data;
      console.log('Admin role check result:', isUserAdmin);
      setIsAdmin(isUserAdmin);
      return isUserAdmin;
    } catch (error) {
      console.error('Admin role check failed:', error);
      setIsAdmin(false);
      return false;
    } finally {
      setRoleChecking(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener - server-side validation only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check admin role - loading won't be false until this completes
          setTimeout(() => {
            checkAdminRole(session.user!.id);
          }, 0);
        } else {
          // Clear admin status on logout
          setIsAdmin(false);
          setRoleChecking(false);
        }
        
        setAuthInitializing(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkAdminRole(session.user.id);
      }
      
      setAuthInitializing(false);
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