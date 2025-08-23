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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
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
    }
  };

  useEffect(() => {
    // Check for Web3 admin status on load
    const web3AdminStatus = localStorage.getItem('cryptoflow_web3_admin');
    if (web3AdminStatus === 'true') {
      setIsAdmin(true);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Always check admin role for authenticated users (unless already web3 admin)
          const latestWeb3Admin = localStorage.getItem('cryptoflow_web3_admin');
          if (latestWeb3Admin !== 'true') {
            setTimeout(() => {
              checkAdminRole(session.user!.id);
            }, 0);
          }
        } else {
          // Clear admin status on logout
          localStorage.removeItem('cryptoflow_web3_admin');
          localStorage.removeItem('cryptoflow_admin_wallet');
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      const latestWeb3Admin = localStorage.getItem('cryptoflow_web3_admin');
      if (session?.user && latestWeb3Admin !== 'true') {
        setTimeout(() => {
          checkAdminRole(session.user!.id);
        }, 0);
      }
      
      setLoading(false);
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
    // Clear Web3 admin status
    localStorage.removeItem('cryptoflow_web3_admin');
    localStorage.removeItem('cryptoflow_admin_wallet');
    setIsAdmin(false);
    
    await supabase.auth.signOut();
  };

  const setAdminStatus = (admin: boolean) => {
    setIsAdmin(admin);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAdmin,
      loading,
      signIn,
      signUp,
      signOut,
      setIsAdmin: setAdminStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}