import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const defaultUserAuthContext: UserAuthContextType = {
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
};

const UserAuthContext = createContext<UserAuthContextType>(defaultUserAuthContext);

export function AuthProviderUser({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener for user sessions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('User auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle referral relationship creation after successful signup
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            handlePendingReferral(session.user.id);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial user session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
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
    const redirectUrl = `${window.location.origin}/app/home`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const handlePendingReferral = async (userId: string) => {
    try {
      const pendingReferral = localStorage.getItem('pending_referral');
      
      if (!pendingReferral) {
        return; // No referral to process
      }

      console.log('🔗 Processing pending referral:', pendingReferral, 'for user:', userId);

      // Check if referral relationship already exists
      const { data: existingRelationship } = await supabase
        .from('referral_relationships')
        .select('id')
        .eq('referee_id', userId)
        .maybeSingle();

      if (existingRelationship) {
        console.log('⚠️ Referral relationship already exists for this user');
        localStorage.removeItem('pending_referral');
        return;
      }

      // Validate that the referrer exists and is not the same as the new user
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', pendingReferral)
        .maybeSingle();

      if (!referrerProfile) {
        console.log('❌ Invalid referrer ID');
        localStorage.removeItem('pending_referral');
        return;
      }

      if (referrerProfile.user_id === userId) {
        console.log('❌ Cannot refer yourself');
        localStorage.removeItem('pending_referral');
        return;
      }

      // Create referral relationship
      const { data: newRelationship, error } = await supabase
        .from('referral_relationships')
        .insert({
          referrer_id: pendingReferral,
          referee_id: userId
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating referral relationship:', error);
        return;
      }

      console.log('✅ Referral relationship created successfully:', newRelationship);
      
      // Clear the pending referral
      localStorage.removeItem('pending_referral');

      // Optionally show a success toast
      // toast({ title: "Success", description: "Referral bonus will be credited soon!" });
    } catch (error) {
      console.error('❌ Error handling pending referral:', error);
    }
  };

  const signOut = async () => {
    // Clear user-specific localStorage items
    localStorage.removeItem("cryptoflow_pin");
    localStorage.removeItem("cryptoflow_biometric");
    localStorage.removeItem("cryptoflow_antiphishing");
    localStorage.removeItem("cryptoflow_setup_complete");
    localStorage.removeItem("pending_referral");
    
    await supabase.auth.signOut();
  };

  const contextValue = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <UserAuthContext.Provider value={contextValue}>
      {children}
    </UserAuthContext.Provider>
  );
}

export function useAuthUser() {
  const context = useContext(UserAuthContext);
  return context;
}