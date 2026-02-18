import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearUserScopedData } from '@/utils/lockState';
import { clearUserSecurityData } from '@/utils/localSecurityStorage';
import { useQueryClient } from '@tanstack/react-query';
import { SessionIntegrityService } from '@/services/SessionIntegrityService';
import { clearLegacyLocalStorage } from '@/utils/clearLegacyStorage';

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
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Set up auth state listener for user sessions - FULLY SYNCHRONOUS
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH_USER] Auth state change:', event, {
          userId: session?.user?.id,
          email: session?.user?.email,
          previousUserId: prevUserIdRef.current
        });

        const currentUserId = session?.user?.id ?? null;
        const previousUserId = prevUserIdRef.current;

        // Detect user switch (different user logged in)
        if (currentUserId && previousUserId && currentUserId !== previousUserId) {
          console.warn('[AUTH_USER] ⚠️ USER SWITCH DETECTED', {
            from: previousUserId,
            to: currentUserId
          });

          // Clear all React Query caches to prevent data leakage
          console.log('[AUTH_USER] Clearing all cached data from previous user');
          queryClient.clear();

          // Dispatch event for observability
          window.dispatchEvent(new CustomEvent('auth:user_switched', {
            detail: { from: previousUserId, to: currentUserId }
          }));
        }

        // Update state
        setSession(session);
        setUser(session?.user ?? null);
        prevUserIdRef.current = currentUserId;
        setLoading(false);
        
        // Defer all async operations to prevent blocking auth callback
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            try {
              console.log('[AUTH_USER] User signed in, setting user IDs:', session.user.id);
              
              // Update session integrity tracking
              SessionIntegrityService.setLastKnownUser(session.user.id);
              
              // Clear legacy non-scoped keys once on sign in
              clearLegacyLocalStorage();

              // Import dynamically to avoid circular deps
              const { captureReferralAfterSignup } = await import('@/utils/referralCapture');
              await captureReferralAfterSignup(session.user.id);
              // Legacy system (keep for backward compatibility)
              handlePendingReferral(session.user.id);
            } catch (error) {
              console.error('[AUTH_USER] Post-signin handling error:', error);
            }
          }, 0);
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('[AUTH_USER] User signed out, clearing tracking');
          SessionIntegrityService.clearLastKnownUser();
          prevUserIdRef.current = null;
          
          // Clear all cached data
          queryClient.clear();
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
    console.log('[AUTH_USER] Starting sign out');
    
    // Clear session integrity tracking
    SessionIntegrityService.clearLastKnownUser();
    
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
    
    // Clear legacy storage
    clearLegacyLocalStorage();
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear all React Query caches
    queryClient.clear();
    
    console.log('[AUTH_USER] Cleared all user data for sign out');
    
    await supabase.auth.signOut();
    console.log('[AUTH_USER] Successfully signed out');
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