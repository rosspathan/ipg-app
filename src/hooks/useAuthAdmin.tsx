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
      // Server-side validation using security definer function
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });
      
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
    const resolveSession = async (session: Session | null) => {
      console.log('Admin auth state change:', session ? 'SIGNED_IN' : 'SIGNED_OUT', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Always validate admin status server-side
        await checkAdminRole(session.user.id);
      } else {
        // Clear admin status on logout
        setIsAdmin(false);
      }

      setLoading(false);
    };

    // Set up auth state listener for admin sessions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // enter loading while we validate role
        setLoading(true);
        resolveSession(session);
      }
    );

    // Check for existing session
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Initial admin session check:', session?.user?.email);
      await resolveSession(session);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data?.user) {
      supabase.functions.invoke('log-login', {
        body: { user_id: data.user.id, email, user_agent: navigator.userAgent, referer: window.location.href }
      }).catch(() => {});
    }
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
