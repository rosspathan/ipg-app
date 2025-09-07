import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSession } from './useAuthSession';
import { 
  getLocalSecurityData, 
  isPendingSync, 
  clearPendingSync, 
  clearLocalSecurity 
} from '@/utils/localSecurityStorage';

export const useSecuritySync = () => {
  const { userId, status } = useAuthSession();

  useEffect(() => {
    const syncLocalSecurity = async () => {
      if (status !== 'ready' || !userId || !isPendingSync()) return;

      try {
        // Check if security row already exists
        const { data: existingSecurity } = await supabase
          .from('security')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingSecurity) {
          // Security already exists, clear local data
          clearLocalSecurity();
          return;
        }

        const localData = getLocalSecurityData();
        if (!localData) return;

        // Sync to database
        const { error: securityError } = await supabase
          .from('security')
          .insert({
            user_id: userId,
            pin_hash: localData.pin_hash,
            pin_salt: localData.pin_salt,
            pin_set: true,
            biometric_enabled: localData.biometric_enabled,
            anti_phishing_code: localData.anti_phishing_code
          });

        if (securityError) {
          console.error('Failed to sync security to DB:', securityError);
          return;
        }

        // Create minimal users_app row if missing
        const { error: usersAppError } = await supabase
          .from('users_app')
          .upsert({
            user_id: userId,
            email: '', // Will be filled by profile creation
            created_at: new Date().toISOString()
          }, { 
            onConflict: 'user_id',
            ignoreDuplicates: true 
          });

        if (usersAppError) {
          console.warn('Failed to create users_app row:', usersAppError);
        }

        // Log sync event
        await supabase.from('login_audit').insert({
          user_id: userId,
          event: 'security_synced',
          device_info: { userAgent: navigator.userAgent }
        });

        // Clear local data on successful sync
        clearLocalSecurity();
        
        console.log('Security data synced to database');
      } catch (error) {
        console.error('Failed to sync local security:', error);
      }
    };

    syncLocalSecurity();
  }, [userId, status]);
};