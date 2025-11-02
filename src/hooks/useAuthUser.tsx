import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearUserScopedData } from '@/utils/lockState';
import { clearUserSecurityData } from '@/utils/localSecurityStorage';

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
    // Set up auth state listener for user sessions - FULLY SYNCHRONOUS
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('User auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Defer all async operations to prevent blocking auth callback
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            try {
              // Import dynamically to avoid circular deps
              const { captureReferralAfterEmailVerify } = await import('@/utils/referralCapture');
              await captureReferralAfterEmailVerify(session.user.id);
              // Legacy system (keep for backward compatibility)
              handlePendingReferral(session.user.id);
            } catch (error) {
              console.error('[useAuthUser] Referral handling error:', error);
            }
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
    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store credentials temporarily for later user creation (after OTP verification)
    sessionStorage.setItem('verificationEmail', email);
    sessionStorage.setItem('verificationPassword', password);
    sessionStorage.setItem('verificationCode', verificationCode);
    
    // Send custom branded email with verification code
    const { error } = await supabase.functions.invoke('send-verification-email', {
      body: {
        email: email.trim(),
        verificationCode: verificationCode,
        userName: email.split('@')[0],
        isOnboarding: true
      }
    });
    
    if (!error) {
      console.log('✅ Verification email sent to:', email);
    }
    
    return { error };
  };

  const handlePendingReferral = async (userId: string) => {
    try {
      const pendingReferral = localStorage.getItem('pending_referral');
      
      if (!pendingReferral) {
        return; // No referral to process
      }

      console.log('🔗 Processing pending referral:', pendingReferral, 'for user:', userId);

      // Check if referral link already exists
      const { data: existingLink } = await supabase
        .from('referral_links_new')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingLink) {
        console.log('⚠️ Referral link already exists for this user');
        localStorage.removeItem('pending_referral');
        return;
      }

      // Validate that the referrer exists and is not the same as the new user
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('user_id, referral_code')
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

      // Create referral link using referral_links_new table
      const { data: newLink, error } = await supabase
        .from('referral_links_new')
        .insert({
          user_id: userId,
          sponsor_id: pendingReferral,
          sponsor_code_used: referrerProfile.referral_code,
          locked_at: new Date().toISOString(),
          first_touch_at: new Date().toISOString(),
          source: 'app_referral'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating referral link:', error);
        return;
      }

      console.log('✅ Referral link created successfully:', newLink);
      
      // Clear the pending referral
      localStorage.removeItem('pending_referral');

      // Optionally show a success toast
      // toast({ title: "Success", description: "Referral bonus will be credited soon!" });
    } catch (error) {
      console.error('❌ Error handling pending referral:', error);
    }
  };

  const signOut = async () => {
    // Clear user-scoped security data
    if (user?.id) {
      clearUserScopedData(user.id);
      clearUserSecurityData(user.id);
    }
    
    // Clear legacy user-specific localStorage items
    localStorage.removeItem("cryptoflow_pin");
    localStorage.removeItem("cryptoflow_biometric");
    localStorage.removeItem("cryptoflow_antiphishing");
    localStorage.removeItem("cryptoflow_setup_complete");
    localStorage.removeItem("pending_referral");
    localStorage.removeItem("ipg_return_path");
    localStorage.removeItem("ipg_fresh_setup");
    
    // Clear non-user-scoped lock state
    localStorage.removeItem("cryptoflow_lock_state");
    localStorage.removeItem("cryptoflow_unlocked");
    
    console.log('[Auth] Cleared all user data for sign out');
    
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