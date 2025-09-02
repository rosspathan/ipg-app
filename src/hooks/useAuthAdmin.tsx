import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setIsAdmin: (admin: boolean) => void;
}

const defaultAdminAuthContext: AdminAuthContextType = {
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  setIsAdmin: () => {},
};

const AdminAuthContext = createContext<AdminAuthContextType>(defaultAdminAuthContext);

export function AuthProviderAdmin({ children }: { children: React.ReactNode }) {
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

    // Set up auth state listener for admin sessions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Admin auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check admin role for authenticated users (unless already web3 admin)
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
      console.log('Initial admin session check:', session?.user?.email);
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

  const contextValue = {
    user,
    session,
    isAdmin,
    loading,
    signIn,
    signOut,
    setIsAdmin: setAdminStatus,
  };

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAuthAdmin() {
  const context = useContext(AdminAuthContext);
  return context;
}